const Message = require("../models/Message");
const Lead = require("../models/Lead");
const UserSettings = require("../models/UserSettings");
const twilioService = require("../services/twilioService");
const openaiService = require("../services/openaiService");
const logger = require("../utils/logger");
const followUpService = require("../services/followUpService");
const FollowUp = require("../models/FollowUp");
const userSettingsService = require("../services/userSettingsService");
const { Op } = require("sequelize");
const sequelize = require("sequelize");

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
      // Log the entire request body for debugging
      console.log("Received message request:", req.body);

      const { leadId, text, isAiGenerated = false } = req.body;

      // Validate inputs with detailed error messages
      if (!leadId) {
        return res.status(400).json({ error: "leadId is required" });
      }

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          error: "text must be a non-empty string",
          received: {
            type: typeof text,
            value: text,
          },
        });
      }

      // Find the lead with error handling
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        return res.status(404).json({
          error: "Lead not found",
          leadId: leadId,
        });
      }

      // Get the lead owner
      const userId = lead.userId;
      const settingsMap = await userSettingsService.getAllSettings(userId);

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
        isAiGenerated,
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
          isAiGenerated: true,
        });

        // Schedule follow-up after sending message
        await followUpService.scheduleFollowUp(leadId, new Date());

        res.json({ message, aiMessage });
      } else {
        res.json({ message });
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      res.status(500).json({
        error: "Failed to send message",
        details: error.message,
      });
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
      const settingsMap = await userSettingsService.getAllSettings(userId);

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
          isAiGenerated: true,
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
      const settings = await UserSettings.findOne({ where: { userId } });
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
        isAiGenerated: true,
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

      if (messageId && messageId !== "null" && messageId !== "undefined") {
        // Convert messageId to integer if it's a valid number
        const parsedId = parseInt(messageId, 10);

        if (!isNaN(parsedId)) {
          // Update by messageId
          const message = await Message.findByPk(parsedId);

          if (message) {
            await message.update({
              twilioSid: MessageSid,
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
        } else {
          logger.warn(`Invalid message ID format: ${messageId}`);
        }
      } else if (MessageSid) {
        // Fallback to updating by twilioSid
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

  // Get message statistics
  async getMessageStats(req, res) {
    try {
      // Count total messages
      const totalMessages = await Message.count();

      // Count delivered messages
      const deliveredMessages = await Message.count({
        where: { deliveryStatus: "delivered" },
      });

      // Count failed messages
      const failedMessages = await Message.count({
        where: {
          deliveryStatus: {
            [Op.in]: ["failed", "undelivered"],
          },
        },
      });

      // Count active conversations (leads with at least one message in the last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Use Sequelize's built-in methods instead of raw queries
      const activeConversations = await Message.findAll({
        attributes: [
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn("DISTINCT", sequelize.col("leadId"))
            ),
            "count",
          ],
        ],
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo,
          },
        },
        raw: true,
      });

      res.json({
        totalMessages,
        deliveredMessages,
        failedMessages,
        activeConversations: activeConversations[0]?.count || 0,
      });
    } catch (error) {
      logger.error("Error getting message stats:", error);
      res.status(500).json({ error: "Failed to get message statistics" });
    }
  },

  // Get scheduled messages for calendar
  async getScheduledMessages(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "Start date and end date are required" });
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      logger.info(`Fetching scheduled messages from ${start} to ${end}`);

      // Get messages sent in the date range using proper Sequelize methods
      const messages = await Message.findAll({
        where: {
          createdAt: {
            [Op.between]: [start, end],
          },
          sender: "agent", // Only outbound messages
        },
        include: [
          {
            model: Lead,
            attributes: ["id", "name"],
            required: false, // Make this a LEFT JOIN instead of INNER JOIN
          },
        ],
        order: [["createdAt", "ASC"]],
        limit: 100, // Limit to prevent performance issues
      });

      // Format the response
      const formattedMessages = messages.map((message) => ({
        id: message.id,
        leadId: message.leadId,
        scheduledFor: message.createdAt,
        status: message.deliveryStatus || "unknown",
        leadName: message.Lead?.name || "Unknown Lead",
        messageType: message.isFirstMessage ? "first" : "followup",
        messageCount: message.messageCount || 1,
      }));

      res.json(formattedMessages);
    } catch (error) {
      logger.error("Error getting scheduled messages:", error);
      res.status(500).json({ error: "Failed to get scheduled messages" });
    }
  },
};

module.exports = messageController;
