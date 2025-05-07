import apiClient from "./apiClient";
import { Message } from "../types/message";
import settingsApi from "./settingsApi";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const messageApi = {
  // Get messages for a lead ordered by descending timestamp
  async getMessagesByLeadIdDescending(leadId: number): Promise<Message[]> {
    try {
      console.log(`Fetching messages for lead ${leadId}`);
      const messages = await apiClient.get(`/api/messages/lead/${leadId}`);
      console.log(`Received ${messages.length} messages`);
      return messages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      // Log more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Error request:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
      }
      throw error;
    }
  },

  // Create an outgoing message
  async createOutgoingMessage(
    leadId: number,
    text: string,
    isAiGenerated = false
  ): Promise<Message> {
    try {
      // Validate inputs before sending
      if (!leadId || isNaN(leadId)) {
        throw new Error(`Invalid leadId: ${leadId}`);
      }

      if (!text || typeof text !== "string") {
        throw new Error("Message text is required");
      }

      let userSettings = {};
      try {
        userSettings = await settingsApi.getSettings();
        console.log("Including user settings with message:", userSettings);
      } catch (settingsError) {
        console.warn(
          "Failed to get user settings, continuing without them:",
          settingsError
        );
      }

      return await apiClient.post(`/api/messages`, {
        lead_id: leadId,
        text,
        is_ai_generated: isAiGenerated,
        user_settings: userSettings, // Include user settings with the message
      });
    } catch (error) {
      console.error("Error in createOutgoingMessage API call:", error);
      throw error;
    }
  },

  // Update a message
  async updateMessage(
    messageId: string,
    data: Partial<Message>
  ): Promise<Message> {
    try {
      return await apiClient.put(`/api/messages/${messageId}`, {
        message_id: messageId,
        data,
      });
    } catch (error) {
      console.error("Error updating message:", error);
      throw error;
    }
  },

  // Delete a message
  async deleteMessage(messageId: string): Promise<Message> {
    try {
      return await apiClient.delete(`/api/messages/${messageId}`, {
        data: { message_id: messageId },
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  },

  // Get messages that are overdue
  async getMessagesThatAreOverdue(): Promise<Message[]> {
    try {
      return await apiClient.get(`/api/messages/overdue`);
    } catch (error) {
      console.error("Error fetching overdue messages:", error);
      throw error;
    }
  },

  // Mark a message as read
  async markAsRead(messageId: string): Promise<void> {
    try {
      await apiClient.put(`/api/messages/${messageId}/read`);
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  },

  // Test Twilio (keeping this as it might be useful)
  async testTwilio(text: string): Promise<{ message: Message }> {
    return await apiClient.post(`/api/messages/test-twilio`, {
      text,
    });
  },

  // Add this new method to fetch scheduled messages for the calendar
  async getScheduledMessages(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return await apiClient.get(`/api/messages/scheduled`, {
      params: { startDate, endDate },
    });
  },
};

export default messageApi;
