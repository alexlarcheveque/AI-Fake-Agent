import { Router } from "express";
import {
  handleRecordingCallback,
  getCallRecording,
  getLeadRecordings,
  getCallTranscript,
} from "../controllers/recordingController.js";

const router = Router();

/**
 * Handle Twilio recording status callbacks
 * POST /api/recordings/callback
 */
router.post("/callback", handleRecordingCallback);

/**
 * Get recording data for a specific call
 * GET /api/recordings/call/:callId
 */
router.get("/call/:callId", getCallRecording);

/**
 * Get all recordings for a specific lead
 * GET /api/recordings/lead/:leadId
 */
router.get("/lead/:leadId", getLeadRecordings);

/**
 * Get real-time transcript for an active call
 * GET /api/recordings/transcript/:callId
 */
router.get("/transcript/:callId", getCallTranscript);

export default router;
