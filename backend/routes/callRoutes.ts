import express from "express";
import expressWs from "express-ws";
import {
  handleIncomingCall,
  handleRealtimeWebSocket,
  initiateCall,
  initiateAICall,
  getCallsForLead,
  debugAndFixCalls,
  testLeadLookup,
  testCallInsert,
  generateAccessToken,
  handleCallStatusCallback,
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
 * Debug and fix calls for a specific lead
 */
router.post("/debug/:leadId", debugAndFixCalls);

/**
 * Test endpoint to check if a lead exists
 */
router.get("/test-lead/:leadId", testLeadLookup);

/**
 * Test endpoint to create a call record
 */
router.post("/test-call", testCallInsert);

/**
 * Generate Twilio access token for WebRTC calling
 */
router.post("/token", generateAccessToken);

/**
 * WebSocket endpoint for Realtime voice calls
 */
wsRouter.ws("/realtime", handleRealtimeWebSocket);

export default router;
