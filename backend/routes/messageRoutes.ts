import express from "express";
import asyncHandler from "express-async-handler";
import messageController from "../controllers/messageController.ts";

const router = express.Router();

// Get message history for a lead
router.get(
  "/lead/:lead_id",
  asyncHandler((req, res) =>
    messageController.getMessagesByLeadIdDescending(req, res)
  )
);

// Send a message to a lead
router.post(
  "/send",
  asyncHandler((req, res) => messageController.createOutgoingMessage(req, res))
);

// Webhook for receiving messages (for Twilio)
router.post(
  "/receive",
  asyncHandler((req, res) => messageController.receiveIncomingMessage(req, res))
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
    messageController.statusCallback(req, res);
  })
);

// Mark message as read
router.patch(
  "/messages/:messageId/read",
  asyncHandler((req, res) => messageController.markAsRead(req, res))
);

export default router;
