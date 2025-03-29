const Lead = require("../models/Lead");
const Message = require("../models/Message");
const Appointment = require("../models/Appointment");
const scheduledMessageService = require("./scheduledMessageService");
const logger = require("../utils/logger");
const { Op } = require("sequelize");

/**
 * Service that handles lead status transitions and related automation
 */
const leadStatusService = {
  /**
   * Automatically update lead status based on message activity
   * @param {number} leadId - The ID of the lead
   * @param {string} messageText - The text of the received message (optional)
   * @param {string} sender - Who sent the message (lead or agent)
   */
  async updateStatusBasedOnMessage(leadId, messageText = "", sender) {
    try {
      console.log(`[DEBUG] Starting updateStatusBasedOnMessage for leadId=${leadId}, sender=${sender}`);
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        logger.error(`Lead not found with ID: ${leadId}`);
        return null;
      }

      console.log(`[DEBUG] Lead found: ${JSON.stringify({
        id: lead.id,
        status: lead.status,
        name: lead.name,
        phone: lead.phone
      })}`);

      logger.info(`Processing message from ${sender} for lead ${leadId} with current status ${lead.status}`);

      // Keep original case for the response
      let newStatus = lead.status;
      // Convert to lowercase for comparison only
      const currentStatusLower = (lead.status || '').toLowerCase(); 

      console.log(`[DEBUG] Evaluating status conditions: sender=${sender}, currentStatusLower=${currentStatusLower} (original=${lead.status})`);

      // If this is a lead's first response, change status to "In Conversation"
      if (sender === "lead" && (currentStatusLower === "new" || lead.status === "New")) {
        console.log(`[DEBUG] Condition met: sender=lead && status matches "New"`);
        newStatus = "In Conversation"; // Use proper casing to match model validation
        logger.info(`Lead ${leadId} status changed: ${lead.status} -> ${newStatus}`);
      }

      // If lead was inactive and responds, move back to "In Conversation"
      if (sender === "lead" && (currentStatusLower === "inactive" || lead.status === "Inactive")) {
        console.log(`[DEBUG] Condition met: sender=lead && status matches "Inactive"`);
        newStatus = "In Conversation"; // Use proper casing to match model validation
        logger.info(`Lead ${leadId} status changed: ${lead.status} -> ${newStatus}`);
      }

      // Only update if status changed
      if (newStatus !== lead.status) {
        console.log(`[DEBUG] Status change detected: ${lead.status} -> ${newStatus}. Updating database.`);
        logger.info(`Updating lead ${leadId} status in database: ${lead.status} -> ${newStatus}`);
        
        try {
          await lead.update({ status: newStatus });
          console.log(`[DEBUG] Successfully updated lead status in database to ${newStatus}`);
        } catch (updateError) {
          console.error(`[DEBUG ERROR] Failed to update lead status:`, updateError);
          logger.error(`Failed to update lead status: ${updateError.message}`);
          // If there's a validation error, try with different casing
          if (updateError.name === 'SequelizeValidationError') {
            console.log(`[DEBUG] Attempting to fix validation error by adjusting case`);
            // Make sure the status is one of the valid options with correct casing
            const validStatuses = ["New", "In Conversation", "Qualified", "Appointment Set", "Converted", "Inactive"];
            const matchedStatus = validStatuses.find(s => s.toLowerCase() === newStatus.toLowerCase());
            if (matchedStatus) {
              console.log(`[DEBUG] Found matching valid status: ${matchedStatus}`);
              await lead.update({ status: matchedStatus });
              console.log(`[DEBUG] Successfully updated lead status with corrected casing to ${matchedStatus}`);
              newStatus = matchedStatus;
            }
          } else {
            throw updateError;
          }
        }
        
        // Schedule appropriate follow-up based on new status
        console.log(`[DEBUG] Scheduling follow-up for new status: ${newStatus}`);
        await scheduledMessageService.scheduleFollowUp(leadId, new Date());
        logger.info(`Updated follow-up schedule for lead ${leadId} based on new status ${newStatus}`);
      } else {
        console.log(`[DEBUG] No status change needed: currentStatus=${lead.status}, newStatus=${newStatus}`);
        logger.info(`No status change needed for lead ${leadId}, keeping status as ${lead.status}`);
      }

      return lead;
    } catch (error) {
      console.error(`[DEBUG ERROR] Error in updateStatusBasedOnMessage:`, error);
      logger.error(`Error updating lead status based on message for lead ${leadId}:`, error);
      throw error;
    }
  },

  /**
   * Check for inactive leads and update their status
   * @returns {Promise<number>} - Number of leads marked inactive
   */
  async markInactiveLeads() {
    try {
      // Find leads that haven't had a message in 7+ days and aren't already Inactive
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const leads = await Lead.findAll({
        where: {
          lastMessageDate: {
            [Op.lt]: sevenDaysAgo,
          },
          status: {
            [Op.notIn]: ["Inactive", "Converted", "Appointment Set"]
          },
          archived: false
        },
      });

      logger.info(`Found ${leads.length} leads to mark as inactive`);

      // Update leads to Inactive status
      for (const lead of leads) {
        logger.info(`Marking lead ${lead.id} as inactive (last message on ${lead.lastMessageDate})`);
        await lead.update({ 
          status: "Inactive",
          // Ensure we have a lastMessageDate set if it was null before
          lastMessageDate: lead.lastMessageDate || new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
        });
        
        // Schedule re-engagement message
        await scheduledMessageService.scheduleFollowUp(lead.id, new Date());
      }

      return leads.length;
    } catch (error) {
      logger.error("Error marking inactive leads:", error);
      throw error;
    }
  },

  /**
   * Update lead status when appointment is created or updated
   * @param {number} leadId - The ID of the lead
   * @param {Appointment} appointment - The appointment object
   */
  async updateStatusForAppointment(leadId, appointment) {
    try {
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        logger.error(`Lead not found with ID: ${leadId}`);
        return null;
      }

      // Set status to "Appointment Set" when appointment is created/scheduled
      if (appointment.status === "scheduled") {
        await lead.update({ status: "Appointment Set" });
        logger.info(`Lead ${leadId} status updated to Appointment Set`);
      }
      
      // Set status to "Converted" when appointment is completed
      if (appointment.status === "completed") {
        await lead.update({ status: "Converted" });
        logger.info(`Lead ${leadId} status updated to Converted`);
      }

      return lead;
    } catch (error) {
      logger.error(`Error updating lead status for appointment for lead ${leadId}:`, error);
      throw error;
    }
  },

  /**
   * Manually mark a lead as qualified
   * @param {number} leadId - The ID of the lead
   */
  async markAsQualified(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        logger.error(`Lead not found with ID: ${leadId}`);
        return null;
      }

      await lead.update({ status: "Qualified" });
      logger.info(`Lead ${leadId} manually marked as Qualified`);
      
      // Schedule appropriate follow-up based on new status
      await scheduledMessageService.scheduleFollowUp(leadId, new Date());
      
      return lead;
    } catch (error) {
      logger.error(`Error marking lead ${leadId} as qualified:`, error);
      throw error;
    }
  }
};

module.exports = leadStatusService; 