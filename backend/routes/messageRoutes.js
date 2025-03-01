const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  receiveMessage,
  sendLocalMessage,
  testTwilio,
} = require("../controllers/messageController");
const Message = require("../models/message");

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

module.exports = router;
