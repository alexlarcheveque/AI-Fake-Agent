import express from "express";
import callController from "../controllers/callController.ts";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Webhook routes (no authentication required - Twilio webhooks)
router.post("/voice-webhook", callController.voiceWebhook);
router.post("/status-callback", callController.statusCallback);
router.post("/recording-callback", callController.recordingCallback);
router.post("/gather-response", callController.gatherResponse);
router.get("/audio/:filename", callController.serveAudio);

// Public testing routes (no auth required)
router.get("/voices", callController.getAvailableVoices);
router.post("/voices/test", callController.testVoice);

// Apply protect middleware to all remaining routes
router.use(protect);

// Authenticated routes (require user login)
router.post("/leads/:leadId/call", callController.initiateCall);
router.get("/leads/:leadId", callController.getCallsForLead);
router.get("/stats", callController.getCallingStats);
router.get("/recordings/:recordingId", callController.getCallRecording);

export default router;
