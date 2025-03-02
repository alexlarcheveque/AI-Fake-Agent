import axios from "axios";
import { Message } from "../types/message";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const messageApi = {
  // Get messages for a lead
  async getMessages(leadId: string): Promise<Message[]> {
    const response = await axios.get(`${BASE_URL}/api/messages/lead/${leadId}`);
    return response.data;
  },

  // Send a message
  async sendMessage(
    leadId: string | number,
    text: string,
    isAiGenerated: boolean = false
  ): Promise<{ message: Message; aiMessage?: Message }> {
    // Try parsing the leadId as a number if it's a string
    const id = typeof leadId === "string" ? parseInt(leadId, 10) : leadId;

    // Debug the request payload
    console.log("Sending message with payload:", {
      leadId: id,
      text,
      isAiGenerated,
    });

    const response = await axios.post(`${BASE_URL}/api/messages/send`, {
      leadId: id,
      text,
      isAiGenerated,
    });

    return response.data;
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
  async getMessageStats(): Promise<{ totalMessages: number }> {
    const response = await axios.get(`${BASE_URL}/messages/stats`);
    return response.data;
  },

  // Add this method to your messageApi.ts
  async getAllMessages(statusFilter = "all"): Promise<Message[]> {
    const params = statusFilter !== "all" ? { status: statusFilter } : {};
    const response = await axios.get(`${BASE_URL}/api/messages`, { params });
    return response.data;
  },
};

export default messageApi;
