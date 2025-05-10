import {
  createAppointment as createAppointmentService,
  getAppointmentsByLeadId as getAppointmentsByLeadIdService,
  deleteAppointment as deleteAppointmentService,
  getAppointmentsByUserId as getAppointmentsByUserIdService,
} from "../services/appointmentService.ts";

export const createAppointment = async (req, res) => {
  const { lead_id, title, start_time_at, end_time_at, location, description } =
    req.body;

  // Validate required fields
  if (!lead_id || !title || !start_time_at || !end_time_at) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const appointment = await createAppointmentService({
    lead_id,
    description,
    status: "scheduled",
    title,
    start_time_at,
    end_time_at,
    location,
  });

  res.status(201).json({
    appointment,
  });
};

export const getAppointmentsByUserId = async (req, res) => {
  console.log("request get appointments by user id", req);

  const userId = req.user.id;

  if (!userId) {
    return res.status(401).json({ message: "User ID not found in request" });
  }

  console.log("get appointments by user id", req.user);

  const appointments = await getAppointmentsByUserIdService(userId);

  res.json(appointments);
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
