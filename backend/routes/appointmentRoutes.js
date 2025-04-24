import express from 'express';
import appointmentController from '../controllers/appointmentController.js';

const router = express.Router();

// Get upcoming appointments
router.get('/upcoming', appointmentController.getUpcomingAppointments);

// Get appointments for a specific lead
router.get('/lead/:leadId', appointmentController.getAppointmentsByLead);

// Create new appointment
router.post('/', appointmentController.createAppointment);

// Delete appointment
router.delete('/:id', appointmentController.deleteAppointment);

export default router;