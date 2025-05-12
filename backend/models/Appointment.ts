import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Appointment row type from the database types
export type AppointmentRow = Tables<"appointments">;
export type AppointmentInsert = TablesInsert<"appointments">;
export type AppointmentUpdate = TablesUpdate<"appointments">;

export const AppointmentUtils = {
  formatTimestamp(appointment: AppointmentRow): string {
    if (!appointment.start_time_at) return "No date scheduled";

    const date = new Date(appointment.start_time_at);

    return date.toLocaleString();
  },
};
