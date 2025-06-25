import express from "express";
import conversationalCallController from "../controllers/conversationalCallController.ts";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Webhook routes (no authentication required - Twilio webhooks)
router.post(
  "/conversational-voice-webhook",
  conversationalCallController.conversationalVoiceWebhook
);
router.post(
  "/conversation-response",
  conversationalCallController.conversationResponse
);
router.post(
  "/conversation-timeout",
  conversationalCallController.conversationTimeout
);
router.post(
  "/conversational-status-callback",
  conversationalCallController.conversationalStatusCallback
);

// Protected routes (require authentication)
router.get(
  "/conversations/:callId/messages",
  protect,
  conversationalCallController.getConversationMessages
);
router.get(
  "/conversations/analytics/:leadId",
  protect,
  conversationalCallController.getConversationAnalytics
);

export default router;
