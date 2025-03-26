const Lead = require("../models/Lead");
const openaiService = require("./openaiService");
const twilioService = require("./twilioService");
const logger = require("../utils/logger");
const { Op } = require("sequelize");
const Message = require("../models/Message");

// Follow-up intervals in days
const FOLLOW_UP_INTERVALS = [7, 14, 30]; // 1 week, 2 weeks, 1 month

const scheduledMessageService = {
  async scheduleNextMessage(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);

      if (!lead || !lead.enableFollowUps) {
        return;
      }

      // If we've sent all follow-ups, don't schedule more
      if (lead.messageCount >= FOLLOW_UP_INTERVALS.length) {
        return;
      }

      // Calculate next message date
      let nextScheduledMessage;

      // For the first message (messageCount = 0)
      if (lead.messageCount === 0) {
        nextScheduledMessage = new Date();

        // Apply the first message timing preference
        switch (lead.firstMessageTiming) {
          case "next_day":
            nextScheduledMessage.setDate(nextScheduledMessage.getDate() + 1);
            break;
          case "one_week":
            nextScheduledMessage.setDate(nextScheduledMessage.getDate() + 7);
            break;
          case "two_weeks":
            nextScheduledMessage.setDate(nextScheduledMessage.getDate() + 14);
            break;
          case "immediate":
          default:
            // Keep the current date for immediate sending
            break;
        }
      } else {
        // For follow-up messages, use the existing logic
        const daysToAdd = FOLLOW_UP_INTERVALS[lead.messageCount - 1];
        nextScheduledMessage = new Date(lead.lastMessageDate);
        nextScheduledMessage.setDate(
          nextScheduledMessage.getDate() + daysToAdd
        );
      }

      // Update lead with next scheduled message
      await lead.update({ nextScheduledMessage });

      logger.info(
        `Scheduled next message for lead ${leadId} at ${nextScheduledMessage}`
      );
    } catch (error) {
      logger.error(`Error scheduling next message for lead ${leadId}:`, error);
      throw error;
    }
  },

  async processScheduledMessages() {
    try {
      // Get all leads with due messages
      const leads = await Lead.findAll({
        where: {
          nextScheduledMessage: {
            [Op.lte]: new Date(),
          },
          enableFollowUps: true,
        },
      });

      for (const lead of leads) {
        try {
          // Generate and send follow-up message
          const aiResponseData = await openaiService.generateResponse(
            `Generate follow-up message #${
              lead.messageCount
            } for a lead who hasn't responded in ${
              FOLLOW_UP_INTERVALS[lead.messageCount - 1]
            } days. Keep it casual but professional.`,
            {},
            [] // No previous messages needed for follow-up
          );

          // Check if aiResponseData contains appointment details
          let aiResponseText;
          if (typeof aiResponseData === 'object' && aiResponseData.text) {
            // It's the new format with appointment details - for follow-ups we don't need the details
            aiResponseText = aiResponseData.text;
          } else {
            // It's just a string (old format or no appointment detected)
            aiResponseText = aiResponseData;
          }

          // Send message via Twilio
          await twilioService.sendMessage(lead.phoneNumber, aiResponseText);

          // Update lead
          await lead.update({
            lastMessageDate: new Date(),
            nextScheduledMessage: null, // Clear the scheduled message after sending
          });

          // Schedule next message if available
          await this.scheduleNextMessage(lead.id);
        } catch (error) {
          logger.error(
            `Error processing scheduled message for lead ${lead.id}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error("Error processing scheduled messages:", error);
    }
  },

  async checkAndSendScheduledMessages() {
    try {
      const now = new Date();

      // Find leads with scheduled messages that are due
      const leadsWithDueMessages = await Lead.findAll({
        where: {
          nextScheduledMessage: {
            [Op.not]: null,
            [Op.lte]: now, // Less than or equal to current time
          },
          archived: false,
        },
      });

      logger.info(
        `Found ${leadsWithDueMessages.length} leads with messages due to be sent`
      );

      // Send messages for each lead
      for (const lead of leadsWithDueMessages) {
        try {
          // Generate message text
          const aiResponseData = await openaiService.generateResponse(
            `Generate follow-up message #${
              lead.messageCount
            } for a lead who hasn't responded in ${
              FOLLOW_UP_INTERVALS[lead.messageCount - 1]
            } days. Keep it casual but professional.`,
            {},
            [] // No previous messages needed
          );

          // Check if aiResponseData contains appointment details
          let messageText;
          if (typeof aiResponseData === 'object' && aiResponseData.text) {
            // It's the new format with appointment details
            messageText = aiResponseData.text;
          } else {
            // It's just a string (old format or no appointment detected)
            messageText = aiResponseData;
          }

          // Create message record
          const message = await Message.create({
            leadId: lead.id,
            text: messageText,
            sender: "agent",
            status: "scheduled",
            direction: "outbound",
          });

          // Try to send the message via Twilio
          try {
            await twilioService.sendMessage(
              lead.phoneNumber,
              messageText,
              message.id
            );

            // Update message status to sent
            await message.update({ status: "sent" });

            // Update lead record
            await lead.update({
              nextScheduledMessage: null,
              messageCount: lead.messageCount + 1,
            });

            logger.info(`Sent scheduled message to lead ${lead.id}`);
          } catch (twilioError) {
            // Handle Twilio errors
            logger.error(
              `Twilio error for lead ${lead.id}: ${twilioError.message}`
            );

            // Update message status to failed
            await message.update({
              status: "failed",
              statusDetails: twilioError.message,
            });

            // Don't update the lead's nextScheduledMessage so we can try again later
          }
        } catch (error) {
          logger.error(
            `Error sending scheduled message to lead ${lead.id}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error("Error checking for scheduled messages:", error);
    }
  },
};

module.exports = scheduledMessageService;
