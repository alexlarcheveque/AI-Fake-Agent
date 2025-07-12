import "dotenv/config";
import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { callRecordingService } from "../services/callRecordingService.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

/**
 * Handle Twilio recording status callbacks
 */
export const handleRecordingCallback = async (req: Request, res: Response) => {
  try {
    console.log("📞 Recording callback received:", req.body);

    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus,
      RecordingChannels,
      RecordingSource,
    } = req.body;

    // Only process completed recordings
    if (RecordingStatus !== "completed") {
      console.log(
        `⏳ Recording status: ${RecordingStatus}, waiting for completion`
      );
      res.status(200).send("OK");
      return;
    }

    console.log(`✅ Recording completed for call ${CallSid}: ${RecordingUrl}`);

    // Find the call record by Twilio call SID
    const { data: calls, error: callError } = await supabase
      .from("calls")
      .select("*")
      .eq("twilio_call_sid", CallSid)
      .order("created_at", { ascending: false })
      .limit(1);

    const call = calls && calls.length > 0 ? calls[0] : null;

    if (callError || !call) {
      console.error(`❌ Call not found for SID ${CallSid}:`, callError);
      res.status(200).send("OK"); // Still return 200 to Twilio
      return;
    }

    // Update call record with duration and completion status
    // For manual calls, this is our primary way to detect call completion
    // since TwiML Dial doesn't support status callbacks
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Set duration if not already set
    if (!call.duration) {
      updateData.duration = parseInt(RecordingDuration) || 0;
    }

    // Set ended_at and status if not already set (for manual calls)
    if (!call.ended_at) {
      updateData.ended_at = new Date().toISOString();
      updateData.status = "completed";
    }

    const { error: updateError } = await supabase
      .from("calls")
      .update(updateData)
      .eq("id", call.id);

    if (updateError) {
      console.error(`❌ Error updating call ${call.id}:`, updateError);
    } else {
      console.log(`✅ Call ${call.id} updated with completion data`);
    }

    // Process the recording asynchronously
    processRecordingAsync(
      call.id,
      RecordingUrl,
      parseInt(RecordingDuration) || 0
    );

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error handling recording callback:", error);
    res.status(500).send("Internal Server Error");
  }
};

/**
 * Process recording asynchronously to avoid timeout
 */
async function processRecordingAsync(
  callId: number,
  recordingUrl: string,
  duration: number
) {
  try {
    console.log(`🎙️ Starting async processing for call ${callId}`);
    await callRecordingService.processCallRecording(
      callId,
      recordingUrl,
      duration
    );
    console.log(`✅ Async processing completed for call ${callId}`);
  } catch (error) {
    console.error(
      `❌ Error in async recording processing for call ${callId}:`,
      error
    );
  }
}

/**
 * Get call recording data for frontend
 */
export const getCallRecording = async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    if (!callId || isNaN(parseInt(callId))) {
      return res.status(400).json({ error: "Valid call ID is required" });
    }

    const recording = await callRecordingService.getCallRecording(
      parseInt(callId)
    );

    if (!recording) {
      return res.status(404).json({ error: "Recording not found" });
    }

    res.json(recording);
  } catch (error) {
    console.error("❌ Error getting call recording:", error);
    res.status(500).json({ error: "Failed to get call recording" });
  }
};

/**
 * Get all recordings for a lead
 */
export const getLeadRecordings = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    if (!leadId || isNaN(parseInt(leadId))) {
      return res.status(400).json({ error: "Valid lead ID is required" });
    }

    const recordings = await callRecordingService.getRecordingsForLead(
      parseInt(leadId)
    );

    res.json(recordings);
  } catch (error) {
    console.error("❌ Error getting lead recordings:", error);
    res.status(500).json({ error: "Failed to get lead recordings" });
  }
};

/**
 * Get real-time transcript for active call
 */
export const getCallTranscript = async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    if (!callId) {
      return res.status(400).json({ error: "Call ID is required" });
    }

    // Import here to avoid circular dependency
    const { realtimeVoiceService } = await import(
      "../services/realtimeVoiceService.js"
    );
    const transcript = realtimeVoiceService.getTranscript(callId);

    res.json({
      callId,
      transcript: transcript || "No transcript available",
    });
  } catch (error) {
    console.error("❌ Error getting call transcript:", error);
    res.status(500).json({ error: "Failed to get call transcript" });
  }
};
