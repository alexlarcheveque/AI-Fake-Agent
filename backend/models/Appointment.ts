import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Appointment row type from the database types
export type AppointmentRow = Tables<"appointments">;
export type AppointmentInsert = TablesInsert<"appointments">;
export type AppointmentUpdate = TablesUpdate<"appointments">;

// Extend the database type with additional properties/methods
export interface Appointment
  extends Omit<AppointmentRow, "created_at" | "timestamp"> {
  // Override date properties to allow Date objects
  created_at: string | Date;
  timestamp: string | Date | null;

  // Additional properties
  appointment_timestamp?: string | Date | null; // For compatibility with existing code
  user_id?: number; // For compatibility with old code that might use user_id
}

export interface AppointmentModel {
  description: string;
  endTime: string;
  leadId: number;
  location: string;
  startTime: string;
  title: string;
  status: string;
}

export const AppointmentUtils = {
  toModel(data: AppointmentRow): AppointmentModel {
    return {
      ...data,
      leadId: data.lead_id,
      startTime: data.start_time_at,
      endTime: data.end_time_at,
      location: data.location,
      description: data.description,
      title: data.title,
      status: data.status,
    };
  },

  // Convert JavaScript model to database format for inserts
  toInsert(appointment: AppointmentModel): AppointmentInsert {
    const dbAppointment = {
      lead_id: appointment.leadId,
      start_time_at: appointment.startTime,
      end_time_at: appointment.endTime,
      location: appointment.location,
      description: appointment.description,
      title: appointment.title,
      status: appointment.status,
    };

    return dbAppointment as AppointmentInsert;
  },

  // Helper to check if an appointment is upcoming
  isUpcoming(appointment: Appointment): boolean {
    if (!appointment.timestamp) return false;

    const appointmentDate =
      typeof appointment.timestamp === "string"
        ? new Date(appointment.timestamp)
        : appointment.timestamp;

    return appointmentDate > new Date();
  },

  // Helper to format appointment time
  formatTimestamp(appointment: Appointment): string {
    if (!appointment.timestamp) return "No date scheduled";

    const date =
      typeof appointment.timestamp === "string"
        ? new Date(appointment.timestamp)
        : appointment.timestamp;

    return date.toLocaleString();
  },
};
