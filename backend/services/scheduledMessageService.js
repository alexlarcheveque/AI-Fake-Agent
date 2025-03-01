const Lead = require("../models/Lead");
const openaiService = require("./openaiService");
const twilioService = require("./twilioService");
const logger = require("../utils/logger");
const { Op } = require("sequelize");

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
          const followUpMessage = await openaiService.generateResponse(
            `Generate follow-up message #${
              lead.messageCount
            } for a lead who hasn't responded in ${
              FOLLOW_UP_INTERVALS[lead.messageCount - 1]
            } days. Keep it casual but professional.`,
            {},
            [] // No previous messages needed for follow-up
          );

          // Send message via Twilio
          await twilioService.sendMessage(lead.phoneNumber, followUpMessage);

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
};

module.exports = scheduledMessageService;
