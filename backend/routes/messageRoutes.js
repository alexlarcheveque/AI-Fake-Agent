const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  receiveMessage,
  sendLocalMessage,
} = require("../controllers/messageController");

// Get message history for a lead
router.get("/lead/:leadId", getMessages);

// Send a message to a lead (with optional AI response)
router.post("/send", sendMessage);

// Send a local message (for playground testing)
router.post("/send-local", sendLocalMessage);

// Webhook for receiving messages (for Twilio)
router.post("/receive", receiveMessage);

module.exports = router;
