import axios from "axios";
import { Message } from "../types/message";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const messageApi = {
  // Get messages for a lead
  async getMessages(leadId: string): Promise<Message[]> {
    const response = await axios.get(`${BASE_URL}/api/messages/${leadId}`);
    return response.data;
  },

  // Send a message (production)
  async sendMessage(leadId: string, text: string): Promise<Message> {
    const response = await axios.post(`${BASE_URL}/api/messages`, {
      leadId,
      text,
    });
    return response.data;
  },

  // Send a local test message (playground)
  async sendLocalMessage(
    text: string,
    previousMessages: Message[],
    leadContext: string
  ): Promise<{ aiMessage: Message }> {
    const response = await axios.post(`${BASE_URL}/api/messages/send-local`, {
      text,
      previousMessages,
      leadContext,
    });
    return response.data;
  },
};

export default messageApi;
