import { Message } from "./message";

export type LeadStatus =
  | "New"
  | "In Conversation"
  | "Qualified"
  | "Appointment Set"
  | "Converted"
  | "Inactive";

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
  context?: string; // Property metadata for AI responses
  createdAt?: string;
  updatedAt?: string;
  messages?: Message[];
}

export interface LeadFormData {
  name: string;
  email: string;
  phoneNumber: string;
  status: LeadStatus;
  leadType: LeadType;
  firstMessageTiming: "immediate" | "next_day" | "one_week" | "two_weeks";
  context?: string;
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
