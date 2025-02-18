export interface Message {
  id: number;
  leadId?: number;
  text: string;
  sender: "agent" | "lead";
  twilioSid: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  useAiResponse: boolean;
}
