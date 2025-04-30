import axios from "axios";
import { Message } from "../types/message";
import settingsApi from "./settingsApi";

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

      let userSettings = {};
      try {
        userSettings = await settingsApi.getSettings();
        console.log("Including user settings with message:", userSettings);
      } catch (settingsError) {
        console.warn("Failed to get user settings, continuing without them:", settingsError);
      }

      const response = await axios.post(`${BASE_URL}/api/messages/send`, {
        leadId,
        text,
        isAiGenerated,
        userSettings // Include user settings with the message
      });

      return response.data.message;
    } catch (error) {
      console.error("Error in sendMessage API call:", error);
      throw error;
    }
  },

  // Test Twilio
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
