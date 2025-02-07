const Message = require("../models/Message");
const Lead = require("../models/Lead");
const twilio = require("twilio");
const OpenAI = require("openai");
const logger = require("../utils/logger");

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

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful real estate agent assistant. Your goal is to help potential buyers and sellers with their real estate needs. Be professional, informative, and guide them towards taking the next step in their real estate journey.",
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
};

module.exports = messageController;
