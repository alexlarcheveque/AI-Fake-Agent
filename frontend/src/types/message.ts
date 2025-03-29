export interface Message {
  id: number;
  leadId: number;
  text: string;
  sender: 'agent' | 'lead';
  direction?: 'inbound' | 'outbound';
  isAiGenerated: boolean;
  twilioSid?: string;
  createdAt: string;
  updatedAt?: string;
  deliveryStatus?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}
