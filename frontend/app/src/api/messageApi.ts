import apiClient from "./apiClient";
import { Message } from "../types/message";
import settingsApi from "./settingsApi";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

interface MessageStats {
  total: number;
  sent: number;
  received: number;
  scheduled: number;
}

const messageApi = {
  // Get messages for a lead ordered by descending timestamp
  async getMessagesByLeadIdDescending(leadId: number): Promise<Message[]> {
    try {
      console.log(`Fetching messages for lead ${leadId}`);
      const messages = await apiClient.get(`/messages/lead/${leadId}`);
      console.log(`Received ${messages.length} messages`);
      return messages;
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request:", error.request);
      } else {
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

      return await apiClient.post(`/messages`, {
        lead_id: leadId,
        text,
        is_ai_generated: isAiGenerated,
        user_settings: userSettings,
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
      return await apiClient.put(`/messages/${messageId}`, {
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
      return await apiClient.delete(`/messages/${messageId}`, {
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
      return await apiClient.get(`/messages/overdue`);
    } catch (error) {
      console.error("Error fetching overdue messages:", error);
      throw error;
    }
  },

  // Mark a message as read
  async markAsRead(messageId: string): Promise<void> {
    try {
      await apiClient.put(`/messages/${messageId}/read`);
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  },

  // Test Twilio
  async testTwilio(text: string): Promise<{ message: Message }> {
    return await apiClient.post(`/messages/test-twilio`, {
      text,
    });
  },

  // Get scheduled messages for the calendar
  async getScheduledMessages(
    startDate: string,
    endDate: string
  ): Promise<Message[]> {
    return await apiClient.get(`/messages/scheduled`, {
      params: { startDate, endDate },
    });
  },

  // Get message statistics
  async getMessageStats(): Promise<MessageStats> {
    return await apiClient.get(`/messages/stats`);
  },

  // Send a message (alias for createOutgoingMessage)
  async sendMessage(
    leadId: number,
    text: string,
    isAiGenerated = false
  ): Promise<Message> {
    return await apiClient.post(`/messages/send`, {
      lead_id: leadId,
      text,
      is_ai_generated: isAiGenerated,
    });
  },

  // Get all messages with optional filter
  async getAllMessages(filter?: {
    status?: string;
    type?: string;
  }): Promise<Message[]> {
    return await apiClient.get(`/messages`, { params: filter });
  },
};

export default messageApi;
export type { Message, MessageStats };
