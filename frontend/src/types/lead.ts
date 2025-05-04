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
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  aiAssistantEnabled: boolean;
  isArchived: boolean;
  context: string;
  leadType: string;
  formattedPhone: string;
  nextScheduledMessage?: string;
  messageCount?: number;
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
