const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

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

// Add this route to your messageRoutes.js file
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

module.exports = router;
