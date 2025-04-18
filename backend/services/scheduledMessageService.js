import Lead from "../models/Lead.js";
import openaiService from "./openaiService.js";
import twilioService from "./twilioService.js";
import logger from "../utils/logger.js";
import { Op } from "sequelize";
import Message from "../models/Message.js";
import userSettingsService from "./userSettingsService.js";
import DEFAULT_SETTINGS from "../config/defaultSettings.js";

// Follow-up intervals based on lead status (in days) - kept for backward compatibility
// These are the default values used only if user settings can't be retrieved
const STATUS_FOLLOW_UP_INTERVALS = {
  "New": 2,               // Follow up in 2 days if no response to initial message
  "In Conversation": 3,   // Follow up more frequently during active conversation
  "Qualified": 5,         // Follow up every 5 days once qualified
  "Appointment Set": 1,   // Follow up day before appointment
  "Converted": 14,        // Check in every 2 weeks after conversion
  "Inactive": 30          // Try again after 30 days for inactive leads
};

// Legacy follow-up intervals for backward compatibility - NO LONGER USED
// const FOLLOW_UP_INTERVALS = [7, 14, 30]; // 1 week, 2 weeks, 1 month

const scheduledMessageService = {
  /**
   * Get the follow-up interval based on lead status and user settings
   * @param {string} leadStatus - The lead status
   * @param {object} settings - User settings map
   * @returns {number} - Follow-up interval in days
   */
  getFollowUpInterval(leadStatus, settings = DEFAULT_SETTINGS) {
    // Default to 7 days if nothing matches
    let interval = 7;
    
    switch (leadStatus) {
      case "New":
        interval = settings.FOLLOW_UP_INTERVAL_NEW || STATUS_FOLLOW_UP_INTERVALS["New"];
        break;
      case "In Conversation":
        interval = settings.FOLLOW_UP_INTERVAL_IN_CONVERSATION || STATUS_FOLLOW_UP_INTERVALS["In Conversation"];
        break;
      case "Qualified":
        interval = settings.FOLLOW_UP_INTERVAL_QUALIFIED || STATUS_FOLLOW_UP_INTERVALS["Qualified"];
        break;
      case "Appointment Set":
        interval = settings.FOLLOW_UP_INTERVAL_APPOINTMENT_SET || STATUS_FOLLOW_UP_INTERVALS["Appointment Set"];
        break;
      case "Converted":
        interval = settings.FOLLOW_UP_INTERVAL_CONVERTED || STATUS_FOLLOW_UP_INTERVALS["Converted"];
        break;
      case "Inactive":
        interval = settings.FOLLOW_UP_INTERVAL_INACTIVE || STATUS_FOLLOW_UP_INTERVALS["Inactive"];
        break;
      default:
        logger.warn(`Unknown lead status: ${leadStatus}, defaulting to weekly follow-up`);
    }
    
    return interval;
  },

  async scheduleFollowUp(leadId, currentTime) {
    try {
      const lead = await Lead.findByPk(leadId);
      if (!lead || !lead.enableFollowUps) {
        logger.info(`Follow-up not scheduled for lead ${leadId} - follow-ups disabled or lead not found`);
        return { scheduled: false, reason: "follow-ups disabled" };
      }

      // Get user settings for the lead owner
      let settings = DEFAULT_SETTINGS;
      if (lead.userId) {
        settings = await userSettingsService.getAllSettings(lead.userId);
      }

      // Get the appropriate follow-up interval based on lead status and user settings
      const interval = this.getFollowUpInterval(lead.status, settings);
      
      // Calculate next message date
      const nextScheduledMessage = new Date(currentTime);
      nextScheduledMessage.setDate(nextScheduledMessage.getDate() + interval);
      
      // Update lead with next scheduled message
      await lead.update({ nextScheduledMessage });
      
      logger.info(`Scheduled follow-up for lead ${leadId} with status ${lead.status}: next contact in ${interval} days`);
      return { scheduled: true, interval: interval, nextDate: nextScheduledMessage };
      
    } catch (error) {
      logger.error(`Error scheduling follow-up for lead ${leadId}:`, error);
      throw error;
    }
  },

  async scheduleNextMessage(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);

      if (!lead || !lead.enableFollowUps) {
        return;
      }

      // Get user settings for the lead owner
      let settings = DEFAULT_SETTINGS;
      if (lead.userId) {
        settings = await userSettingsService.getAllSettings(lead.userId);
      }

      // Get the appropriate follow-up interval based on lead status and user settings
      const interval = this.getFollowUpInterval(lead.status, settings);

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
        // For all follow-up messages, use status-based intervals from user settings
        nextScheduledMessage = new Date(lead.lastMessageDate || new Date());
        nextScheduledMessage.setDate(
          nextScheduledMessage.getDate() + interval
        );
      }

      // Update lead with next scheduled message
      await lead.update({ nextScheduledMessage });

      logger.info(
        `Scheduled next message for lead ${leadId} (status: ${lead.status}) at ${nextScheduledMessage}, using interval of ${interval} days from user settings`
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
          // Get user settings for the lead owner
          let settings = DEFAULT_SETTINGS;
          if (lead.userId) {
            settings = await userSettingsService.getAllSettings(lead.userId);
          }

          // Get the appropriate follow-up interval based on lead status and user settings
          const followUpInterval = this.getFollowUpInterval(lead.status, settings);

          // Generate and send follow-up message
          const aiResponseData = await openaiService.generateResponse(
            `Generate follow-up message #${lead.messageCount + 1} for a lead with status "${lead.status}" who hasn't responded in ${followUpInterval} days. Keep it casual but professional.`,
            settings,
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
            messageCount: lead.messageCount + 1
          });

          // Schedule next message
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
          // Get user settings for the lead owner
          let settings = DEFAULT_SETTINGS;
          if (lead.userId) {
            settings = await userSettingsService.getAllSettings(lead.userId);
          }

          // Get the appropriate follow-up interval based on lead status and user settings
          const followUpInterval = this.getFollowUpInterval(lead.status, settings);

          // Generate message text
          const aiResponseData = await openaiService.generateResponse(
            `Generate follow-up message #${lead.messageCount + 1} for a lead with status "${lead.status}" who hasn't responded in ${followUpInterval} days. Keep it casual but professional. Use the same tone and style as previous messages.`,
            settings,
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
            isAiGenerated: true,
            deliveryStatus: "queued",
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
            await message.update({ deliveryStatus: "sent" });

            // Update lead record
            await lead.update({
              nextScheduledMessage: null,
              messageCount: lead.messageCount + 1,
              lastMessageDate: new Date()
            });

            logger.info(`Sent scheduled message to lead ${lead.id} with status ${lead.status}, using interval of ${followUpInterval} days`);
            
            // Schedule the next follow-up
            await this.scheduleNextMessage(lead.id);
          } catch (twilioError) {
            // Handle Twilio errors
            logger.error(
              `Twilio error for lead ${lead.id}: ${twilioError.message}`
            );

            // Update message status to failed
            await message.update({
              deliveryStatus: "failed",
              errorMessage: twilioError.message,
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

  // Utility function to reset a lead's next scheduled message based on status
  async resetScheduledMessage(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);
      
      if (!lead) {
        logger.error(`Lead ${leadId} not found for reset`);
        return { success: false, message: 'Lead not found' };
      }
      
      // Get the appropriate follow-up interval based on lead status
      const leadStatus = lead.status;
      let daysToAdd = 7; // Default to weekly
      
      if (STATUS_FOLLOW_UP_INTERVALS[leadStatus]) {
        daysToAdd = STATUS_FOLLOW_UP_INTERVALS[leadStatus];
      }
      
      // If there's a lastMessageDate, use that. Otherwise use current date
      const lastMessageDate = lead.lastMessageDate || new Date();
      const nextScheduledMessage = new Date(lastMessageDate);
      nextScheduledMessage.setDate(nextScheduledMessage.getDate() + daysToAdd);
      
      // Update lead with corrected next scheduled message
      await lead.update({ nextScheduledMessage });
      
      logger.info(
        `Reset next scheduled message for lead ${leadId} (status: ${lead.status}) to ${nextScheduledMessage}, using interval of ${daysToAdd} days`
      );
      
      return { 
        success: true, 
        message: `Next message scheduled for ${nextScheduledMessage}`,
        leadStatus: lead.status,
        interval: daysToAdd,
        lastMessageDate: lastMessageDate,
        nextMessageDate: nextScheduledMessage
      };
    } catch (error) {
      logger.error(`Error resetting scheduled message for lead ${leadId}:`, error);
      return { success: false, message: error.message };
    }
  }
};

export default scheduledMessageService;
