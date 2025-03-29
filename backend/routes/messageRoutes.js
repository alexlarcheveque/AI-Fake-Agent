const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const Lead = require("../models/Lead");
const Message = require("../models/Message");

// Get all messages with optional status filter
router.get("/", messageController.getAllMessages);

// Debug endpoint for checking recently sent messages
router.get("/debug/recent/:leadId", messageController.getRecentMessages);

// Get message history for a lead
router.get("/lead/:leadId", messageController.getMessages);

// Send a message to a lead (with optional AI response)
router.post("/send", messageController.sendMessage);

// Send a local message (for playground testing)
router.post("/send-local", messageController.sendLocalMessage);

// Webhook for receiving messages (for Twilio)
router.post("/receive", (req, res) => {
  console.log("Received incoming message webhook:", {
    body: req.body,
    headers: req.headers,
    method: req.method,
  });

  messageController.receiveMessage(req, res);
});

// Test Twilio
router.post("/test-twilio", messageController.testTwilio);

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

// Add a simple test endpoint
router.get("/test", (req, res) => {
  res.status(200).send("Webhook endpoint is working");
});

// Add a socket test endpoint
router.post("/test-socket", (req, res) => {
  try {
    const { leadId, text = "This is a test message from the server" } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }
    
    // Ensure leadId is a number
    const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
    
    // Get socket io instance
    const io = req.app.get("io");
    
    if (!io) {
      return res.status(500).json({ error: "Socket.io instance not available" });
    }
    
    // Create a test message
    const testMessage = {
      id: Date.now(),
      leadId: numericLeadId,
      text,
      sender: "lead",
      direction: "inbound",
      createdAt: new Date().toISOString(),
      isAiGenerated: false,
      deliveryStatus: "delivered"
    };
    
    // Log the test message
    console.log("Emitting test socket message:", JSON.stringify(testMessage, null, 2));
    console.log("Socket state:", {
      connected: !!io,
      numClients: io.engine ? io.engine.clientsCount : 'unknown'
    });
    
    // Emit the test message - ensure consistent type format
    const socketPayload = {
      leadId: numericLeadId,
      message: testMessage
    };
    console.log("Full socket payload:", JSON.stringify(socketPayload, null, 2));
    
    // Use io.sockets.emit to make sure all connected clients get the message
    io.sockets.emit("new-message", socketPayload, (confirmation) => {
      console.log(`Socket message delivery confirmation:`, confirmation);
    });
    
    // Return success
    res.json({ 
      success: true,
      message: "Test message emitted via socket",
      socketPayload,
      testMessage
    });
  } catch (error) {
    console.error("Error in test-socket endpoint:", error);
    res.status(500).json({ error: "Failed to emit test message" });
  }
});

// Add a test endpoint for creating a real AI message
router.post("/simulate-ai-response", async (req, res) => {
  try {
    const { leadId, text = "This is a simulated AI response message." } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }
    
    // Ensure leadId is a number
    const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
    
    // Find the lead
    const lead = await Lead.findByPk(numericLeadId);
    
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    // Create a real message in the database
    const aiMessage = await Message.create({
      leadId: numericLeadId,
      text,
      sender: "agent",
      direction: "outbound",
      isAiGenerated: true,
      deliveryStatus: "delivered",
      twilioSid: `test-${Date.now()}`
    });
    
    // Get socket io instance
    const io = req.app.get("io");
    
    if (io) {
      console.log("Emitting simulated AI response:", aiMessage.id);
      
      // Format message with all necessary fields
      const messagePayload = {
        id: aiMessage.id,
        leadId: numericLeadId,
        text: aiMessage.text,
        sender: aiMessage.sender,
        direction: aiMessage.direction,
        createdAt: aiMessage.createdAt,
        leadName: lead.name || 'Unknown Lead',
        phoneNumber: lead.phoneNumber || 'Unknown',
        deliveryStatus: aiMessage.deliveryStatus,
        isAiGenerated: true,
        twilioSid: aiMessage.twilioSid
      };
      
      // Log complete message data for debugging
      console.log("Formatted AI message payload:", JSON.stringify(messagePayload, null, 2));
      
      // Create socket emission payload
      const socketPayload = {
        leadId: numericLeadId,
        message: messagePayload
      };
      
      console.log("Full socket payload:", JSON.stringify(socketPayload, null, 2));
      console.log("Socket state:", {
        connected: !!io, 
        numClients: io.engine ? io.engine.clientsCount : 'unknown'
      });
      
      // Use io.sockets.emit to make sure all connected clients get the message
      io.sockets.emit("new-message", socketPayload, (confirmation) => {
        console.log(`Socket AI message delivery confirmation:`, confirmation);
      });
      
      console.log("Simulated AI response emitted via socket");
    } else {
      console.warn("Socket.io instance not available - unable to emit message");
    }
    
    // Return success with complete data
    res.json({
      success: true, 
      message: "Simulated AI response created and emitted",
      aiMessage,
      socketState: {
        available: !!io,
        clients: io && io.engine ? io.engine.clientsCount : 0
      }
    });
  } catch (error) {
    console.error("Error simulating AI response:", error);
    res.status(500).json({ error: "Failed to simulate AI response", details: error.message });
  }
});

module.exports = router;
