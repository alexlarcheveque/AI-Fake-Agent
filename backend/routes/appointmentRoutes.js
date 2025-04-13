import express from 'express';
import appointmentController from '../controllers/appointmentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Get upcoming appointments
router.get('/upcoming', appointmentController.getUpcomingAppointments);

// Get appointments for a specific lead
router.get('/lead/:leadId', appointmentController.getAppointmentsByLead);

// Create new appointment
router.post('/', appointmentController.createAppointment);

// Update appointment
router.put('/:id', appointmentController.updateAppointment);

// Delete appointment
router.delete('/:id', appointmentController.deleteAppointment);

export default router; 