import { Tables, TablesInsert, TablesUpdate } from "../database.types";

// Get the Lead row type from the database types
export type LeadRow = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;

// Extend the database type with additional properties/methods
export interface Lead extends LeadRow {
  // Additional properties not in the database
  last_message_at?: Date;
  updated_at?: Date;
  formattedPhone?: string;
  user_id?: number; // For compatibility with old code
}

// Helper functions
export function formatLeadPhone(lead: Lead): string {
  if (!lead.phone_number) return "";

  const phoneStr = lead.phone_number.toString();
  if (phoneStr.length !== 10) return phoneStr;

  return `(${phoneStr.slice(0, 3)}) ${phoneStr.slice(3, 6)}-${phoneStr.slice(
    6
  )}`;
}

// Utility functions for working with Leads
export const LeadUtils = {
  // Convert database date strings to JavaScript Date objects
  toModel(data: LeadRow): Lead {
    return {
      ...data,
      formattedPhone: formatLeadPhone(data as Lead),
      // Map user_uuid to user_id for backward compatibility
      user_id: data.user_uuid ? parseInt(data.user_uuid) : undefined,
    };
  },

  // Convert JavaScript model to database format for inserts
  toInsert(lead: Partial<Lead>): LeadInsert {
    const { last_message_at, updated_at, formattedPhone, user_id, ...dbLead } =
      lead as any;

    // Convert user_id to user_uuid if needed
    if (user_id && !dbLead.user_uuid) {
      dbLead.user_uuid = user_id.toString();
    }

    return dbLead as LeadInsert;
  },

  // Check if a lead is active
  isActive(lead: Lead): boolean {
    return lead.status !== "closed" && !lead.is_archived;
  },
};
