import apiClient from "./apiClient";

export interface Appointment {
  id: number;
  leadId: number;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  Lead?: {
    id: number;
    name: string;
    phoneNumber: string;
    email?: string;
  };
}

export interface EventType {
  uri: string;
  name: string;
  slug: string;
  active: boolean;
  scheduling_url: string;
  duration: number;
  description?: string;
}

export interface CreateAppointmentRequest {
  leadId: number;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  status?: string;
}

const appointmentApi = {
  createAppointment: async (
    data: CreateAppointmentRequest
  ): Promise<Appointment> => {
    console.log("data", data);

    try {
      const response = await apiClient.post("/appointments", data);
      return response.appointment;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  },

  getAppointmentsByLeadId: async (leadId: number): Promise<Appointment[]> => {
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

  getEventTypes: async (): Promise<EventType[]> => {
    try {
      return await apiClient.get("/appointments/event-types");
    } catch (error) {
      console.error("Error fetching event types:", error);
      throw error;
    }
  },

  getUpcomingAppointments: async (): Promise<Appointment[]> => {
    try {
      return await apiClient.get("/appointments/upcoming");
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      throw error;
    }
  },
};

export default appointmentApi;
