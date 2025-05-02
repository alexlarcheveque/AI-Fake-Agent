import axios from "axios";
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
  async getMessagesByLeadIdDescending(leadId: string): Promise<Message[]> {
    try {
      console.log(`Fetching messages for lead ${leadId}`);
      const response = await axios.get(
        `${BASE_URL}/api/messages/lead/${leadId}`
      );
      console.log(`Received ${response.data.length} messages`);
      return response.data;
    } catch (error) {
      console.error("Error fetching messages:", error);
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

      const response = await axios.post(`${BASE_URL}/api/messages`, {
        lead_id: leadId,
        text,
        is_ai_generated: isAiGenerated,
        user_settings: userSettings, // Include user settings with the message
      });

      return response.data;
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
      const response = await axios.put(
        `${BASE_URL}/api/messages/${messageId}`,
        {
          message_id: messageId,
          data,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating message:", error);
      throw error;
    }
  },

  // Delete a message
  async deleteMessage(messageId: string): Promise<Message> {
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/messages/${messageId}`,
        {
          data: { message_id: messageId },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  },

  // Get messages that are overdue
  async getMessagesThatAreOverdue(): Promise<Message[]> {
    try {
      const response = await axios.get(`${BASE_URL}/api/messages/overdue`);
      return response.data;
    } catch (error) {
      console.error("Error fetching overdue messages:", error);
      throw error;
    }
  },

  // Mark a message as read
  async markAsRead(messageId: string): Promise<void> {
    try {
      await axios.put(`${BASE_URL}/api/messages/${messageId}/read`);
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  },

  // Test Twilio (keeping this as it might be useful)
  async testTwilio(text: string): Promise<{ message: Message }> {
    const response = await axios.post(`${BASE_URL}/api/messages/test-twilio`, {
      text,
    });
    return response.data;
  },

  // Add this new method to fetch scheduled messages for the calendar
  async getScheduledMessages(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const response = await axios.get(`${BASE_URL}/api/messages/scheduled`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

export default messageApi;
