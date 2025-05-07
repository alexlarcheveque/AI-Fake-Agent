import {
  createAppointment as createAppointmentService,
  getAppointmentsByLeadId as getAppointmentsByLeadIdService,
  deleteAppointment as deleteAppointmentService,
} from "../services/appointmentService.ts";

export const createAppointment = async (req, res) => {
  const { leadId, title, startTime, endTime, location, description } = req.body;

  // Validate required fields
  if (!leadId || !title || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log("body of request", req.body);

  const appointment = await createAppointmentService({
    leadId,
    description,
    status: "scheduled",
    title,
    startTime,
    endTime,
    location,
  });

  res.status(201).json({
    appointment,
  });
};

export const getAppointmentsByLeadId = async (req, res) => {
  const { leadId } = req.params;

  const appointments = await getAppointmentsByLeadIdService(leadId);

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
