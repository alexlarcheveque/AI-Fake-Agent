import express from "express";
import expressWs from "express-ws";
import protect from "../middleware/authMiddleware.ts";
import {
  handleIncomingCall,
  handleRealtimeWebSocket,
  initiateCall,
  initiateAICall,
  getCallsForLead,
  getCallsForUser,
  debugAndFixCalls,
  testLeadLookup,
  testCallInsert,
  generateAccessToken,
  handleCallStatusCallback,
  getCallStats,
  getAvailableVoices,
  testVoice,
  handleVoicemailCall,
} from "../controllers/callController.ts";
import path from "path";

const router = express.Router();

// Enable WebSocket on this router
const wsRouter = expressWs(router).app;

/**
 * Twilio webhook for incoming calls
 * ALL calls now use WebRTC + Realtime AI
 */
router.post("/incoming", handleIncomingCall);

/**
 * Twilio webhook for call status updates
 */
router.post("/status-callback", handleCallStatusCallback);

/**
 * Get available voices for voice calling (public - just returns config)
 */
router.get("/voices", getAvailableVoices);

/**
 * Test a voice by playing a sample (public - just validates voice ID)
 */
router.post("/test", testVoice);

/**
 * Test endpoint to create a call record (public debug endpoint)
 */
router.post("/test-call", testCallInsert);

// Apply protect middleware to user-specific and security-sensitive routes
router.use(protect);

/**
 * Initiate a direct AI call to a lead (no WebRTC)
 */
router.post("/initiate-ai", initiateAICall);

/**
 * Initiate an outbound call to a lead using WebRTC (manual call)
 */
router.post("/initiate", initiateCall);

/**
 * Get calls for a specific lead
 */
router.get("/lead/:leadId", getCallsForLead);

/**
 * Get all calls for the current user
 */
router.get("/user", getCallsForUser);

/**
 * Debug and fix calls for a specific lead
 */
router.post("/debug/:leadId", debugAndFixCalls);

/**
 * Test endpoint to check if a lead exists
 */
router.get("/test-lead/:leadId", testLeadLookup);

/**
 * Generate Twilio access token for WebRTC calling
 */
router.post("/token", generateAccessToken);

/**
 * Get call statistics for the current user
 */
router.get("/stats", getCallStats);

/**
 * WebSocket endpoint for Realtime voice calls
 */
wsRouter.ws("/realtime", handleRealtimeWebSocket);

// Handle voicemail-only calls
router.post("/voice-voicemail/:leadId", handleVoicemailCall);

// Serve temporary voicemail audio files
router.get("/voicemail-audio/:fileName", (req, res) => {
  try {
    const fileName = req.params.fileName;

    // Validate filename to prevent directory traversal
    if (!fileName.match(/^voicemail-\d+-\d+\.mp3$/)) {
      return res.status(400).send("Invalid filename");
    }

    const filePath = path.join(
      process.cwd(),
      "backend",
      "temp",
      "audio",
      fileName
    );

    console.log(`📁 Serving voicemail audio: ${fileName}`);

    // Set appropriate headers for audio streaming
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error serving voicemail audio ${fileName}:`, err);
        res.status(404).send("Audio file not found");
      } else {
        console.log(`✅ Successfully served voicemail audio: ${fileName}`);
      }
    });
  } catch (error) {
    console.error("❌ Error serving voicemail audio:", error);
    res.status(500).send("Internal server error");
  }
});

export default router;
