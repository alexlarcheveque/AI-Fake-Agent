import express from "express";
import asyncHandler from "express-async-handler";
import {
  getMessagesByLeadIdDescending,
  createOutgoingMessage,
  receiveIncomingMessage,
  statusCallback,
  markAsRead,
} from "../controllers/messageController.ts";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply protect middleware to all message routes
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

// Add this route for status callbacks
router.post(
  "/status-callback",
  asyncHandler((req, res) => {
    console.log("Received Twilio status callback:", {
      body: req.body,
      headers: req.headers,
      method: req.method,
    });
    // Assuming statusCallback is implemented in messageController
    statusCallback(req, res);
  })
);

// Mark message as read
router.patch(
  "/messages/:messageId/read",
  asyncHandler((req, res) => markAsRead(req, res))
);

export default router;
