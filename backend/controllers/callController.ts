import { Request, Response } from "express";
import logger from "../utils/logger.ts";
import twilioVoiceService from "../services/twilioVoiceService.ts";
import voiceCallingOrchestrator from "../services/voiceCallingOrchestrator.ts";
import elevenlabsService from "../services/elevenlabsService.ts";
import supabase from "../config/supabase.ts";
import fs from "fs";
import path from "path";

// Manual call initiation
export const initiateCall = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    if (!leadId || isNaN(Number(leadId))) {
      return res.status(400).json({ error: "Valid lead ID is required" });
    }

    const result = await voiceCallingOrchestrator.initiateManualCall(
      Number(leadId)
    );

    if (result.success) {
      res.status(200).json({
        message: result.message,
        callId: result.callId,
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    logger.error("Error in initiateCall controller:", error);
    res.status(500).json({ error: "Failed to initiate call" });
  }
};

// Get calls for a lead
export const getCallsForLead = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    if (!leadId || isNaN(Number(leadId))) {
      return res.status(400).json({ error: "Valid lead ID is required" });
    }

    const calls = await twilioVoiceService.getCallsForLead(Number(leadId));

    // Also fetch call recordings for each call
    const callsWithRecordings = await Promise.all(
      calls.map(async (call) => {
        const { data: recordings } = await supabase
          .from("call_recordings")
          .select("*")
          .eq("call_id", call.id);

        return {
          ...call,
          recordings: recordings || [],
        };
      })
    );

    res.status(200).json(callsWithRecordings);
  } catch (error) {
    logger.error("Error in getCallsForLead controller:", error);
    res.status(500).json({ error: "Failed to get calls" });
  }
};

// Twilio voice webhook handler
export const voiceWebhook = async (req: Request, res: Response) => {
  try {
    const { callId, script } = req.query;

    if (!callId || !script) {
      return res.status(400).send("Missing required parameters");
    }

    const parsedScript = JSON.parse(decodeURIComponent(script as string));
    const twiml = await twilioVoiceService.handleVoiceWebhook(
      callId as string,
      parsedScript
    );

    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } catch (error) {
    logger.error("Error in voiceWebhook controller:", error);

    // Send fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural" language="en-US">Hello, this is a call from your real estate agent. I'll follow up with a text message shortly. Thank you!</Say>
      <Hangup/>
    </Response>`;

    res.set("Content-Type", "text/xml");
    res.send(fallbackTwiml);
  }
};

// Twilio status callback handler
export const statusCallback = async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    if (!CallSid || !CallStatus) {
      return res.status(400).send("Missing required parameters");
    }

    const success = await twilioVoiceService.handleStatusCallback(
      CallSid,
      CallStatus,
      CallDuration
    );

    if (success) {
      res.status(200).send("OK");
    } else {
      res.status(500).send("Error updating call status");
    }
  } catch (error) {
    logger.error("Error in statusCallback controller:", error);
    res.status(500).send("Internal server error");
  }
};

// Twilio recording callback handler
export const recordingCallback = async (req: Request, res: Response) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;

    if (!CallSid || !RecordingSid || !RecordingUrl) {
      return res.status(400).send("Missing required parameters");
    }

    const success = await twilioVoiceService.handleRecordingCallback(
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration
    );

    if (success) {
      res.status(200).send("OK");
    } else {
      res.status(500).send("Error saving recording");
    }
  } catch (error) {
    logger.error("Error in recordingCallback controller:", error);
    res.status(500).send("Internal server error");
  }
};

// Handle call gather response (when user presses a digit)
export const gatherResponse = async (req: Request, res: Response) => {
  try {
    const { callId } = req.query;
    const { Digits } = req.body;

    logger.info(`Gather response for call ${callId}: ${Digits}`);

    let twiml: string;

    if (Digits === "1") {
      // User is interested, connect to agent or continue conversation
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="Polly.Joanna-Neural" language="en-US">Thank you for your interest! I'll connect you with an agent right away, or you can expect a call back within the next hour. Have a great day!</Say>
        <Hangup/>
      </Response>`;

      // Mark this lead as interested in the database
      if (callId) {
        const { data: call } = await supabase
          .from("calls")
          .select("lead_id")
          .eq("id", callId)
          .single();

        if (call) {
          await supabase
            .from("leads")
            .update({ status: "interested" })
            .eq("id", call.lead_id);
        }
      }
    } else {
      // Default response for any other input or timeout
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="Polly.Joanna-Neural" language="en-US">Thank you for your time! I'll send you a text message with more information. Have a great day!</Say>
        <Hangup/>
      </Response>`;
    }

    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } catch (error) {
    logger.error("Error in gatherResponse controller:", error);

    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural" language="en-US">Thank you! Have a great day!</Say>
      <Hangup/>
    </Response>`;

    res.set("Content-Type", "text/xml");
    res.send(fallbackTwiml);
  }
};

// Get calling statistics
export const getCallingStats = async (req: Request, res: Response) => {
  try {
    const userUuid = req.user?.uuid;

    if (!userUuid) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const stats = await voiceCallingOrchestrator.getCallingStats(userUuid);
    res.status(200).json(stats);
  } catch (error) {
    logger.error("Error in getCallingStats controller:", error);
    res.status(500).json({ error: "Failed to get calling statistics" });
  }
};

// Get available ElevenLabs voices
export const getAvailableVoices = async (req: Request, res: Response) => {
  try {
    const voices = await elevenlabsService.getAvailableVoices();
    res.status(200).json(voices);
  } catch (error) {
    logger.error("Error in getAvailableVoices controller:", error);
    res.status(500).json({ error: "Failed to get available voices" });
  }
};

// Test a voice with sample text
export const testVoice = async (req: Request, res: Response) => {
  try {
    const { voiceId, sampleText } = req.body;

    if (!voiceId) {
      return res.status(400).json({ error: "Voice ID is required" });
    }

    const result = await elevenlabsService.testVoice(voiceId, sampleText);
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error in testVoice controller:", error);
    res.status(500).json({ error: "Failed to test voice" });
  }
};

// Get call recording
export const getCallRecording = async (req: Request, res: Response) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId || isNaN(Number(recordingId))) {
      return res.status(400).json({ error: "Valid recording ID is required" });
    }

    const { data: recording, error } = await supabase
      .from("call_recordings")
      .select("*, calls!inner(lead_id, leads!inner(user_uuid))")
      .eq("id", Number(recordingId))
      .single();

    if (error || !recording) {
      return res.status(404).json({ error: "Recording not found" });
    }

    // Check if user has access to this recording
    const userUuid = req.user?.uuid;
    if (recording.calls.leads.user_uuid !== userUuid) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.status(200).json(recording);
  } catch (error) {
    logger.error("Error in getCallRecording controller:", error);
    res.status(500).json({ error: "Failed to get recording" });
  }
};

// Serve ElevenLabs generated audio files
export const serveAudio = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent path traversal
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const audioDir = path.join(process.cwd(), "temp", "audio");
    const audioPath = path.join(audioDir, filename);

    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    // Set appropriate headers for audio
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=300"); // Cache for 5 minutes

    // Stream the audio file
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);

    // Clean up file after serving (optional - could keep for caching)
    audioStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(audioPath)) {
          fs.unlink(audioPath, (err) => {
            if (err) {
              logger.warn(`Failed to delete audio file ${filename}:`, err);
            } else {
              logger.info(`Cleaned up audio file: ${filename}`);
            }
          });
        }
      }, 5000); // Delete after 5 seconds
    });
  } catch (error) {
    logger.error("Error in serveAudio controller:", error);
    res.status(500).json({ error: "Failed to serve audio file" });
  }
};

export default {
  initiateCall,
  getCallsForLead,
  voiceWebhook,
  statusCallback,
  recordingCallback,
  gatherResponse,
  serveAudio,
  getCallingStats,
  getAvailableVoices,
  testVoice,
  getCallRecording,
};
