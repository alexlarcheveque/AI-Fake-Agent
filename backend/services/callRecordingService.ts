import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { CallRow } from "../models/Call.ts";
import { createMessage } from "./messageService.ts";
import { calculateLeadScores } from "./leadScoringService.ts";
import { createNotification } from "./notificationService.ts";
import logger from "../utils/logger.ts";

// Ensure environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY"
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface CallHighlight {
  timestamp: string;
  type: "key_moment" | "objection" | "commitment" | "question" | "next_step";
  title: string;
  content: string;
  importance: "high" | "medium" | "low";
}

export interface CallAnalysis {
  summary: string;
  highlights: CallHighlight[];
  sentiment_score: number;
  action_items: string[];
  customer_interest_level: "high" | "medium" | "low";
  commitment_details: string;
}

export class CallRecordingService {
  /**
   * Process a call recording - extract transcription and generate highlights
   */
  async processCallRecording(
    callId: number,
    recordingUrl: string,
    duration: number
  ): Promise<void> {
    try {
      console.log(`🎙️ Processing call recording for call ${callId}`);

      // Check if call already has AI analysis (from realtime processing)
      const { data: existingCall, error: callError } = await supabase
        .from("calls")
        .select("ai_summary, sentiment_score")
        .eq("id", callId)
        .single();

      if (callError) {
        console.error(`❌ Error checking existing call ${callId}:`, callError);
        throw callError;
      }

      const hasExistingAnalysis =
        existingCall.ai_summary && existingCall.sentiment_score !== null;

      // Step 1: Transcribe the audio (always do this for recording URL)
      const transcription = await this.transcribeAudio(recordingUrl);

      let analysis: CallAnalysis;

      if (hasExistingAnalysis) {
        console.log(
          `📋 Call ${callId} already has AI analysis from realtime processing`
        );
        // Use existing analysis but update with recording transcription if better
        analysis = {
          summary: existingCall.ai_summary,
          sentiment_score: existingCall.sentiment_score,
          highlights: [],
          action_items: [],
          customer_interest_level: "medium",
          commitment_details: "",
        };
      } else {
        // Step 2: Generate AI analysis and highlights (only if not already done)
        analysis = await this.generateCallAnalysis(transcription);

        // Step 3: Update call record with analysis
        await this.updateCallWithAnalysis(callId, analysis);

        // Step 4: Create notifications for urgent action items
        await this.createActionItemNotifications(callId, analysis);
      }

      // Step 5: Create call recording record (always do this for playback)
      await this.createRecordingRecord(
        callId,
        recordingUrl,
        duration,
        transcription
      );

      // Step 6: Skip message creation - call summary is shown in the call record itself
      console.log(
        `⏭️ Skipping message creation - call summary shown in call record for call ${callId}`
      );

      console.log(
        `✅ Call recording processed successfully for call ${callId}`
      );
    } catch (error) {
      console.error(
        `❌ Error processing call recording for call ${callId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(recordingUrl: string): Promise<string> {
    try {
      console.log(`🗣️ Transcribing audio from ${recordingUrl}`);

      // Download the audio file
      const response = await fetch(recordingUrl);
      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioFile = new File([audioBuffer], "recording.mp3", {
        type: "audio/mpeg",
      });

      // Use OpenAI Whisper for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      console.log(
        `✅ Transcription completed, ${transcription.text.length} characters`
      );
      return transcription.text;
    } catch (error) {
      console.error("❌ Error transcribing audio:", error);
      throw error;
    }
  }

  /**
   * Generate AI analysis and highlights from transcription
   */
  public async generateCallAnalysis(
    transcription: string
  ): Promise<CallAnalysis> {
    try {
      console.log(`🤖 Generating AI analysis for transcription`);

      const prompt = `Analyze this real estate call transcription and provide a comprehensive analysis:

TRANSCRIPTION:
${transcription}

Please provide a JSON response with the following structure:
{
  "summary": "Brief overview of call purpose and outcome, key topics discussed, and overall assessment of lead quality and engagement level",
  "highlights": [
    {
      "timestamp": "MM:SS format if available, or 'early/mid/late call'",
      "type": "key_moment|objection|commitment|question|next_step",
      "title": "Brief title for this highlight",
      "content": "Detailed description of what happened",
      "importance": "high|medium|low"
    }
  ],
  "sentiment_score": 0.5,
  "action_items": [],
  "customer_interest_level": "medium",
  "commitment_details": ""
}

CRITICAL ANALYSIS GUIDELINES:
1. **Only generate action items if they are ACTUALLY warranted by the call content**
   - For introductory calls/greetings with no substantive discussion: action_items should be empty []
   - For calls with specific requests/needs: generate relevant action items based on what was discussed
   - Do NOT generate generic or template action items

2. **summary**: Focus on what actually happened in the call, not what might happen in future calls

3. **sentiment_score**: 0-1 scale (0=very negative, 0.5=neutral, 1=very positive) based on customer tone and engagement

4. **action_items**: ONLY include specific actionable tasks that were discussed or requested in the call
   - For short greeting calls: use empty array []
   - For detailed conversations: include specific tasks like "Send listings for 3BR homes under $400K in downtown area"
   - Must be based on ACTUAL call content, not assumptions

5. **customer_interest_level**: 
   - "high" (actively looking, ready to move, asking specific questions)
   - "medium" (interested but slower timeline, general inquiry)
   - "low" (just browsing/early stage, minimal engagement)

6. **commitment_details**: Only include if customer made SPECIFIC commitments in the call
   - Use empty string "" if no commitments were made
   - Be specific: "Agreed to property showing Saturday 2pm" 
   - Do NOT assume or infer commitments not explicitly stated

REAL ESTATE FOCUS AREAS TO LOOK FOR:
- Property requirements: bedrooms, bathrooms, price range, neighborhoods, special features
- Financial readiness: pre-approval status, down payment, budget flexibility, financing concerns
- Timeline urgency: when they need to move, lease expiration, job relocation, life events
- Motivation drivers: family growth, downsizing, investment, first-time buyer, relocation
- Market concerns: pricing, competition, interest rates, inventory levels
- Commitment indicators: willingness to view properties, provide financial info, make offers

IMPORTANT: Base your analysis ONLY on what was actually discussed in the call. Do not generate action items or commitments that weren't explicitly mentioned or requested.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini which supports JSON mode and is faster/cheaper
        messages: [
          {
            role: "system",
            content:
              "You are an expert real estate call analyst. Provide detailed, actionable insights from call transcriptions. IMPORTANT: Respond ONLY with valid JSON - no text before or after the JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }, // Force JSON response
      });

      const analysisText = completion.choices[0].message.content;
      if (!analysisText) {
        throw new Error("No analysis generated");
      }

      // Clean up response text in case there's extra content
      let cleanedText = analysisText.trim();

      // Find JSON object boundaries
      const jsonStart = cleanedText.indexOf("{");
      const jsonEnd = cleanedText.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }

      let analysis: CallAnalysis;

      try {
        analysis = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(
          "⚠️ JSON parsing failed, creating fallback analysis:",
          parseError
        );

        // Create a fallback analysis if JSON parsing fails
        analysis = {
          summary: analysisText.substring(0, 200) + "...", // Use first 200 chars as summary
          highlights: [],
          sentiment_score: 0.5, // Neutral sentiment
          action_items: ["Review call recording", "Follow up with customer"],
          customer_interest_level: "medium",
          commitment_details: "",
        };
      }

      console.log(
        `✅ AI analysis generated with ${analysis.highlights.length} highlights`
      );

      return analysis;
    } catch (error) {
      console.error("❌ Error generating call analysis:", error);
      throw error;
    }
  }

  /**
   * Update call record with AI analysis
   */
  public async updateCallWithAnalysis(
    callId: number,
    analysis: CallAnalysis
  ): Promise<void> {
    try {
      // Get call data to extract lead_id
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("lead_id")
        .eq("id", callId)
        .single();

      if (callError) {
        throw callError;
      }

      const { error } = await supabase
        .from("calls")
        .update({
          ai_summary: analysis.summary,
          sentiment_score: analysis.sentiment_score,
          action_items: analysis.action_items || [],
          customer_interest_level: analysis.customer_interest_level || "medium",
          commitment_details: analysis.commitment_details || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", callId);

      if (error) {
        throw error;
      }

      console.log(`✅ Call ${callId} updated with structured AI analysis:`, {
        summary: !!analysis.summary,
        actionItems: analysis.action_items?.length || 0,
        sentimentScore: analysis.sentiment_score,
        interestLevel: analysis.customer_interest_level,
        commitmentDetails: !!analysis.commitment_details,
      });

      // Update lead scores after call analysis
      if (call?.lead_id) {
        try {
          await calculateLeadScores(call.lead_id);
          console.log(
            `✅ Updated lead scores for lead ${call.lead_id} after call analysis`
          );
        } catch (scoringError) {
          console.error(
            `❌ Error updating lead scores for lead ${call.lead_id}:`,
            scoringError
          );
          // Don't throw to prevent disrupting the main workflow
        }
      }
    } catch (error) {
      console.error("❌ Error updating call with analysis:", error);
      throw error;
    }
  }

  /**
   * Create call recording record
   */
  private async createRecordingRecord(
    callId: number,
    recordingUrl: string,
    duration: number,
    transcription: string
  ): Promise<void> {
    try {
      // Check if recording record already exists (from realtime processing)
      const { data: existingRecordings, error: checkError } = await supabase
        .from("call_recordings")
        .select("*")
        .eq("call_id", callId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      const existingRecording =
        existingRecordings && existingRecordings.length > 0
          ? existingRecordings[0]
          : null;

      if (existingRecording) {
        // Update existing record with recording URL and better transcription
        console.log(`📝 Updating existing recording record for call ${callId}`);
        const { error: updateError } = await supabase
          .from("call_recordings")
          .update({
            recording_url: recordingUrl,
            duration: duration,
            transcription: transcription, // Use Twilio transcription as it's usually better
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRecording.id); // Update by ID to be specific

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Recording record updated for call ${callId}`);
      } else {
        // Create new record
        const { error } = await supabase.from("call_recordings").insert({
          call_id: callId,
          recording_url: recordingUrl,
          duration: duration,
          transcription: transcription,
          created_at: new Date().toISOString(),
        });

        if (error) {
          throw error;
        }

        console.log(`✅ Recording record created for call ${callId}`);
      }
    } catch (error) {
      console.error("❌ Error creating/updating recording record:", error);
      throw error;
    }
  }

  /**
   * Create a message thread entry for the call with highlights
   */
  private async createCallMessageEntry(
    callId: number,
    analysis: CallAnalysis
  ): Promise<void> {
    try {
      // Get call details
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();

      if (callError || !call) {
        throw new Error(`Call ${callId} not found`);
      }

      // Create a formatted message with call highlights
      const messageContent = this.formatCallHighlightsMessage(analysis, call);

      // Insert as a system message in the message thread
      const { error: messageError } = await supabase.from("messages").insert({
        lead_id: call.lead_id,
        sender: "system",
        text: messageContent,
        is_ai_generated: true,
        created_at: call.ended_at || new Date().toISOString(),
        delivery_status: "delivered",
      });

      if (messageError) {
        throw messageError;
      }

      console.log(`✅ Call highlights message created for call ${callId}`);
    } catch (error) {
      console.error("❌ Error creating call message entry:", error);
      throw error;
    }
  }

  /**
   * Format call highlights into a readable message
   */
  private formatCallHighlightsMessage(
    analysis: CallAnalysis,
    call: any
  ): string {
    const callDuration = call.duration
      ? `${Math.floor(call.duration / 60)}:${(call.duration % 60)
          .toString()
          .padStart(2, "0")}`
      : "Unknown";

    let message = `📞 Call Summary (${callDuration})\n\n`;
    message += `${analysis.summary}\n\n`;

    if (analysis.highlights.length > 0) {
      message += `🎯 Key Highlights:\n`;
      analysis.highlights
        .filter((h) => h.importance === "high")
        .slice(0, 3) // Top 3 highlights
        .forEach((highlight) => {
          const emoji = this.getHighlightEmoji(highlight.type);
          message += `${emoji} ${highlight.title}: ${highlight.content}\n`;
        });
      message += `\n`;
    }

    if (analysis.action_items.length > 0) {
      message += `✅ Action Items:\n`;
      analysis.action_items.forEach((item) => {
        message += `• ${item}\n`;
      });
      message += `\n`;
    }

    if (analysis.commitment_details) {
      message += `🤝 Commitments Made:\n`;
      message += `• ${analysis.commitment_details}\n`;
      message += `\n`;
    }

    const sentimentEmoji =
      analysis.sentiment_score > 0.7
        ? "😊"
        : analysis.sentiment_score > 0.4
        ? "😐"
        : "😟";
    message += `${sentimentEmoji} Sentiment: ${this.formatSentimentScore(
      analysis.sentiment_score
    )} | Interest Level: ${analysis.customer_interest_level.toUpperCase()}`;

    return message;
  }

  /**
   * Get emoji for highlight type
   */
  private getHighlightEmoji(type: string): string {
    switch (type) {
      case "key_moment":
        return "⭐";
      case "objection":
        return "⚠️";
      case "commitment":
        return "🤝";
      case "question":
        return "❓";
      case "next_step":
        return "➡️";
      default:
        return "💡";
    }
  }

  /**
   * Format sentiment score as percentage
   */
  private formatSentimentScore(score: number): string {
    const percentage = Math.round(score * 100);
    if (percentage >= 70) return `Very Positive (${percentage}%)`;
    if (percentage >= 40) return `Neutral (${percentage}%)`;
    return `Poor (${percentage}%)`;
  }

  /**
   * Get call recording with transcription for a specific call
   */
  async getCallRecording(callId: number) {
    try {
      console.log(`🔍 Looking for recording for call ${callId}`);

      const { data, error } = await supabase
        .from("call_recordings")
        .select("*")
        .eq("call_id", callId);

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log(
        `📝 Found ${data?.length || 0} recordings for call ${callId}`
      );

      // Return the first recording if found, null otherwise
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("❌ Error getting call recording:", error);
      throw error;
    }
  }

  /**
   * Get all recordings for a lead
   */
  async getRecordingsForLead(leadId: number) {
    try {
      const { data, error } = await supabase
        .from("call_recordings")
        .select(
          `
          *,
          calls (
            id,
            direction,
            started_at,
            duration,
            ai_summary,
            sentiment_score
          )
        `
        )
        .eq("calls.lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("❌ Error getting recordings for lead:", error);
      throw error;
    }
  }

  /**
   * Create notifications for action items and commitments from call analysis
   */
  public async createActionItemNotifications(
    callId: number,
    analysis: CallAnalysis
  ): Promise<void> {
    try {
      // Get call details to extract user_uuid and lead info
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .select(
          `
          id,
          lead_id,
          started_at,
          leads (
            id,
            name,
            user_uuid
          )
        `
        )
        .eq("id", callId)
        .single();

      if (callError || !callData?.leads) {
        console.error(
          `❌ Error getting call data for notifications:`,
          callError
        );
        return;
      }

      const lead = Array.isArray(callData.leads)
        ? callData.leads[0]
        : callData.leads;
      const userUuid = lead?.user_uuid;

      if (!userUuid || !lead) {
        console.log(
          `⚠️ No user_uuid or lead found for call ${callId}, skipping notifications`
        );
        return;
      }

      // Create notification for action items (if any exist)
      if (analysis.action_items && analysis.action_items.length > 0) {
        await createNotification({
          user_uuid: userUuid,
          lead_id: lead.id,
          type: "action_item",
          title: `Action Items from Call: ${lead.name}`,
          message: `${analysis.action_items.length} action item${
            analysis.action_items.length > 1 ? "s" : ""
          } identified from recent call. Review call details to prioritize follow-up.`,
          is_read: false,
          created_at: new Date().toISOString(),
        });

        console.log(
          `📋 Created action items notification for call ${callId} (${analysis.action_items.length} items)`
        );
      }

      // Create notification for commitments made during the call
      if (analysis.commitment_details && analysis.commitment_details.trim()) {
        await createNotification({
          user_uuid: userUuid,
          lead_id: lead.id,
          type: "commitment",
          title: `Commitment Made: ${lead.name}`,
          message: `Client made commitments during the call. Review call details for specific commitments and follow-up actions.`,
          is_read: false,
          created_at: new Date().toISOString(),
        });

        console.log(`🤝 Created commitment notification for call ${callId}`);
      }

      console.log(
        `✅ Call notification processing completed for call ${callId}`
      );
    } catch (error) {
      console.error(
        `❌ Error creating call notifications for call ${callId}:`,
        error
      );
      // Don't throw error to avoid disrupting the main call processing flow
    }
  }
}

export const callRecordingService = new CallRecordingService();
