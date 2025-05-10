import apiClient from "./apiClient";

export interface Appointment {
  id: number;
  lead_id: number;
  user_id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
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
  lead_id: number;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  status?: string;
}

export class ApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
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

  getAppointmentsByLeadId: async (lead_id: number): Promise<Appointment[]> => {
    try {
      return await apiClient.get(`/appointments/lead/${lead_id}`);
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
