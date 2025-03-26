const Appointment = require('../models/Appointment');
const Lead = require('../models/Lead');
const User = require('../models/User');
const logger = require('../utils/logger');
const { parse, addHours } = require('date-fns');
// Import the updated Google Calendar service
const googleCalendarService = require('./googleCalendarService');

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
  async createAppointmentFromAI(leadId, userId, appointmentDetails) {
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
      } else {
        logger.warn(`No userId provided for appointment creation. Looking for a user with Google Calendar connected.`);
        // Find the first user with Google Calendar connected
        user = await User.findOne({ 
          where: { 
            googleCalendarConnected: true 
          }
        });
        
        if (user) {
          logger.info(`Found user ${user.id} with Google Calendar connected. Using their credentials.`);
          // Update the lead to associate it with this user
          await lead.update({ userId: user.id });
          logger.info(`Updated lead ${leadId} to be associated with user ${user.id}`);
        } else {
          logger.warn(`No user with Google Calendar connected found. Using default system settings.`);
        }
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
      
      // Create Google Calendar event if the user exists and has connected their account
      if (user && user.googleCalendarConnected) {
        try {
          logger.info('User has Google Calendar connected, creating calendar event', {
            userId: user.id,
            googleCalendarConnected: user.googleCalendarConnected
          });
          
          // Prepare attendees - add lead's email if available
          const attendees = [];
          if (lead.email) {
            attendees.push(lead.email);
          }
          
          // Create event in Google Calendar using OAuth
          const calendarResult = await googleCalendarService.createEvent(
            user.id, // Use user.id directly instead of userId which could be null
            {
              title,
              description: `Appointment with ${lead.name} (Phone: ${lead.phoneNumber})`,
              startTime: startDate,
              endTime: endDate,
              location: 'To be determined',
              attendees
            }
          );
          
          logger.info('Google Calendar event created successfully:', calendarResult);
          
          // Update the appointment with Google Calendar information
          await appointment.update({
            googleCalendarEventId: calendarResult.eventId,
            googleCalendarEventLink: calendarResult.eventLink,
            googleCalendarEventStatus: calendarResult.eventStatus
          });
          
          logger.info('Appointment updated with Google Calendar information');
        } catch (calendarError) {
          logger.error('Failed to create Google Calendar event:', {
            error: calendarError.message,
            stack: calendarError.stack
          });
          // Continue without Google Calendar integration if it fails
        }
      } else {
        logger.info('No user or Google Calendar connection, skipping calendar integration');
      }
      
      return appointment;
    } catch (error) {
      logger.error('Error creating appointment from AI:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing appointment
   * @param {number} appointmentId - The ID of the appointment to update
   * @param {Object} updatedDetails - The updated appointment details
   * @returns {Promise<Object>} The updated appointment
   */
  async updateAppointment(appointmentId, updatedDetails) {
    try {
      logger.info(`Updating appointment ${appointmentId}`, updatedDetails);
      
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        throw new Error(`Appointment with ID ${appointmentId} not found`);
      }
      
      // Update the appointment in the database
      await appointment.update(updatedDetails);
      
      // Update Google Calendar event if it exists
      if (appointment.googleCalendarEventId && appointment.userId) {
        try {
          const user = await User.findByPk(appointment.userId);
          
          if (user && user.googleCalendarConnected) {
            logger.info('Updating Google Calendar event', {
              eventId: appointment.googleCalendarEventId
            });
            
            await googleCalendarService.updateEvent(
              appointment.userId,
              appointment.googleCalendarEventId,
              {
                title: appointment.title,
                description: appointment.description,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                location: appointment.location
              }
            );
            
            logger.info('Google Calendar event updated successfully');
          } else {
            logger.warn('Cannot update Google Calendar event - user not connected');
          }
        } catch (calendarError) {
          logger.error('Failed to update Google Calendar event:', calendarError);
          // Continue even if calendar update fails
        }
      }
      
      return appointment;
    } catch (error) {
      logger.error(`Error updating appointment ${appointmentId}:`, error);
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