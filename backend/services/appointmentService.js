import supabase from "../config/supabase.js";

export const createAppointment = async (settings) => {
  const { lead_id, user_id, appointment_timestamp, description, status } =
    settings;
  const { data, error } = await supabase
    .from("appointments")
    .insert([{ lead_id, user_id, appointment_timestamp, description, status }]);

  if (error) throw new Error(error.message);
  return data;
};

export const getAppointmentsByLeadId = async (leadId) => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data;
};

export const getAppointmentsByUserId = async (userId) => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data;
};

export const deleteAppointment = async (appointmentId) => {
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);
  return data;
};
