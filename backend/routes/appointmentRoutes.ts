import express from "express";
import asyncHandler from "express-async-handler";
import {
  getAppointmentsByLeadId,
  createAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.ts";

const router = express.Router();

// Get upcoming appointments
router.get(
  "/upcoming",
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
