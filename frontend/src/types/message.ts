export interface Message {
  id: number | string;
  leadId: number;
  text: string;
  direction: "inbound" | "outbound";
  isAiGenerated: boolean;
  sender: string;
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
