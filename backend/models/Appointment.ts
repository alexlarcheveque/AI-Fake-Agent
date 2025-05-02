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

// Utility functions for working with Appointments
export const AppointmentUtils = {
  // Convert database date strings to JavaScript Date objects
  toModel(data: AppointmentRow): Appointment {
    return {
      ...data,
      // Convert date strings to Date objects
      created_at: data.created_at
        ? new Date(data.created_at)
        : new Date().toISOString(),
      timestamp: data.timestamp ? new Date(data.timestamp) : null,
      appointment_timestamp: data.timestamp ? new Date(data.timestamp) : null,
    };
  },

  // Convert JavaScript model to database format for inserts
  toInsert(appointment: Partial<Appointment>): AppointmentInsert {
    const { appointment_timestamp, user_id, ...dbAppointment } =
      appointment as any;

    // Map appointment_timestamp to timestamp if provided
    if (appointment_timestamp !== undefined) {
      // Convert Date objects to strings
      if (appointment_timestamp instanceof Date) {
        dbAppointment.timestamp = appointment_timestamp.toISOString();
      } else {
        dbAppointment.timestamp = appointment_timestamp;
      }
    }

    // Convert created_at Date to string if needed
    if (appointment.created_at && appointment.created_at instanceof Date) {
      dbAppointment.created_at = appointment.created_at.toISOString();
    }

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
