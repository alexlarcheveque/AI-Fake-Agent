const Appointment = require('../models/Appointment');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const googleCalendarService = require('../services/googleCalendarService');
const { Op } = require('sequelize');
const { format } = require('date-fns');

exports.createAppointment = async (req, res) => {
  try {
    const { leadId, title, startTime, endTime, location, description } = req.body;
    
    // Validate required fields
    if (!leadId || !title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get lead info for calendar invitation
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get userId - either from req.user or lead.userId
    const userId = req.user?.id || lead.userId;
    
    // Make sure we have a userId to associate with the appointment
    if (!userId) {
      return res.status(400).json({ error: 'No user ID available for this appointment' });
    }

    let googleCalendarData = null;
    
    // Try to create a Google Calendar event
    if (googleCalendarService.isConfigured) {
      try {
        // Prepare attendees
        const attendees = [];
        if (lead.email) {
          attendees.push({
            email: lead.email,
            name: lead.name
          });
        }
        
        // Create event in Google Calendar
        googleCalendarData = await googleCalendarService.createEvent(
          {
            title,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            description: description || `Appointment with ${lead.name}`,
            location: location || 'To be determined'
          },
          attendees
        );
        
        console.log('Google Calendar event created successfully:', googleCalendarData);
      } catch (error) {
        console.error('Google Calendar error:', error);
        // Continue without Google Calendar if it fails
      }
    }
    
    // Create appointment in database
    const appointment = await Appointment.create({
      leadId,
      userId: userId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      description,
      googleCalendarEventId: googleCalendarData?.calendarEventId || null,
      googleCalendarEventLink: googleCalendarData?.calendarEventLink || null,
      googleCalendarEventStatus: googleCalendarData?.calendarEventStatus || null,
      status: 'scheduled'
    });

    // Create a notification for the new appointment
    try {
      const startDateTime = new Date(startTime);
      const formattedDate = format(startDateTime, 'MMMM d');
      const formattedTime = format(startDateTime, 'h:mm a');
      
      await Notification.create({
        userId: userId,
        type: 'appointment',
        title: 'New Appointment Created',
        message: `${title} on ${formattedDate} at ${formattedTime}`,
        isRead: false,
        isNew: true,
        metadata: {
          appointmentId: appointment.id,
          leadId: lead.id,
          startTime: startTime,
          endTime: endTime,
          location: location,
          title: title
        }
      });
      
      console.log(`Created notification for new appointment with lead ${lead.id}`);
    } catch (notificationError) {
      console.error(`Error creating notification for appointment:`, notificationError);
      // Continue even if notification creation fails
    }
    
    res.status(201).json({
      appointment,
      calendarEventLink: googleCalendarData?.calendarEventLink || null
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

exports.getAppointmentsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const appointments = await Appointment.findAll({
      where: { leadId },
      include: [{
        model: Lead,
        attributes: ['id', 'name', 'phoneNumber', 'email']
      }],
      order: [['startTime', 'DESC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

exports.getUpcomingAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: {
        userId: req.user.id,
        startTime: {
          [Op.gte]: new Date()
        },
        status: {
          [Op.ne]: 'cancelled'
        }
      },
      include: [{
        model: Lead,
        attributes: ['id', 'name', 'phoneNumber', 'email']
      }],
      order: [['startTime', 'ASC']],
      limit: 10
    });
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, location, description, status } = req.body;
    
    const appointment = await Appointment.findByPk(id, {
      include: [{
        model: Lead,
        attributes: ['id', 'name', 'userId']
      }]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Get userId - either from req.user, appointment.userId, or Lead.userId
    const userId = req.user?.id || appointment.userId || (appointment.Lead ? appointment.Lead.userId : null);
    
    // Make sure we have a userId for the notification
    if (!userId) {
      console.warn(`No userId found for notification of appointment ${id}`);
    }
    
    // Keep old values to check if time has changed
    const oldStartTime = appointment.startTime;
    const oldStatus = appointment.status;
    
    // Update fields
    if (title) appointment.title = title;
    if (startTime) appointment.startTime = new Date(startTime);
    if (endTime) appointment.endTime = new Date(endTime);
    if (location !== undefined) appointment.location = location;
    if (description !== undefined) appointment.description = description;
    if (status) appointment.status = status;
    
    await appointment.save();
    
    // Create notification if the time has changed or status has changed to "rescheduled"
    if (userId && ((startTime && oldStartTime.getTime() !== new Date(startTime).getTime()) || 
        (status && status === 'rescheduled' && oldStatus !== 'rescheduled'))) {
        
      try {
        const startDateTime = new Date(appointment.startTime);
        const formattedDate = format(startDateTime, 'MMMM d');
        const formattedTime = format(startDateTime, 'h:mm a');
        const leadName = appointment.Lead ? appointment.Lead.name : 'Lead';
        
        await Notification.create({
          userId: userId,
          type: 'appointment',
          title: 'Appointment Updated',
          message: `${appointment.title} with ${leadName} rescheduled to ${formattedDate} at ${formattedTime}`,
          isRead: false,
          isNew: true,
          metadata: {
            appointmentId: appointment.id,
            leadId: appointment.leadId,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            location: appointment.location,
            title: appointment.title,
            status: appointment.status
          }
        });
        
        console.log(`Created notification for updated appointment with lead ${appointment.leadId}`);
      } catch (notificationError) {
        console.error(`Error creating notification for appointment update:`, notificationError);
        // Continue even if notification creation fails
      }
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    await appointment.destroy();
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
}; 