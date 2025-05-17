import supabase from "../config/supabase.ts";
import { AppointmentInsert, AppointmentRow } from "../models/Appointment.ts";
import { getLeadsByUserId } from "./leadService.ts";

export const createAppointment = async (
  settings: AppointmentInsert
): Promise<AppointmentRow> => {
  const { data, error } = await supabase
    .from("appointments")
    .insert([settings])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getAppointmentsByLeadId = async (
  leadId: number
): Promise<AppointmentRow[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data;
};

export const getAppointmentsByUserId = async (
  userId: string
): Promise<AppointmentRow[]> => {
  const leads = await getLeadsByUserId(userId);

  console.log("get appointments by userId -- leads", leads);

  const leadIds = leads.map((lead) => lead.id);

  const { data: allAppointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*")
    .in("lead_id", leadIds);

  console.log("get appointments by userId -- allAppointments", allAppointments);

  if (appointmentsError) throw new Error(appointmentsError.message);
  return allAppointments;
};

export const deleteAppointment = async (
  appointmentId: number
): Promise<AppointmentRow[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .select();

  if (error) throw new Error(error.message);
  return data;
};
