import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Message row type from the database types
export type MessageRow = Tables<"messages">;
export type MessageInsert = TablesInsert<"messages">;
export type MessageUpdate = TablesUpdate<"messages">;

// Extend the database type with additional properties/methods
export interface Message
  extends Omit<MessageRow, "created_at" | "scheduled_at" | "updated_at"> {
  // Override properties to allow Date objects
  created_at?: string | Date | null;
  scheduled_at?: string | Date | null;
  updated_at?: string | Date | null;

  // Additional properties not in the database
  sender?: string; // Who sent the message (agent/lead)
  is_incoming?: boolean; // If message is incoming from lead
  twilioSid?: string; // Twilio message SID
}

// Utility functions for working with Messages
export const MessageUtils = {
  // Convert database date strings to JavaScript Date objects
  toModel(data: MessageRow): Message {
    const model: Message = {
      ...data,
    };

    // Convert dates if they exist
    if (data.created_at) {
      model.created_at = new Date(data.created_at);
    }

    if (data.scheduled_at) {
      model.scheduled_at = new Date(data.scheduled_at);
    }

    if (data.updated_at) {
      model.updated_at = new Date(data.updated_at);
    }

    return model;
  },

  // Convert JavaScript model to database format for inserts
  toInsert(message: Partial<Message>): MessageInsert {
    const { sender, is_incoming, twilioSid, ...dbMessage } = message as any;

    // Convert Date objects to strings if they exist
    const result = { ...dbMessage };

    if (message.created_at && message.created_at instanceof Date) {
      result.created_at = message.created_at.toISOString();
    }

    if (message.scheduled_at && message.scheduled_at instanceof Date) {
      result.scheduled_at = message.scheduled_at.toISOString();
    }

    if (message.updated_at && message.updated_at instanceof Date) {
      result.updated_at = message.updated_at.toISOString();
    }

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
