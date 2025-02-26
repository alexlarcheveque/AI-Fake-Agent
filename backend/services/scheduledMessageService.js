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
      const daysToAdd = FOLLOW_UP_INTERVALS[lead.messageCount];
      // Use createdAt for first message, lastMessageDate for subsequent messages
      const baseDate =
        lead.messageCount === 0 ? lead.createdAt : lead.lastMessageDate;
      const nextScheduledMessage = new Date(baseDate);
      nextScheduledMessage.setDate(nextScheduledMessage.getDate() + daysToAdd);

      // Update lead with next scheduled message
      await lead.update({
        nextScheduledMessage,
        // Don't increment messageCount until the message is actually sent
        messageCount: lead.messageCount,
      });

      logger.info(
        `Scheduled next message for lead ${leadId} at ${nextScheduledMessage}`
      );
    } catch (error) {
      logger.error(`Error scheduling next message for lead ${leadId}:`, error);
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
