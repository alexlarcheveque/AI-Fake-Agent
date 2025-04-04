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
  metadata?: {
    isPropertySearch?: boolean;
    hasPropertySearch?: boolean;
    propertySearchCriteria?: string;
    propertySearchId?: number;
    propertySearchFormat?: string;
    hasAppointment?: boolean;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentId?: number;
  } | null;
}
