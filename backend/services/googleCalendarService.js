const { google } = require('googleapis');
const googleOAuthService = require('./googleOAuthService');
const logger = require('../utils/logger');

class GoogleCalendarService {
  constructor() {
    console.log('Initializing Google Calendar service with OAuth support');
  }

  /**
   * Create a Google Calendar event for a user
   * @param {string} userId - The ID of the user
   * @param {object} appointmentDetails - The appointment details
   * @returns {Promise<object>} The created event
   */
  async createEvent(userId, appointmentDetails) {
    try {
      console.log(`Creating Google Calendar event for user ${userId}`);
      
      // Get the OAuth client for this user
      const authClient = await googleOAuthService.getAuthClientForUser(userId);
      
      // Initialize the calendar API with the user's credentials
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      
      const {
        title,
        description,
        startTime,
        endTime,
        location,
        attendees = []
      } = appointmentDetails;
      
      // Make sure we have valid date objects
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Prepare attendee emails in the format Google Calendar expects
      const formattedAttendees = attendees.map(email => ({ email }));
      
      // Create the event object
      const event = {
        summary: title,
        description: description || `Appointment with ${title}`,
        start: {
          dateTime: start.toISOString(),
          timeZone: 'America/Los_Angeles', // Replace with dynamic timezone if needed
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'America/Los_Angeles', // Replace with dynamic timezone if needed
        },
        location: location || 'Virtual Meeting',
        attendees: formattedAttendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      };
      
      console.log('Creating calendar event with details:', {
        summary: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        attendeesCount: event.attendees.length
      });
      
      // Insert the event
      const response = await calendar.events.insert({
        calendarId: 'primary', // Use the user's primary calendar
        resource: event,
        sendUpdates: 'all', // Send emails to attendees
      });
      
      console.log(`Event created: ${response.data.htmlLink}`);
      
      return {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        eventStatus: response.data.status,
        created: true
      };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing Google Calendar event
   * @param {string} userId - The ID of the user
   * @param {string} eventId - The Google Calendar event ID
   * @param {object} updatedDetails - The updated appointment details
   * @returns {Promise<object>} The updated event
   */
  async updateEvent(userId, eventId, updatedDetails) {
    try {
      console.log(`Updating Google Calendar event ${eventId} for user ${userId}`);
      
      // Get the OAuth client for this user
      const authClient = await googleOAuthService.getAuthClientForUser(userId);
      
      // Initialize the calendar API with the user's credentials
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      
      // First get the existing event
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });
      
      // Merge the existing event with updates
      const {
        title,
        description,
        startTime,
        endTime,
        location,
        attendees = []
      } = updatedDetails;
      
      // Prepare the update
      const updatedEvent = { ...existingEvent.data };
      
      if (title) updatedEvent.summary = title;
      if (description) updatedEvent.description = description;
      if (location) updatedEvent.location = location;
      
      if (startTime) {
        const start = new Date(startTime);
        updatedEvent.start = {
          dateTime: start.toISOString(),
          timeZone: updatedEvent.start.timeZone,
        };
      }
      
      if (endTime) {
        const end = new Date(endTime);
        updatedEvent.end = {
          dateTime: end.toISOString(),
          timeZone: updatedEvent.end.timeZone,
        };
      }
      
      if (attendees && attendees.length > 0) {
        updatedEvent.attendees = attendees.map(email => ({ email }));
      }
      
      // Update the event
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: 'all',
      });
      
      console.log(`Event updated: ${response.data.htmlLink}`);
      
      return {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        eventStatus: response.data.status,
        updated: true
      };
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }
  
  /**
   * Delete a Google Calendar event
   * @param {string} userId - The ID of the user
   * @param {string} eventId - The Google Calendar event ID
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteEvent(userId, eventId) {
    try {
      console.log(`Deleting Google Calendar event ${eventId} for user ${userId}`);
      
      // Get the OAuth client for this user
      const authClient = await googleOAuthService.getAuthClientForUser(userId);
      
      // Initialize the calendar API with the user's credentials
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      
      // Delete the event
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });
      
      console.log(`Event ${eventId} deleted successfully`);
      
      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService(); 