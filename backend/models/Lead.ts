import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Lead row type from the database types
export type LeadRow = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;

// Helper functions
export function formatLeadPhone(lead: LeadRow): string {
  if (!lead.phone_number) return "";

  // Convert to string if it's a number
  const phoneStr = lead.phone_number.toString();

  // Remove all non-digit characters
  const digits = phoneStr.replace(/\D/g, "");

  // Format based on length
  if (digits.length === 10) {
    // US format: (xxx) xxx-xxxx
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    // US format with country code: +1 (xxx) xxx-xxxx
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
      7
    )}`;
  } else if (digits.length > 10) {
    // International format: +XX XXX XXX-XXXX
    const countryCode = digits.slice(0, digits.length - 10);
    const areaCode = digits.slice(-10, -7);
    const firstPart = digits.slice(-7, -4);
    const lastPart = digits.slice(-4);
    return `+${countryCode} ${areaCode} ${firstPart}-${lastPart}`;
  } else if (digits.length === 7) {
    // Local format: xxx-xxxx
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  // Return as-is if we can't format it nicely
  return phoneStr;
}
