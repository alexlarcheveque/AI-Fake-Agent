import express from "express";
import asyncHandler from "express-async-handler";
import {
  getAppointmentsByLeadId,
  createAppointment,
  deleteAppointment,
  getAppointmentsByUserId,
} from "../controllers/appointmentController.ts";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply protect middleware to all appointment routes
router.use(protect);

// get all appointments for a user
router.get(
  "/user",
  asyncHandler((req, res) => getAppointmentsByUserId(req, res))
);

// Get upcoming appointments
router.get(
  "/lead/:leadId",
  asyncHandler((req, res) => getAppointmentsByLeadId(req, res))
);

// Create new appointment
router.post(
  "/",
  asyncHandler((req, res) => createAppointment(req, res))
);

// Delete appointment
router.delete(
  "/:id",
  asyncHandler((req, res) => deleteAppointment(req, res))
);

export default router;
