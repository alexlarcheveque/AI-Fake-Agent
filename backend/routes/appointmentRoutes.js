const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

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

module.exports = router; 