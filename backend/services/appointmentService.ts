import supabase from "../config/supabase.ts";
import {
  Appointment,
  AppointmentInsert,
  AppointmentUtils,
} from "../models/Appointment.ts";

interface CreateAppointmentParams {
  lead_id?: number | null;
  user_id?: number;
  appointment_timestamp?: Date | string | null;
  description?: string | null;
  status?: string | null;
}

export const createAppointment = async (
  settings: CreateAppointmentParams
): Promise<Appointment[]> => {
  const appointmentData = AppointmentUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("appointments")
    .insert([appointmentData])
    .select();

  if (error) throw new Error(error.message);
  return data.map((appointment) => AppointmentUtils.toModel(appointment));
};

export const getAppointmentsByLeadId = async (
  leadId: number
): Promise<Appointment[]> => {
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
