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
} from "../controllers/callController.ts";

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

/**
 * Test route to verify authentication bypass (should be accessible without auth)
 */
router.get("/test-no-auth", (req, res) => {
  res.json({ message: "No auth required - this route works!" });
});

/**
 * WebSocket endpoint for Realtime voice calls (using same router as test route)
 */
wsRouter.ws("/realtime", (ws, req) => {
  console.log(
    "🚀 WEBSOCKET: Twilio connecting to /api/voice/realtime (router level)"
  );
  console.log("🔍 WEBSOCKET: Headers:", JSON.stringify(req.headers, null, 2));
  handleRealtimeWebSocket(ws, req);
});

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

export default router;
