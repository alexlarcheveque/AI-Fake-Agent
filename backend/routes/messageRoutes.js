const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  receiveMessage,
  sendLocalMessage,
  testTwilio,
  statusCallback,
} = require("../controllers/messageController");
const Message = require("../models/message");
const logger = require("../utils/logger");

// Get message history for a lead
router.get("/lead/:leadId", getMessages);

// Send a message to a lead (with optional AI response)
router.post("/send", sendMessage);

// Send a local message (for playground testing)
router.post("/send-local", sendLocalMessage);

// Webhook for receiving messages (for Twilio)
router.post("/receive", receiveMessage);

// Test Twilio
router.post("/test-twilio", testTwilio);

// Add this route to your messageRoutes.js file
router.get("/stats", async (req, res) => {
  try {
    const totalMessages = await Message.count();
    res.json({ totalMessages });
  } catch (error) {
    console.error("Error fetching message stats:", error);
    res.status(500).json({ error: "Failed to fetch message statistics" });
  }
});

// Add this route to your existing messageRoutes.js
router.post("/status-callback", statusCallback);

// Add this route to get all messages with optional status filter
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause =
      status && status !== "all" ? { deliveryStatus: status } : {};

    const messages = await Message.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    res.json(messages);
  } catch (error) {
    logger.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
