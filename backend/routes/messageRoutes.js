const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const Lead = require("../models/Lead");
const Message = require("../models/Message");

// Get message history for a lead
router.get("/lead/:leadId", messageController.getMessages);

// Send a message to a lead (with optional AI response)
router.post("/send", messageController.sendMessage);

// Send a local message (for playground testing)
router.post("/send-local", messageController.sendLocalMessage);

// Webhook for receiving messages (for Twilio)
router.post("/receive", messageController.receiveMessage);

// Test Twilio
router.post("/test-twilio", messageController.testTwilio);

// Add this route for status callbacks
router.post("/status-callback", messageController.statusCallback);

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

// Add these routes to your existing messageRoutes.js
router.get("/stats", messageController.getMessageStats);
router.get("/scheduled", messageController.getScheduledMessages);

// Add this route for testing
router.post("/webhook-test", (req, res) => {
  console.log("Webhook test received:", {
    body: req.body,
    headers: req.headers,
    method: req.method,
  });
  res.status(200).send("Test webhook received");
});

// Add this route for testing incoming messages
router.post("/simulate-incoming", async (req, res) => {
  try {
    const { phoneNumber, text } = req.body;

    if (!phoneNumber || !text) {
      return res
        .status(400)
        .json({ error: "Phone number and text are required" });
    }

    // Find the lead by phone number
    const lead = await Lead.findOne({
      where: { phoneNumber },
    });

    if (!lead) {
      return res
        .status(404)
        .json({ error: "No lead found with this phone number" });
    }

    // Create the message record
    const message = await Message.create({
      leadId: lead.id,
      text,
      sender: "lead",
      direction: "inbound",
      deliveryStatus: "delivered",
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error("Error simulating incoming message:", error);
    res.status(500).json({ error: "Failed to simulate incoming message" });
  }
});

module.exports = router;
