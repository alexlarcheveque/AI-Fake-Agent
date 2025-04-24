const Appointment = require('../models/Appointment');
const Lead = require('../models/Lead');
const User = require('../models/User');
const logger = require('../utils/logger');
const { parse, addHours } = require('date-fns');

/**
 * Service to handle appointment-related operations
 */
const appointmentService = {
  /**
   * Create an appointment from detected appointment details in AI message
   * @param {number} leadId - The ID of the lead
   * @param {string} userId - The ID of the user (agent)
   * @param {Object} appointmentDetails - Object containing date and time
   * @param {string} appointmentDetails.date - The appointment date (MM/DD/YYYY)
   * @param {string} appointmentDetails.time - The appointment time (HH:MM AM/PM)
   * @returns {Promise<Object>} The created appointment
   */
  async createAppointment(leadId, userId, appointmentDetails) {
    try {
      logger.info('Creating appointment from AI detected details', { leadId, userId, appointmentDetails });
      
      if (!leadId || !appointmentDetails || !appointmentDetails.date || !appointmentDetails.time) {
        throw new Error('Missing required appointment details');
      }

      const { date, time } = appointmentDetails;
      
      // Find the lead to get their information
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        throw new Error(`Lead with ID ${leadId} not found`);
      }
      
      // Check for user - if userId is null, try to find a user with Google Calendar connected
      let user = null;
      if (userId) {
        user = await User.findByPk(userId);
      }

      // Parse the date and time
      const dateTimeString = `${date} ${time}`;
      let startDate;
      
      try {
        // Try parsing MM/DD/YYYY format
        startDate = parse(dateTimeString, 'MM/dd/yyyy h:mm aa', new Date());
        
        // Check if the date is valid
        if (isNaN(startDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (e) {
        try {
          // Try alternate format MM/DD/YYYY with 24-hour time
          startDate = parse(dateTimeString, 'MM/dd/yyyy HH:mm', new Date());
          
          if (isNaN(startDate.getTime())) {
            throw new Error('Invalid date format');
          }
        } catch (e2) {
          logger.error('Could not parse appointment date/time:', { date, time, error: e2.message });
          throw new Error(`Could not parse appointment date/time: ${date} ${time}`);
        }
      }
      
      // Calculate end time (1 hour from start)
      const endDate = addHours(startDate, 1);
      
      // Create a title for the appointment
      const title = `Meeting with ${lead.name}`;
      
      // Log detailed lead info for debugging
      logger.info(`Lead information for calendar integration:`, {
        leadId,
        hasEmail: !!lead.email,
        email: lead.email || 'none',
        phoneNumber: lead.phoneNumber,
        name: lead.name
      });
      
      // Create the appointment in the database
      const appointment = await Appointment.create({
        leadId,
        userId: userId || (user ? user.id : null), // Use the found user's ID if available
        title,
        startTime: startDate,
        endTime: endDate,
        location: 'To be determined',
        description: `Appointment automatically created from AI conversation with ${lead.name}`,
        status: 'scheduled'
      });
      
      logger.info(`Created appointment in database:`, {
        appointmentId: appointment.id,
        date,
        time,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      });
      
      return appointment;
    } catch (error) {
      logger.error('Error creating appointment from AI:', error);
      throw error;
    }
  },
  
  /**
   * Delete an appointment
   * @param {number} appointmentId - The ID of the appointment to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteAppointment(appointmentId) {
    try {
      logger.info(`Deleting appointment ${appointmentId}`);
      
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        throw new Error(`Appointment with ID ${appointmentId} not found`);
      }
      
      // Delete from Google Calendar if connected
      if (appointment.googleCalendarEventId && appointment.userId) {
        try {
          const user = await User.findByPk(appointment.userId);
          
          if (user && user.googleCalendarConnected) {
            logger.info('Deleting Google Calendar event', {
              eventId: appointment.googleCalendarEventId
            });
            
            await googleCalendarService.deleteEvent(
              appointment.userId,
              appointment.googleCalendarEventId
            );
            
            logger.info('Google Calendar event deleted successfully');
          } else {
            logger.warn('Cannot delete Google Calendar event - user not connected');
          }
        } catch (calendarError) {
          logger.error('Failed to delete Google Calendar event:', calendarError);
          // Continue even if calendar deletion fails
        }
      }
      
      // Delete the appointment from the database
      await appointment.destroy();
      
      return true;
    } catch (error) {
      logger.error(`Error deleting appointment ${appointmentId}:`, error);
      throw error;
    }
  }
};

module.exports = appointmentService; 