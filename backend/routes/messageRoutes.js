const express = require("express");
const {
  sendMessage,
  getMessages,
  receiveMessage,
} = require("../controllers/messageController");
const router = express.Router();
const Message = require("../models/Message");

// GET /api/messages/:leadId - Get all messages for a lead
router.get("/:leadId", getMessages);

// POST /api/messages - Send a new message
router.post("/", sendMessage);

// Get all messages
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new message
router.post("/", async (req, res) => {
  const message = new Message({
    leadId: req.body.leadId,
    content: req.body.content,
    type: req.body.type || "incoming",
  });

  try {
    const newMessage = await message.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Send a new message to a lead
router.post("/send", sendMessage);

// Webhook endpoint for receiving messages from Twilio
router.post("/webhook", receiveMessage);

// Get message history for a lead
router.get("/lead/:leadId", getMessages);

module.exports = router;
