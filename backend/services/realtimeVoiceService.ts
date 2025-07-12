import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";
import { callRecordingService } from "./callRecordingService.js";
import {
  generateBuyerPrompt,
  generateBuyerTestPrompt,
} from "./prompts/buyerPrompt.js";
import { generateSellerPrompt } from "./prompts/sellerPrompt.js";
import { LeadRow } from "../models/Lead.js";
import { calculateLeadScores } from "./leadScoringService.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface VoiceCallOptions {
  callId: string;
  leadId: number;
  leadName?: string;
  leadPhone?: string;
  userSettings?: any;
  streamSid?: string;
  initialStreamData?: any;
  callMode?: string; // Add call mode parameter
}

interface CallTranscript {
  callId: string;
  transcript: string;
  timestamp: string;
}

export class RealtimeVoiceService {
  private activeTranscripts: Map<string, string> = new Map();

  /**
   * Handle a WebSocket connection from Twilio using OpenAI Realtime API
   */
  async handleWebSocketConnection(twilioWs: any, options: VoiceCallOptions) {
    try {
      console.log(
        `Starting Realtime voice call for lead ${options.leadId} with mode: ${
          options.callMode || "ai"
        }`
      );

      // Fetch lead data including context from database
      let leadData: LeadRow | null = null;
      try {
        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", options.leadId)
          .single();

        if (leadError) {
          console.error(`❌ Error fetching lead ${options.leadId}:`, leadError);
        } else {
          leadData = lead;
          console.log(`📋 Fetched lead data for ${lead.name}:`, {
            name: lead.name,
            phone: lead.phone_number,
            email: lead.email,
            hasContext: !!lead.context,
            contextLength: lead.context?.length || 0,
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching lead data:`, error);
      }

      // Create WebSocket connection to OpenAI Realtime API
      const openaiWs = new WebSocket(
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "OpenAI-Beta": "realtime=v1",
          },
        }
      );

      // Connection state
      let streamSid: string | null = options.streamSid || null;
      let callSid: string | null = null; // Store Twilio call SID for ending call
      let latestMediaTimestamp = 0;
      let lastAssistantItem: string | null = null;
      let markQueue: string[] = [];
      let responseStartTimestamp: number | null = null;
      let userHasSpoken = false; // Track if user has started speaking

      // Buffer for initial audio packets while OpenAI is setting up
      let audioBuffer: Array<{ timestamp: number; payload: string }> = [];
      let isOpenAIReady = false;
      const maxBufferSize = 100; // Increase buffer to 100 packets (~2 seconds)
      const maxBufferTimeMs = 3000; // Max 3 seconds of buffering
      let firstAudioTimestamp: number | null = null;
      let openaiReadyDelay = false; // Track if we need to wait after OpenAI becomes ready

      console.log(
        `🚀 STREAM STARTED: Using stream ID ${streamSid} from options`
      );
      if (options.initialStreamData) {
        callSid = options.initialStreamData.callSid; // Capture call SID from initial data
        console.log(
          `🆔 CALL SID: Captured ${callSid} from initial stream data`
        );
        console.log(
          `📋 STREAM DETAILS:`,
          JSON.stringify(options.initialStreamData, null, 2)
        );
      }

      // Configure OpenAI session when connected
      openaiWs.on("open", () => {
        console.log("🔗 OpenAI Realtime WebSocket connected");
        console.log("🔧 Configuring OpenAI session...");

        // Send session configuration immediately - no delay to minimize audio loss
        // Determine which prompt to use based on lead type
        let promptInstructions = "";
        if (leadData) {
          const leadType = leadData.lead_type?.toLowerCase();

          if (leadType === "buyer") {
            promptInstructions = generateBuyerTestPrompt(leadData);
            console.log(`🏠 Using BUYER prompt for lead ${leadData.name}`);
          } else if (leadType === "seller") {
            promptInstructions = generateSellerPrompt(leadData);
            console.log(`🏡 Using SELLER prompt for lead ${leadData.name}`);
          } else {
            // Default to seller prompt if lead type is unclear
            promptInstructions = generateSellerPrompt(leadData);
            console.log(
              `🏡 Using SELLER prompt (default) for lead ${leadData.name} with type: ${leadType}`
            );
          }
        } else {
          // Fallback if no lead data available
          promptInstructions = generateSellerPrompt(null);
          console.log(
            `⚠️ Using SELLER prompt (fallback) - no lead data available`
          );
        }

        // Add instructions based on call mode
        const callMode = options.callMode || "ai";
        // No special voicemail handling - all calls are live conversations

        // Send session configuration - Pure Speech-to-Speech approach
        const sessionUpdate = {
          type: "session.update",
          session: {
            turn_detection: {
              type: "server_vad",
              threshold: 0.35, // Slightly more sensitive for better detection
              prefix_padding_ms: 200, // Increase padding to capture more speech start
              silence_duration_ms: 700, // Slightly shorter to be more responsive
            },
            input_audio_format: "g711_ulaw",
            output_audio_format: "g711_ulaw",
            input_audio_transcription: {
              model: "whisper-1",
            },
            voice: "alloy", // Nova is brighter and more conversational than alloy
            model: "gpt-4o-realtime-preview",
            instructions: promptInstructions,
            modalities: ["text", "audio"],
            temperature: 0.9, // Higher temperature for more natural, varied responses
          },
        };

        console.log("📤 Sending session configuration to OpenAI");
        console.log("🎙️ VAD Settings:", {
          threshold: 0.4,
          prefix_padding_ms: 150,
          silence_duration_ms: 800,
        });
        if (leadData?.context) {
          console.log(
            `🎯 Including lead context in AI prompt: ${leadData.context.substring(
              0,
              100
            )}...`
          );
        }
        openaiWs.send(JSON.stringify(sessionUpdate));
      });

      // Handle messages from Twilio
      const handleTwilioMessage = async (message: string) => {
        try {
          const data = JSON.parse(message);

          if (
            data.event === "media" &&
            openaiWs.readyState === WebSocket.OPEN
          ) {
            // Process audio and log first few packets for debugging
            latestMediaTimestamp = parseInt(data.media.timestamp);

            // Log first few audio packets for debugging
            if (latestMediaTimestamp < 4000) {
              console.log(
                `🎵 Audio packet received: timestamp ${latestMediaTimestamp}, payload length: ${
                  data.media.payload?.length || 0
                }, OpenAI ready: ${isOpenAIReady}`
              );
            }

            if (isOpenAIReady) {
              // OpenAI is ready, send audio directly
              const audioAppend = {
                type: "input_audio_buffer.append",
                audio: data.media.payload,
              };
              openaiWs.send(JSON.stringify(audioAppend));
            } else {
              // OpenAI not ready yet, buffer the audio
              if (firstAudioTimestamp === null) {
                firstAudioTimestamp = latestMediaTimestamp;
              }

              // Check if we've been buffering too long
              const bufferDuration = latestMediaTimestamp - firstAudioTimestamp;
              if (bufferDuration > maxBufferTimeMs) {
                console.log(
                  `⚠️ OpenAI taking too long (${bufferDuration}ms), marking as ready and processing audio directly`
                );
                isOpenAIReady = true;

                // Process this packet and future ones directly
                const audioAppend = {
                  type: "input_audio_buffer.append",
                  audio: data.media.payload,
                };
                openaiWs.send(JSON.stringify(audioAppend));
              } else {
                // Buffer the audio packet
                audioBuffer.push({
                  timestamp: latestMediaTimestamp,
                  payload: data.media.payload,
                });

                // Prevent buffer overflow
                if (audioBuffer.length > maxBufferSize) {
                  audioBuffer.shift(); // Remove oldest packet
                }

                if (audioBuffer.length <= 10) {
                  console.log(
                    `📦 Buffering audio packet #${audioBuffer.length}, waiting for OpenAI...`
                  );
                }
              }
            }
          } else if (data.event === "start") {
            if (!streamSid) {
              streamSid = data.start.streamSid;
              callSid = data.start.callSid; // Capture the call SID
              console.log(
                `🚀 STREAM STARTED: Twilio stream ${streamSid} (fallback)`
              );
              console.log(`🆔 CALL SID: Captured ${callSid} from start event`);
              console.log(
                `📋 STREAM DETAILS:`,
                JSON.stringify(data.start, null, 2)
              );
            } else {
              console.log(
                `🔄 STREAM UPDATE: Received start event for existing stream ${streamSid}`
              );
            }
            responseStartTimestamp = null;
            latestMediaTimestamp = 0;
            lastAssistantItem = null;
          } else if (data.event === "mark") {
            // Mark received silently - removed verbose logs
            if (markQueue.length > 0) {
              markQueue.shift();
            }
          } else if (data.event !== "media") {
            // Log non-media events (start, stop, mark, etc.) but not media packets
            console.log(
              `📨 TWILIO EVENT: ${data.event}`,
              JSON.stringify(data, null, 2)
            );
          }
        } catch (error) {
          console.error("❌ Error processing Twilio message:", error);
        }
      };

      // Handle messages from OpenAI
      openaiWs.on("message", async (message: Buffer) => {
        try {
          const response = JSON.parse(message.toString());

          if (response.type === "response.audio.delta" && response.delta) {
            // Forward audio to Twilio - response.delta is already base64 encoded
            const audioDelta = {
              event: "media",
              streamSid: streamSid,
              media: {
                payload: response.delta,
              },
            };

            if (twilioWs.readyState === WebSocket.OPEN) {
              twilioWs.send(JSON.stringify(audioDelta));
              // Audio sent silently - removed verbose logs
            } else {
              console.log(
                `❌ AUDIO FAILED: Twilio WebSocket not open (state: ${twilioWs.readyState})`
              );
            }

            if (responseStartTimestamp === null) {
              responseStartTimestamp = latestMediaTimestamp;
              console.log(
                `⏰ RESPONSE START: Audio response started at timestamp ${responseStartTimestamp}`
              );
            }

            if (response.item_id) {
              lastAssistantItem = response.item_id;
            }

            // Send mark to track message delivery (silently)
            await this.sendMark(twilioWs, streamSid);
          }

          // Handle interruptions
          if (response.type === "input_audio_buffer.speech_started") {
            console.log(
              "🗣️ SPEECH DETECTED: User started speaking, preparing to interrupt AI"
            );
            if (lastAssistantItem) {
              console.log(
                `⚡ INTERRUPTING: Stopping AI response with id: ${lastAssistantItem}`
              );
              await this.handleInterruption(
                openaiWs,
                twilioWs,
                streamSid,
                lastAssistantItem,
                latestMediaTimestamp,
                responseStartTimestamp,
                markQueue
              );
              markQueue = [];
              lastAssistantItem = null;
              responseStartTimestamp = null;
            }
          }

          // Log other important OpenAI events
          if (response.type === "session.created") {
            console.log("🔗 OpenAI session created:", response.session.id);
          } else if (response.type === "session.updated") {
            console.log("🔧 OpenAI session updated successfully");

            // Mark OpenAI as ready and replay buffered audio
            if (!isOpenAIReady) {
              console.log(
                `🎬 OpenAI ready! Replaying ${audioBuffer.length} buffered audio packets...`
              );

              // Replay all buffered audio packets
              for (const bufferedAudio of audioBuffer) {
                const audioAppend = {
                  type: "input_audio_buffer.append",
                  audio: bufferedAudio.payload,
                };
                openaiWs.send(JSON.stringify(audioAppend));
              }

              if (audioBuffer.length > 0) {
                console.log(
                  `✅ Replayed ${audioBuffer.length} audio packets from buffer`
                );
              }

              // Clear the buffer
              audioBuffer = [];

              // Add a small delay before marking as ready to ensure OpenAI is fully processing
              setTimeout(() => {
                isOpenAIReady = true;
                console.log("🎯 OpenAI fully ready for speech processing");
              }, 100); // 100ms delay
            }

            // Check if this is an inbound call and send proactive greeting only for inbound calls
            const isInbound =
              options.initialStreamData?.customParameters?.isOutbound ===
              "false";

            if (isInbound) {
              console.log("👋 Sending proactive greeting for inbound call");
              this.sendProactiveGreeting(openaiWs, leadData);
            } else {
              console.log(
                "🎯 Outbound call - waiting for AI to follow prompt instructions"
              );
            }
          } else if (response.type === "response.created") {
            console.log("🎯 AI response created:", response.response.id);
          } else if (response.type === "response.done") {
            console.log("✅ AI response completed:", response.response.id);
          } else if (response.type === "conversation.item.created") {
            console.log("💬 Conversation item created:", response.item.type);
            if (response.item && response.item.content) {
              console.log(
                "📝 Item content:",
                JSON.stringify(response.item.content, null, 2)
              );
            }
          } else if (
            response.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            console.log("🎯 Customer said:", response.transcript);
            this.appendToTranscript(
              options.callId,
              `Customer: ${response.transcript}`
            );
            // Save transcript after each customer message
            await this.saveTranscriptToDatabase(options.callId);
          } else if (response.type === "response.content_part.done") {
            // Only handle audio content parts for voicemail termination
            if (
              response.part &&
              response.part.type === "audio" &&
              response.part.transcript
            ) {
              console.log("🤖 AI said:", response.part.transcript);
              this.appendToTranscript(
                options.callId,
                `AI: ${response.part.transcript}`
              );
              // Save transcript after each AI response
              await this.saveTranscriptToDatabase(options.callId);

              // Transcript saved for all call types
            }
          } else if (response.type === "input_audio_buffer.speech_started") {
            console.log("🎙️ USER SPEECH START: User began speaking");
            if (!userHasSpoken) {
              userHasSpoken = true;
              console.log(
                "👋 FIRST USER SPEECH: User has started conversation"
              );
            }
          } else if (response.type === "input_audio_buffer.speech_stopped") {
            console.log("🛑 USER SPEECH STOP: User stopped speaking");
          } else if (response.type && !response.type.includes("audio")) {
            console.log(
              `🔄 OpenAI EVENT: ${response.type}`,
              JSON.stringify(response, null, 2)
            );
          }
        } catch (error) {
          console.error("❌ Error processing OpenAI message:", error);
        }
      });

      // Set up Twilio message handler
      twilioWs.on("message", handleTwilioMessage);

      // Handle disconnections
      twilioWs.on("close", async () => {
        console.log("🔌 Twilio WebSocket closed");

        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }

        // Update call record as completed
        await this.updateCallStatus(options.callId, "completed");

        // Finalize transcript and process recording
        await this.finalizeCallTranscript(options.callId);
      });

      // Handle WebSocket errors
      twilioWs.on("error", async (error: any) => {
        console.error("🔌 Twilio WebSocket error:", error);

        // Still save transcript even on error
        await this.saveTranscriptToDatabase(options.callId);

        // Update call status to failed
        await this.updateCallStatus(options.callId, "failed");
      });

      openaiWs.on("close", () => {
        console.log("🔌 OpenAI WebSocket closed");
      });

      openaiWs.on("error", async (error) => {
        console.error("❌ OpenAI WebSocket error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          stack: error.stack,
        });

        // Save transcript even on OpenAI error
        await this.saveTranscriptToDatabase(options.callId);

        // Update call status to failed
        await this.updateCallStatus(options.callId, "failed");
      });

      console.log(`Realtime voice call connected for call ${options.callId}`);
    } catch (error) {
      console.error("Error in Realtime voice call:", error);
      throw error;
    }
  }

  /**
   * Send a mark event to Twilio
   */
  private async sendMark(twilioWs: any, streamSid: string | null) {
    if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
      const markEvent = {
        event: "mark",
        streamSid: streamSid,
        mark: { name: "responsePart" },
      };
      twilioWs.send(JSON.stringify(markEvent));
      // Mark sent silently - removed verbose logs
    } else {
      // Mark failed silently - removed verbose logs
    }
  }

  /**
   * Handle interruption when user starts speaking
   */
  private async handleInterruption(
    openaiWs: WebSocket,
    twilioWs: any,
    streamSid: string | null,
    lastAssistantItem: string,
    latestMediaTimestamp: number,
    responseStartTimestamp: number | null,
    markQueue: string[]
  ) {
    if (markQueue.length > 0 && responseStartTimestamp !== null) {
      const elapsedTime = latestMediaTimestamp - responseStartTimestamp;

      // Truncate the AI response
      const truncateEvent = {
        type: "conversation.item.truncate",
        item_id: lastAssistantItem,
        content_index: 0,
        audio_end_ms: elapsedTime,
      };

      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(JSON.stringify(truncateEvent));
      }

      // Clear Twilio audio buffer
      if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
        const clearEvent = {
          event: "clear",
          streamSid: streamSid,
        };
        twilioWs.send(JSON.stringify(clearEvent));
      }
    }
  }

  /**
   * Update call status in database
   */
  private async updateCallStatus(callId: string, status: string) {
    try {
      if (callId === "unknown") return;

      // Get call data first to extract lead_id
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("lead_id")
        .eq("id", callId)
        .single();

      const { error } = await supabase
        .from("calls")
        .update({
          status: status,
          ended_at: new Date().toISOString(),
        })
        .eq("id", callId);

      if (error) {
        console.error("Error updating call status:", error);
      } else {
        console.log(`Updated call ${callId} status to ${status}`);

        // Update lead scores and status after call completion/failure
        if (call?.lead_id && (status === "completed" || status === "failed")) {
          try {
            await calculateLeadScores(call.lead_id);
            console.log(
              `✅ Updated lead scores for lead ${call.lead_id} after call ${status}`
            );

            // Update lead status based on all communication attempts
            const { updateLeadStatusBasedOnCommunications } = await import(
              "./leadService.ts"
            );
            await updateLeadStatusBasedOnCommunications(call.lead_id);
            console.log(
              `✅ Updated lead status for lead ${call.lead_id} after call ${status}`
            );
          } catch (scoringError) {
            console.error(
              `❌ Error updating lead scores/status for lead ${call.lead_id}:`,
              scoringError
            );
            // Don't throw to prevent disrupting the call flow
          }
        }
      }
    } catch (error) {
      console.error("Error updating call status:", error);
    }
  }

  /**
   * Append text to the active transcript for a call
   */
  private appendToTranscript(callId: string, text: string): void {
    const currentTranscript = this.activeTranscripts.get(callId) || "";
    const timestamp = new Date().toLocaleTimeString();
    const newLine = `[${timestamp}] ${text}\n`;
    this.activeTranscripts.set(callId, currentTranscript + newLine);

    console.log(`📝 Transcript updated for call ${callId}: ${text}`);
  }

  /**
   * Save current transcript to database (for real-time updates)
   */
  private async saveTranscriptToDatabase(callId: string): Promise<void> {
    try {
      const transcript = this.activeTranscripts.get(callId);
      if (!transcript) {
        return;
      }

      // Update or insert transcript in call_recordings table
      const { data: existingRecording } = await supabase
        .from("call_recordings")
        .select("id")
        .eq("call_id", parseInt(callId))
        .single();

      if (existingRecording) {
        // Update existing record
        await supabase
          .from("call_recordings")
          .update({
            transcription: transcript,
            updated_at: new Date().toISOString(),
          })
          .eq("call_id", parseInt(callId));
      } else {
        // Insert new record
        await supabase.from("call_recordings").insert({
          call_id: parseInt(callId),
          transcription: transcript,
          created_at: new Date().toISOString(),
        });
      }

      console.log(`💾 Transcript saved to database for call ${callId}`);
    } catch (error) {
      console.error(`❌ Error saving transcript for call ${callId}:`, error);
    }
  }

  /**
   * Get the current transcript for a call
   */
  public getTranscript(callId: string): string {
    return this.activeTranscripts.get(callId) || "";
  }

  /**
   * Finalize transcript and trigger recording processing
   */
  public async finalizeCallTranscript(callId: string): Promise<void> {
    try {
      const transcript = this.activeTranscripts.get(callId);
      if (!transcript) {
        console.log(`No transcript found for call ${callId}`);
        return;
      }

      console.log(`🏁 Finalizing transcript for call ${callId}`);

      // Get call details
      const { data: call, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();

      if (error || !call) {
        console.error(`Error getting call ${callId}:`, error);
        return;
      }

      // Check if recording already exists (from saveTranscriptToDatabase)
      const { data: existingRecording } = await supabase
        .from("call_recordings")
        .select("id")
        .eq("call_id", parseInt(callId))
        .single();

      if (!existingRecording) {
        // Save transcript to call_recordings table if not already saved
        const { error: recordingError } = await supabase
          .from("call_recordings")
          .insert({
            call_id: parseInt(callId),
            transcription: transcript,
            duration: call.duration,
            created_at: new Date().toISOString(),
          });

        if (recordingError) {
          console.error(
            `Error saving transcript for call ${callId}:`,
            recordingError
          );
        } else {
          console.log(`✅ Transcript saved for call ${callId}`);
        }
      } else {
        // Update existing record with final transcript
        await supabase
          .from("call_recordings")
          .update({
            transcription: transcript,
            updated_at: new Date().toISOString(),
          })
          .eq("call_id", parseInt(callId));

        console.log(`✅ Transcript updated for call ${callId}`);
      }

      // Process transcript with AI analysis and update call record
      // No message creation needed - summary is shown in the call record itself
      try {
        const analysis = await callRecordingService.generateCallAnalysis(
          transcript
        );
        await callRecordingService.updateCallWithAnalysis(
          parseInt(callId),
          analysis
        );

        // Create notifications for urgent action items
        await callRecordingService.createActionItemNotifications(
          parseInt(callId),
          analysis
        );

        console.log(
          `🤖 AI analysis completed for call ${callId} - summary stored in call record and notifications created`
        );
      } catch (analysisError) {
        console.error(
          `❌ Error processing AI analysis for call ${callId}:`,
          analysisError
        );
      }

      // Clear from active transcripts
      this.activeTranscripts.delete(callId);

      console.log(`📋 Transcript finalized and processed for call ${callId}`);
    } catch (error) {
      console.error(`Error finalizing transcript for call ${callId}:`, error);
    }
  }

  /**
   * Send a proactive greeting message to the caller
   */
  private sendProactiveGreeting(openaiWs: WebSocket, leadData: LeadRow | null) {
    try {
      // Create a greeting message for inbound calls
      let greetingText = "Hello, this is Sarah from LPT Realty speaking.";

      console.log(`📢 Sending greeting: "${greetingText}"`);

      // Use a more direct approach: create response with the greeting text directly
      const createResponse = {
        type: "response.create",
        response: {
          instructions: `Say exactly this greeting: "${greetingText}". Be warm and friendly.`,
        },
      };

      // Send the response creation request directly
      openaiWs.send(JSON.stringify(createResponse));

      console.log("✅ Proactive greeting sent successfully");
    } catch (error) {
      console.error("❌ Error sending proactive greeting:", error);
    }
  }
}

// Export a singleton instance
export const realtimeVoiceService = new RealtimeVoiceService();
