export interface Message {
  id: number;
  leadId?: number;
  text: string;
  sender: "agent" | "user";
  twilioSid: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
