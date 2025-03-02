export interface Message {
  id: number;
  leadId?: number;
  text: string;
  direction: "inbound" | "outbound";
  isAiGenerated: boolean;
  sender: "agent" | "lead";
  twilioSid: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  useAiResponse: boolean;
  deliveryStatus?:
    | "queued"
    | "sending"
    | "sent"
    | "delivered"
    | "failed"
    | "undelivered"
    | "read";
  errorMessage?: string;
  statusUpdatedAt?: string;
}
