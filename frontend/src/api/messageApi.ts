import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface Message {
  id: number;
  leadId: number;
  text: string;
  sender: "agent" | "lead";
  twilioSid: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

const messageApi = {
  // Send a message to a lead
  async sendMessage(leadId: number, text: string): Promise<Message> {
    const response = await axios.post(`${API_URL}/messages/send`, {
      leadId,
      text,
    });
    return response.data;
  },

  // Get message history for a lead
  async getMessages(leadId: number): Promise<Message[]> {
    const response = await axios.get(`${API_URL}/messages/lead/${leadId}`);
    return response.data;
  },
};

export default messageApi;
