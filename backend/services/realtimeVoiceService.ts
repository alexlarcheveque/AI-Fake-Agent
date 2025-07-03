import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";
import { callRecordingService } from "./callRecordingService.js";

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
      console.log(`Starting Realtime voice call for lead ${options.leadId}`);

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
      let latestMediaTimestamp = 0;
      let lastAssistantItem: string | null = null;
      let markQueue: string[] = [];
      let responseStartTimestamp: number | null = null;
      let userHasSpoken = false; // Track if user has started speaking

      console.log(
        `🚀 STREAM STARTED: Using stream ID ${streamSid} from options`
      );
      if (options.initialStreamData) {
        console.log(
          `📋 STREAM DETAILS:`,
          JSON.stringify(options.initialStreamData, null, 2)
        );
      }

      // Configure OpenAI session when connected
      openaiWs.on("open", () => {
        console.log("🔗 OpenAI Realtime WebSocket connected");
        console.log("🔧 Configuring OpenAI session...");

        // Small delay to ensure connection is fully established
        setTimeout(() => {
          // Send session configuration - Pure Speech-to-Speech approach
          const sessionUpdate = {
            type: "session.update",
            session: {
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 200,
              },
              input_audio_format: "g711_ulaw",
              output_audio_format: "g711_ulaw",
              input_audio_transcription: {
                model: "whisper-1",
              },
              voice: "alloy", // Nova is brighter and more conversational than alloy
              model: "gpt-4o-realtime-preview",
              instructions: `You are Sarah, a friendly and experienced real estate agent from LPT Realty in Culver City, CA.

OPENING APPROACH: 
- If the user greets you first (like "Hi" or "Hello"), respond naturally: "Hi there! This is Sarah from LPT Realty. Thanks for taking my call!"
- If there's silence or the user seems confused, then introduce yourself: "Hi, this is Sarah from LPT Realty. I was calling to see if you were interested in selling your home."

DISCOVERY & RAPPORT BUILDING FRAMEWORK:

Phase 1 - Initial Engagement:
- Quickly introduce yourself and give the reason why you are calling
- Build rapport through genuine curiosity about their situation

Phase 2 - Discovery Questions (Ask these naturally in conversation):
- "What's got you thinking about potentially selling?"
- "How long have you been in your current home?"
- "What's your timeline looking like? No rush at all, just curious."
- "Have you had your home valued recently?"

Phase 3 - Value Building:
- Share relevant market insights: "Homes in your area have been moving really well lately"
- Position yourself as helpful: "I'd love to get you a no-obligation market analysis"
- Create urgency gently: "The market conditions right now are pretty favorable for sellers"

Communication Style:
- Speak like a helpful neighbor, not a pushy salesperson
- Use "we" language: "we could explore options" instead of "you should"
- Listen actively and respond to their specific concerns
- Keep it conversational - ask follow-up questions based on their answers
- If they object, acknowledge and redirect: "I totally get that. A lot of people feel that way initially..."

CRITICAL - NATURAL SPEECH DELIVERY:
- Speak at a natural, slightly faster conversational pace (not slow and deliberate)
- Use natural pauses and rhythm like you're talking to a friend over coffee
- Vary your pace - speed up when excited, slow down for important points
- Include natural speech patterns: "um", "you know", "so", "actually"
- Don't enunciate every word perfectly - speak naturally and casually
- Use contractions: "don't", "can't", "I'm", "we're" instead of formal speech
- Let sentences flow together naturally rather than pausing after each one
- Sound energetic and enthusiastic but not overly polished

Goal: Qualify their interest, build trust, and schedule a callback or appointment. Don't try to close anything on this call - just build rapport and gather information.`,

              modalities: ["text", "audio"],
              temperature: 0.9, // Higher temperature for more natural, varied responses
            },
          };

          console.log("📤 Sending session configuration to OpenAI");
          openaiWs.send(JSON.stringify(sessionUpdate));
        }, 100); // 100ms delay
      });

      // Handle messages from Twilio
      const handleTwilioMessage = async (message: string) => {
        try {
          const data = JSON.parse(message);

          if (
            data.event === "media" &&
            openaiWs.readyState === WebSocket.OPEN
          ) {
            console.log(
              `🎤 AUDIO INPUT: Received ${data.media.payload.length} bytes of audio from Twilio (timestamp: ${data.media.timestamp})`
            );
            latestMediaTimestamp = parseInt(data.media.timestamp);
            const audioAppend = {
              type: "input_audio_buffer.append",
              audio: data.media.payload,
            };
            openaiWs.send(JSON.stringify(audioAppend));
            console.log(
              `🔄 AUDIO FORWARDED: Sent audio to OpenAI (${data.media.payload.length} bytes)`
            );
          } else if (data.event === "start") {
            if (!streamSid) {
              streamSid = data.start.streamSid;
              console.log(
                `🚀 STREAM STARTED: Twilio stream ${streamSid} (fallback)`
              );
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
            console.log(`✅ MARK RECEIVED: ${JSON.stringify(data.mark)}`);
            if (markQueue.length > 0) {
              markQueue.shift();
            }
          } else {
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
            console.log(
              `🤖 AI AUDIO: Generated ${response.delta.length} bytes of audio (item: ${response.item_id})`
            );

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
              console.log(
                `🔊 AUDIO OUTPUT: Sent ${response.delta.length} bytes to Twilio stream ${streamSid}`
              );
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

            // Send mark to track message delivery
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
            console.log(
              "🎯 Ready for user speech - NOT auto-generating greeting"
            );
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
          } else if (response.type === "response.audio_transcript.done") {
            console.log("🤖 AI said:", response.transcript);
            this.appendToTranscript(
              options.callId,
              `AI: ${response.transcript}`
            );
            // Save transcript after each AI response
            await this.saveTranscriptToDatabase(options.callId);
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
      console.log(
        `📍 MARK SENT: Tracking audio delivery for stream ${streamSid}`
      );
    } else {
      console.log(
        `⚠️ MARK FAILED: Cannot send mark - streamSid: ${streamSid}, wsState: ${twilioWs?.readyState}`
      );
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
        console.log(
          `🤖 AI analysis completed for call ${callId} - summary stored in call record`
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
}

// Export a singleton instance
export const realtimeVoiceService = new RealtimeVoiceService();
