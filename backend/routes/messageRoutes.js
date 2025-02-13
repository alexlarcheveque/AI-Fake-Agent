const express = require("express");
const {
  sendMessage,
  getMessages,
  receiveMessage,
} = require("../controllers/messageController");
const router = express.Router();
const Message = require("../models/Message");

// Get message history for a lead
router.get("/lead/:leadId", getMessages);

// Get all messages
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a new message to a lead
router.post("/send", sendMessage);

// Webhook endpoint for receiving messages from Twilio
router.post("/webhook", receiveMessage);

module.exports = router;
