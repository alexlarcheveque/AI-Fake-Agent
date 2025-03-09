import axios from "axios";
import { Message } from "../types/message";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const messageApi = {
  // Get messages for a lead
  async getMessages(leadId: string): Promise<Message[]> {
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

  // Send a message
  async sendMessage(
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

      const response = await axios.post(`${BASE_URL}/api/messages/send`, {
        leadId,
        text,
        isAiGenerated,
      });

      return response.data.message;
    } catch (error) {
      console.error("Error in sendMessage API call:", error);
      throw error;
    }
  },

  // Send a local test message (playground)
  async sendLocalMessage(
    text: string,
    previousMessages: Message[],
    leadContext?: string
  ): Promise<{ message: Message }> {
    const response = await axios.post(`${BASE_URL}/api/messages/send-local`, {
      text,
      previousMessages,
      leadContext,
    });
    return response.data;
  },

  // Test Twilio
  async testTwilio(text: string): Promise<{ message: Message }> {
    const response = await axios.post(`${BASE_URL}/api/messages/test-twilio`, {
      text,
    });
    return response.data;
  },

  // Add this method to your existing messageApi.ts file
  async getMessageStats(): Promise<{
    totalMessages: number;
    deliveredMessages: number;
    failedMessages: number;
    activeConversations: number;
  }> {
    const response = await axios.get(`${BASE_URL}/api/messages/stats`);
    return response.data;
  },

  // Add this method to your messageApi.ts
  async getAllMessages(statusFilter = "all"): Promise<Message[]> {
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    const response = await axios.get(`${BASE_URL}/api/messages`, { params });
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
