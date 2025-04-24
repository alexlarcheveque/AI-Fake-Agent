import Appointment from '../models/Appointment.js';
import Lead from '../models/Lead.js';
import { Op } from 'sequelize';
import { format } from 'date-fns';

export const createAppointment = async (req, res) => {
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

    // Create appointment in database
    const appointment = await Appointment.create({
      leadId,
      userId: userId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      description,
      status: 'scheduled'
    });

    res.status(201).json({
      appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

export const getAppointmentsByLead = async (req, res) => {
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

export const getUpcomingAppointments = async (req, res) => {
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

export const deleteAppointment = async (req, res) => {
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

export default {
  createAppointment,
  getAppointmentsByLead,
  getUpcomingAppointments,
  deleteAppointment
};