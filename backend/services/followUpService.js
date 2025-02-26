const FollowUp = require("../models/FollowUp");
const Message = require("../models/Message");
const Lead = require("../models/Lead");
const openaiService = require("./openaiService");
const twilioService = require("./twilioService");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

// Follow-up intervals in days
const FOLLOW_UP_INTERVALS = [7, 14, 30]; // 1 week, 2 weeks, 1 month

const followUpService = {
  async scheduleFollowUp(leadId, lastMessageDate) {
    try {
      logger.info(`Attempting to schedule follow-up for lead ${leadId}`);

      // Check if follow-ups are enabled for this lead
      const lead = await Lead.findByPk(leadId);
      if (!lead || !lead.enableFollowUps) {
        logger.info(`Follow-ups not enabled for lead ${leadId}`);
        return;
      }

      // Get the count of previous follow-ups
      const followUpCount = await FollowUp.count({
        where: { leadId, status: "sent" },
      });

      logger.info(
        `Current follow-up count for lead ${leadId}: ${followUpCount}`
      );

      // If we've sent all follow-ups, don't schedule more
      if (followUpCount >= FOLLOW_UP_INTERVALS.length) {
        logger.info(`Maximum follow-ups reached for lead ${leadId}`);
        return;
      }

      // Calculate next follow-up date
      const daysToAdd = FOLLOW_UP_INTERVALS[followUpCount];
      const scheduledFor = new Date(lastMessageDate);
      scheduledFor.setDate(scheduledFor.getDate() + daysToAdd);

      // Create follow-up record
      const followUp = await FollowUp.create({
        leadId,
        scheduledFor,
        followUpNumber: followUpCount + 1,
        lastMessageDate,
      });

      logger.info(
        `Successfully scheduled follow-up ${followUp.id} for lead ${leadId} at ${scheduledFor}`
      );
    } catch (error) {
      logger.error("Error scheduling follow-up:", error);
    }
  },

  async processFollowUps() {
    try {
      // Get all pending follow-ups that are due
      const pendingFollowUps = await FollowUp.findAll({
        where: {
          status: "pending",
          scheduledFor: {
            [Op.lte]: new Date(),
          },
        },
        include: [Lead],
      });

      for (const followUp of pendingFollowUps) {
        // Check if there have been any messages since the last message date
        const hasNewMessages = await Message.findOne({
          where: {
            leadId: followUp.leadId,
            createdAt: {
              [Op.gt]: followUp.lastMessageDate,
            },
          },
        });

        // If there are new messages, cancel this follow-up
        if (hasNewMessages) {
          await followUp.update({ status: "cancelled" });
          continue;
        }

        // Generate and send follow-up message
        const followUpMessage = await openaiService.generateResponse(
          `Generate follow-up message #${
            followUp.followUpNumber
          } for a lead who hasn't responded in ${
            FOLLOW_UP_INTERVALS[followUp.followUpNumber - 1]
          } days. Keep it casual but professional.`,
          {},
          [] // No previous messages needed for follow-up
        );

        // Send message via Twilio
        const twilioMessage = await twilioService.sendMessage(
          followUp.Lead.phoneNumber,
          followUpMessage
        );

        // Save message to database
        await Message.create({
          leadId: followUp.leadId,
          text: followUpMessage,
          sender: "agent",
          twilioSid: twilioMessage.sid,
          useAiResponse: true,
        });

        // Update follow-up status
        await followUp.update({ status: "sent" });

        // Schedule next follow-up if available
        await this.scheduleFollowUp(followUp.leadId, new Date());
      }
    } catch (error) {
      logger.error("Error processing follow-ups:", error);
    }
  },
};

module.exports = followUpService;
