const Message = require("../models/Message");
const Lead = require("../models/Lead");
const Settings = require("../models/Settings");
const twilioService = require("../services/twilioService");
const openaiService = require("../services/openaiService");
const logger = require("../utils/logger");
const followUpService = require("../services/followUpService");
const FollowUp = require("../models/FollowUp");
const settingsService = require("../services/settingsService");

const messageController = {
  // send test twilio message
  async testTwilio(req, res) {
    const twilioMessage = await twilioService.sendMessage(
      "+5571981265131",
      "test"
    );
    res.json({ message: twilioMessage });
  },

  // Send a message to a lead via Twilio
  async sendMessage(req, res) {
    try {
      const { leadId, text } = req.body;

      // Find the lead
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get the lead owner
      const userId = lead.userId;
      const settingsMap = await settingsService.getAllSettings(userId);

      // Send message via Twilio
      const twilioMessage = await twilioService.sendMessage(
        lead.phoneNumber,
        text
      );

      // Save message to database
      const message = await Message.create({
        leadId,
        text,
        sender: "agent",
        twilioSid: twilioMessage.sid,
      });

      // If AI Assistant is enabled for this lead, generate and send AI response
      if (lead.aiAssistantEnabled) {
        // Generate AI response
        const aiResponse = await openaiService.generateResponse(
          text,
          settingsMap
        );

        // Send AI response via Twilio
        const aiTwilioMessage = await twilioService.sendMessage(
          lead.phoneNumber,
          aiResponse
        );

        // Save AI response to database
        const aiMessage = await Message.create({
          leadId,
          text: aiResponse,
          sender: "agent",
          twilioSid: aiTwilioMessage.sid,
        });

        // Schedule follow-up after sending message
        await followUpService.scheduleFollowUp(leadId, new Date());

        res.json({ message, aiMessage });
      } else {
        res.json({ message });
      }
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

      // Get the lead owner
      const userId = lead.userId;
      const settingsMap = await settingsService.getAllSettings(userId);

      // Save incoming message
      const incomingMessage = await Message.create({
        leadId: lead.id,
        text: Body,
        sender: "lead",
        twilioSid: MessageSid,
      });

      // Only generate AI response if enabled for this lead
      if (lead.aiAssistantEnabled) {
        // Generate and send AI response
        const aiResponse = await openaiService.generateResponse(
          Body,
          settingsMap
        );
        const twilioMessage = await twilioService.sendMessage(From, aiResponse);

        // Save AI response
        const aiMessage = await Message.create({
          leadId: lead.id,
          text: aiResponse,
          sender: "agent",
          twilioSid: twilioMessage.sid,
        });

        // Cancel any pending follow-ups when lead responds
        await FollowUp.update(
          { status: "cancelled" },
          {
            where: {
              leadId: lead.id,
              status: "pending",
            },
          }
        );

        res.json({
          incomingMessage,
          aiMessage,
        });
      } else {
        res.json({
          incomingMessage,
        });
      }
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
        order: [["createdAt", "ASC"]],
      });

      res.json(messages);
    } catch (error) {
      logger.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },

  // Send a local message (for playground testing)
  async sendLocalMessage(req, res) {
    console.log("sendLocalMessage", req.body);
    try {
      const { text, previousMessages } = req.body;

      // Get current settings
      const settings = await Settings.findAll();
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      // Generate AI response
      const aiResponse = await openaiService.generateResponse(
        text,
        settingsMap,
        previousMessages
      );

      // Create response message
      const aiMessage = {
        id: Date.now(),
        text: aiResponse,
        sender: "agent",
        twilioSid: `local-response-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        useAiResponse: true,
      };

      res.json({ message: aiMessage });
    } catch (error) {
      logger.error("Error processing local message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  },

  // Status callback handler for Twilio
  async statusCallback(req, res) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

      // Get the messageId from query parameters
      const { messageId } = req.query;

      logger.info(
        `Received status callback for message ${messageId}: ${MessageStatus}`
      );

      if (messageId) {
        // Update by messageId instead of twilioSid
        const message = await Message.findByPk(messageId);

        if (message) {
          await message.update({
            twilioSid: MessageSid, // Save the SID if it wasn't saved before
            deliveryStatus: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
            statusUpdatedAt: new Date(),
          });

          logger.info(
            `Updated message ${messageId} status to ${MessageStatus}`
          );
        } else {
          logger.warn(`No message found with ID: ${messageId}`);
        }
      } else if (MessageSid) {
        // Fallback to updating by twilioSid if messageId is not provided
        const message = await Message.findOne({
          where: { twilioSid: MessageSid },
        });

        if (message) {
          await message.update({
            deliveryStatus: MessageStatus,
            errorCode: ErrorCode || null,
            errorMessage: ErrorMessage || null,
            statusUpdatedAt: new Date(),
          });

          logger.info(
            `Updated message by SID ${MessageSid} status to ${MessageStatus}`
          );
        } else {
          logger.warn(`No message found with Twilio SID: ${MessageSid}`);
        }
      } else {
        logger.warn("Status callback received without messageId or MessageSid");
      }

      res.status(200).send("Status callback received");
    } catch (error) {
      logger.error("Error processing status callback:", error);
      res.status(500).send("Error processing status callback");
    }
  },
};

module.exports = messageController;
