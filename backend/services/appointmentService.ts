import supabase from "../config/supabase.ts";
import {
  Appointment,
  AppointmentInsert,
  AppointmentModel,
  AppointmentUtils,
} from "../models/Appointment.ts";

export const createAppointment = async (
  settings: AppointmentModel
): Promise<Appointment[]> => {
  const appointmentToInsert = AppointmentUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("appointments")
    .insert([appointmentToInsert])
    .select();

  if (error) throw new Error(error.message);
  return data.map((appointment) => AppointmentUtils.toModel(appointment));
};

export const getAppointmentsByLeadId = async (
  leadId: number
): Promise<AppointmentModel[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data.map((appointment) => AppointmentUtils.toModel(appointment));
};

export const getAppointmentsByUserId = async (
  userId: number
): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data.map((appointment) => AppointmentUtils.toModel(appointment));
};

export const deleteAppointment = async (
  appointmentId: number
): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .select();

  if (error) throw new Error(error.message);
  return data.map((appointment) => AppointmentUtils.toModel(appointment));
};
