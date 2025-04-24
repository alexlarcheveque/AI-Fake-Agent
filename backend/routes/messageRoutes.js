import express from "express";
import messageController from "../controllers/messageController.js";
import Lead from "../models/Lead.js";
import Message from "../models/Message.js";

const router = express.Router();

// Get all messages with optional status filter
router.get("/", messageController.getAllMessages);

// Get message history for a lead
router.get("/lead/:leadId", messageController.getMessages);

// Send a message to a lead (with optional AI response)
router.post("/send", messageController.sendMessage);

// Webhook for receiving messages (for Twilio)
router.post("/receive", (req, res) => {
  console.log("Received incoming message webhook:", {
    body: req.body,
    headers: req.headers,
    method: req.method,
  });

  messageController.receiveMessage(req, res);
});


// Add this route for status callbacks
router.post("/status-callback", (req, res) => {
  console.log("Received Twilio status callback:", {
    body: req.body,
    headers: req.headers,
    method: req.method,
  });

  messageController.statusCallback(req, res);
});

// Add these routes to your existing messageRoutes.js
router.get("/stats", messageController.getMessageStats);
router.get("/scheduled", messageController.getScheduledMessages);

export default router;
