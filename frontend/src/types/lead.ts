import { Message } from "./message";

export type LeadStatus = "New" | "In Conversation" | "Qualified" | "Appointment Set" | "Converted" | "Inactive";

export type LeadType = "buyer" | "seller";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: LeadStatus;
  leadType: LeadType;
  aiAssistantEnabled: boolean;
  enableFollowUps: boolean;
  firstMessageTiming: "immediate" | "next_day" | "one_week" | "two_weeks";
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
  status: LeadStatus;
  leadType: LeadType;
  aiAssistantEnabled: boolean;
  enableFollowUps: boolean;
  firstMessageTiming: "immediate" | "next_day" | "one_week" | "two_weeks";
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
