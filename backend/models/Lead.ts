import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Lead row type from the database types
export type LeadRow = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;

// Helper functions
export function formatLeadPhone(lead: LeadRow): string {
  if (!lead.phone_number) return "";

  const phoneStr = lead.phone_number.toString();
  if (phoneStr.length !== 10) return phoneStr;

  return `(${phoneStr.slice(0, 3)}) ${phoneStr.slice(3, 6)}-${phoneStr.slice(
    6
  )}`;
}
