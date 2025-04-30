import {
  createAppointment as createAppointmentService,
  getAppointmentsByLeadId as getAppointmentsByLeadIdService,
  deleteAppointment as deleteAppointmentService,
} from "../services/appointmentService.js";

export const createAppointment = async (req, res) => {
  const { lead_id, title, timestamp, description } = req.body;

  // Validate required fields
  if (!lead_id || !title || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const appointment = await createAppointmentService(
    lead_id,
    title,
    timestamp,
    description
  );

  res.status(201).json({
    appointment,
  });
};

export const getAppointmentsByLeadId = async (req, res) => {
  const { lead_id } = req.params;

  const appointments = await getAppointmentsByLeadIdService(lead_id);

  res.json(appointments);
};

export const deleteAppointment = async (req, res) => {
  const { id } = req.params;

  const appointment = await deleteAppointmentService(id);

  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  res.json({ message: "Appointment deleted successfully" });
};
