const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  receiveMessage,
} = require("../controllers/messageController");

// Get message history for a lead
router.get("/lead/:leadId", getMessages);

// Send a new message to a lead
router.post("/send", sendMessage);

// Webhook for receiving messages (for Twilio)
router.post("/receive", receiveMessage);

module.exports = router;
