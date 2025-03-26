import axios, { AxiosError } from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  // Calendly fields (legacy)
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  // Google Calendar fields
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string;
  googleCalendarEventStatus?: string;
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
  eventTypeUuid?: string;
  status?: string;
}

export interface ApiError {
  message: string;
  code: number;
  isAuthError?: boolean;
  isCalendlyError?: boolean;
}

// Helper function to handle errors consistently
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message: string; error: string }>;
    const statusCode = axiosError.response?.status || 500;
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unknown error occurred';
    
    const apiError: ApiError = {
      message: errorMessage,
      code: statusCode,
      isAuthError: statusCode === 401,
    };
    
    throw apiError;
  }
  
  throw {
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    code: 500
  };
};

const appointmentApi = {
  getEventTypes: async (): Promise<EventType[]> => {
    try {
      const response = await axios.get(`${API_URL}/api/appointments/event-types`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getUpcomingAppointments: async (): Promise<Appointment[]> => {
    try {
      const response = await axios.get(`${API_URL}/api/appointments/upcoming`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAppointmentsByLead: async (leadId: number): Promise<Appointment[]> => {
    try {
      const response = await axios.get(`${API_URL}/api/appointments/lead/${leadId}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  createAppointment: async (data: CreateAppointmentRequest): Promise<{ appointment: Appointment; calendlyLink: string | null }> => {
    try {
      // First create the appointment in our database
      const response = await axios.post(`${API_URL}/api/appointments`, data, {
        withCredentials: true,
      });

      // Check if we have a Calendly link and automatically open it
      if (response.data.calendlyLink) {
        // Open Calendly scheduling page in a new tab
        window.open(response.data.calendlyLink, '_blank');
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateAppointment: async (id: number, data: Partial<CreateAppointmentRequest>): Promise<Appointment> => {
    try {
      const response = await axios.put(`${API_URL}/api/appointments/${id}`, data, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteAppointment: async (id: number): Promise<{ message: string }> => {
    try {
      const response = await axios.delete(`${API_URL}/api/appointments/${id}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  parseAppointmentFromAIMessage: (message: string): { date: string; time: string } | null => {
    // Use a very specific format that won't trigger accidentally during normal conversation
    // This requires the exact format "NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM"
    const primaryRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
    let match = message.match(primaryRegex);
    
    if (match) {
      return {
        date: match[1],
        time: match[2]
      };
    }

    // Try alternative formats for more flexibility
    // Format like "Let's schedule for MM/DD/YYYY at HH:MM AM/PM"
    const schedulingRegex = /schedule(?:d)?\s+(?:for|on)\s+(\d{1,2}\/\d{1,2}\/\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)\s+(?:at|@)?\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i;
    match = message.match(schedulingRegex);
    
    if (match) {
      return {
        date: match[1],
        time: match[2]
      };
    }
    
    // Look for "appointment" or "meeting" with date and time
    const appointmentRegex = /(?:appointment|meeting)\s+(?:for|on|at)\s+(\d{1,2}\/\d{1,2}\/\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)\s+(?:at|@)?\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i;
    match = message.match(appointmentRegex);
    
    if (match) {
      return {
        date: match[1],
        time: match[2]
      };
    }
    
    // NEW: Look for rescheduled appointments
    const rescheduleRegex = /(?:reschedule|rescheduled)\s+(?:for|to)\s+(\w+day|tomorrow|today|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?),?\s+(?:at|@)?\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i;
    match = message.match(rescheduleRegex);
    
    if (match) {
      return {
        date: match[1],
        time: match[2]
      };
    }
    
    // NEW: Check for appointments that mention times like "Your appointment is now set for tomorrow at 9:00 AM"
    const appointmentSetRegex = /appointment\s+(?:is\s+now|has\s+been)?\s+(?:set|scheduled|confirmed|rescheduled)\s+for\s+(\w+day|tomorrow|today|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?),?\s+(?:at|@)?\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i;
    match = message.match(appointmentSetRegex);
    
    if (match) {
      return {
        date: match[1],
        time: match[2]
      };
    }
    
    return null;
  }
};

export default appointmentApi; 