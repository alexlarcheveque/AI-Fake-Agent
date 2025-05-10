import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Message row type from the database types
export type MessageRow = Tables<"messages">;
export type MessageInsert = TablesInsert<"messages">;
export type MessageUpdate = TablesUpdate<"messages">;

export interface Message {
  id: number;
  lead_id: number;
  text: string;
  delivery_status: string;
  error_code: string | null;
  error_message: string | null;
  is_ai_generated: boolean;
  created_at: string | Date | null;
  scheduled_at: string | Date | null;
  updated_at: string | Date | null;
  sender?: string; // Who sent the message (agent/lead)
  is_incoming?: boolean; // If message is incoming from lead
  twilio_sid?: string; // Twilio message SID
}

// Utility functions for working with Messages
export const MessageUtils = {
  // Convert database row to Message object
  toModel(data: MessageRow): Message {
    return {
      ...data,
      // Add any additional properties if needed
      sender: (data as any).sender || null,
      twilio_sid: (data as any).twilio_sid || null,
    };
  },

  // Convert Message object to database format
  toInsert(message: Partial<Message>): MessageInsert {
    const result: Record<string, any> = {};

    // Copy all properties
    Object.keys(message).forEach((key) => {
      const value = message[key as keyof Partial<Message>];

      // Convert Date objects to strings
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        result[key] = value;
      }
    });

    return result as MessageInsert;
  },

  // Check if a message is delivered
  isDelivered(message: Message): boolean {
    return message.delivery_status === "delivered";
  },

  // Check if a message has failed
  hasFailed(message: Message): boolean {
    return message.delivery_status === "failed";
  },

  // Check if a message is scheduled
  isScheduled(message: Message): boolean {
    return !!message.scheduled_at && message.delivery_status === "queued";
  },
};
