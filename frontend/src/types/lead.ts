import { Message } from "./message";

export interface Lead {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  aiAssistantEnabled: boolean;
  enableFollowUps: boolean;
  firstMessageTiming: string;
  nextScheduledMessage?: string; // ISO date string
  lastMessageDate?: string;
  messageCount: number;
  archived: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: Message[];
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string;
  googleCalendarEventStatus?: string;
}

export interface LeadFormData {
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  aiAssistantEnabled: boolean;
  enableFollowUps: boolean;
  firstMessageTiming: string;
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  created: Lead[];
  failed: {
    data: LeadFormData;
    error: string;
  }[];
}
