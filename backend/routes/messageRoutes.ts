import express from "express";
import asyncHandler from "express-async-handler";
import {
  getMessagesByLeadIdDescending,
  createOutgoingMessage,
  receiveIncomingMessage,
  statusCallback,
  markAsRead,
  getNextScheduledMessageForLead,
} from "../controllers/messageController.ts";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Create routes for webhook endpoints that don't need authentication
// Webhook for receiving messages (for Twilio)
router.post(
  "/receive",
  asyncHandler((req, res) => receiveIncomingMessage(req, res))
);

// Status callback endpoint for Twilio
router.post(
  "/status-callback",
  asyncHandler((req, res) => statusCallback(req, res))
);

// Apply protect middleware to all other message routes
router.use(protect);

// Get message history for a lead
router.get(
  "/lead/:leadId",
  asyncHandler((req, res) => getMessagesByLeadIdDescending(req, res))
);

// Send a message to a lead
router.post(
  "/send",
  asyncHandler((req, res) => createOutgoingMessage(req, res))
);

// Webhook for receiving messages (for Twilio)
router.post(
  "/receive",
  asyncHandler((req, res) => receiveIncomingMessage(req, res))
);

router.get(
  "/next-scheduled/:leadId",
  asyncHandler((req, res) => getNextScheduledMessageForLead(req, res))
);

// Mark message as read
router.patch(
  "/messages/:messageId/read",
  asyncHandler((req, res) => markAsRead(req, res))
);

export default router;
