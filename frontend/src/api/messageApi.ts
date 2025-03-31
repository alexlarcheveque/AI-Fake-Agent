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

  // Add a utility method to test socket message delivery
  async testSocketMessage(leadId: number, text?: string): Promise<any> {
    try {
      console.log(`🧪 Testing socket message for lead ${leadId} with text: "${text}"`);
      
      // Ensure leadId is a number
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      
      // Log request details
      console.log('🧪 Test socket message request:', {
        url: `${BASE_URL}/api/messages/test-socket`,
        method: 'POST',
        data: { leadId: numericLeadId, text }
      });
      
      const response = await axios.post(`${BASE_URL}/api/messages/test-socket`, {
        leadId: numericLeadId,
        text,
      });
      
      console.log("🧪 Socket test response:", response.data);
      console.log("🧪 Emitted message should match this format:", {
        leadId: numericLeadId,
        message: {
          id: "any-number",
          leadId: numericLeadId,
          text: text || "This is a test message from the server",
          sender: "lead",
          direction: "inbound",
          isAiGenerated: false,
          deliveryStatus: "delivered"
        }
      });
      
      return response.data;
    } catch (error) {
      console.error("❌ Error testing socket message:", error);
      throw error;
    }
  },

  // Add a method to test AI response simulation
  async simulateAiResponse(leadId: number, text?: string): Promise<any> {
    try {
      console.log(`🤖 Simulating AI response for lead ${leadId} with text: "${text}"`);
      
      // Ensure leadId is a number
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      
      // Log request details
      console.log('🤖 Simulate AI response request:', {
        url: `${BASE_URL}/api/messages/simulate-ai-response`,
        method: 'POST',
        data: { leadId: numericLeadId, text }
      });
      
      const response = await axios.post(`${BASE_URL}/api/messages/simulate-ai-response`, {
        leadId: numericLeadId,
        text,
      });
      
      console.log("🤖 Simulated AI response data:", response.data);
      console.log("🤖 Emitted message should match this format:", {
        leadId: numericLeadId,
        message: {
          id: "any-number",
          leadId: numericLeadId,
          text: text || "This is a simulated AI response message.",
          sender: "agent",
          direction: "outbound",
          isAiGenerated: true,
          deliveryStatus: "delivered"
        }
      });
      
      return response.data;
    } catch (error) {
      console.error("❌ Error simulating AI response:", error);
      throw error;
    }
  },
};

export default messageApi;
