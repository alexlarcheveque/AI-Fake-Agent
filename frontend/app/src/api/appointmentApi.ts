import apiClient from "./apiClient";
import {
  AppointmentInsert,
  AppointmentRow,
} from "../../../../backend/models/Appointment";

const appointmentApi = {
  createAppointment: async (
    data: AppointmentInsert
  ): Promise<AppointmentRow> => {
    console.log("data", data);

    try {
      const response = await apiClient.post("/appointments", data);
      return response.appointment;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  },

  getAppointmentsByUserId: async (): Promise<AppointmentRow[]> => {
    try {
      return await apiClient.get("/appointments/user");
    } catch (error) {
      console.error("Error fetching appointments by user ID:", error);
      throw error;
    }
  },

  getAppointmentsByLeadId: async (
    leadId: number
  ): Promise<AppointmentRow[]> => {
    try {
      return await apiClient.get(`/appointments/lead/${leadId}`);
    } catch (error) {
      console.error("Error fetching appointments by lead ID:", error);
      throw error;
    }
  },

  deleteAppointment: async (id: number): Promise<{ message: string }> => {
    try {
      return await apiClient.delete(`/appointments/${id}`);
    } catch (error) {
      console.error("Error deleting appointment:", error);
      throw error;
    }
  },
};

export default appointmentApi;
