const Message = require("../models/Message");
const Lead = require("../models/Lead");
const twilio = require("twilio");
const OpenAI = require("openai");
const logger = require("../utils/logger");
const Settings = require("../models/Settings");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const messageController = {
  // Send a message to a lead
  async sendMessage(req, res) {
    try {
      const { leadId, text } = req.body;

      // Find the lead
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Send message via Twilio
      const twilioMessage = await client.messages.create({
        body: text,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: lead.phoneNumber,
      });

      // Save message to database
      const message = await Message.create({
        leadId,
        text,
        sender: "agent",
        twilioSid: twilioMessage.sid,
      });

      res.json(message);
    } catch (error) {
      logger.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  },

  // Receive and process incoming messages
  async receiveMessage(req, res) {
    try {
      const { From, Body, MessageSid } = req.body;

      // Find lead by phone number
      const lead = await Lead.findOne({ where: { phoneNumber: From } });
      if (!lead) {
        logger.warn(`Message received from unknown number: ${From}`);
        return res.status(404).json({ error: "Lead not found" });
      }

      // Save incoming message
      const incomingMessage = await Message.create({
        leadId: lead.id,
        text: Body,
        sender: "lead",
        twilioSid: MessageSid,
      });

      // Get current settings
      const settings = await Settings.findAll();
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a helpful real estate agent assistant acting as a real estate agent named "${settingsMap.AGENT_NAME}" 
              and are working for a company named "${settingsMap.COMPANY_NAME}", located in the city of ${settingsMap.AGENT_CITY}, ${settingsMap.AGENT_STATE}. 
              Your main goal is to help potential home buyers set an appointment with you to view a property,
              and to help with any questions they may have about the real estate market in ${settingsMap.AGENT_CITY}.
              Be professional, informative, and guide them towards taking the next step in their real estate journey.`,
          },
          {
            role: "user",
            content: Body,
          },
        ],
        max_tokens: 150,
      });

      const aiResponse = completion.choices[0].message.content;

      // Send AI response via Twilio
      const twilioResponse = await client.messages.create({
        body: aiResponse,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: From,
      });

      // Save AI response
      const aiMessage = await Message.create({
        leadId: lead.id,
        text: aiResponse,
        sender: "agent",
        twilioSid: twilioResponse.sid,
      });

      res.json({
        incomingMessage,
        aiMessage,
      });
    } catch (error) {
      logger.error("Error processing incoming message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  },

  // Get message history for a lead
  async getMessages(req, res) {
    try {
      const { leadId } = req.params;
      const messages = await Message.findAll({
        where: { leadId },
        order: [["timestamp", "ASC"]],
      });
      res.json(messages);
    } catch (error) {
      logger.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },

  // Local test endpoint that skips Twilio
  async sendLocalMessage(req, res) {
    try {
      const { text, previousMessages, leadContext } = req.body;

      console.log(
        "send local message api",
        text,
        previousMessages,
        leadContext
      );

      // Generate unique IDs using timestamps
      const timestamp = Date.now();
      const userMessageId = `local-test-${timestamp}-user`;
      const aiMessageId = `local-test-${timestamp}-ai`;

      // Create user message (no need to save to database for playground)
      const userMessage = {
        id: timestamp,
        text,
        sender: "user",
        twilioSid: userMessageId,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Get current settings
      const settings = await Settings.findAll(); // TO FIX: We want the settings to be for a single user, not all users
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      // Prepare conversation history for GPT
      const conversationHistory = [
        {
          role: "system",
          content: `You are a helpful real estate agent assistant acting as a real estate agent named "${
            settingsMap.AGENT_NAME
          }" 
            and are working for a company named "${
              settingsMap.COMPANY_NAME
            }", located in the city of ${settingsMap.AGENT_CITY}, ${
            settingsMap.AGENT_STATE
          }. 
            Your main goal is to help potential home buyers set an appointment with you to view a property,
            and to help with any questions they may have about the real estate market in ${
              settingsMap.AGENT_CITY
            }.
            Be professional, informative, and guide them towards taking the next step in their real estate journey.
            
            Lead Context: ${leadContext || "No specific context provided"}
            
            Please keep this context in mind while responding to the lead's messages.`,
        },
        ...previousMessages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        {
          role: "user",
          content: text,
        },
      ];

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: conversationHistory,
        max_tokens: 150,
      });

      const aiResponse = completion.choices[0].message.content;

      // Create AI message (no need to save to database for playground)
      const aiMessage = {
        id: timestamp + 1,
        text: aiResponse,
        sender: "agent",
        twilioSid: aiMessageId,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      logger.error("Error in local message test:", error);
      res.status(500).json({ error: "Failed to process local test message" });
    }
  },
};

module.exports = messageController;
