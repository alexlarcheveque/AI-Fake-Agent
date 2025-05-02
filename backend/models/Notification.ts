import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Notification row type from the database types
export type NotificationRow = Tables<"notifications">;
export type NotificationInsert = TablesInsert<"notifications">;
export type NotificationUpdate = TablesUpdate<"notifications">;

// Extend the database type with additional properties/methods
export interface Notification
  extends Omit<NotificationRow, "created_at" | "upated_at"> {
  // Override date properties to allow Date objects
  created_at: string | Date;
  updated_at?: string | Date | null; // Naming fixed from upated_at to updated_at

  // Additional properties
  message?: string | null; // Fixed typo from messsage to message
  read?: boolean | null; // For compatibility with existing code using read instead of is_read
  user_id?: string; // For compatibility with old code
}

// Utility functions for working with Notifications
export const NotificationUtils = {
  // Convert database date strings to JavaScript Date objects
  toModel(data: NotificationRow): Notification {
    return {
      ...data,
      // Fix typo in database field
      message: data.messsage,
      // Map is_read to read for backward compatibility
      read: data.is_read,
      // Convert date strings to Date objects
      created_at: data.created_at
        ? new Date(data.created_at)
        : new Date().toISOString(),
      updated_at: data.upated_at ? new Date(data.upated_at) : undefined,
    };
  },

  // Convert JavaScript model to database format for inserts
  toInsert(notification: Partial<Notification>): NotificationInsert {
    const { message, read, updated_at, ...dbNotification } =
      notification as any;

    // Convert read to is_read
    if (read !== undefined) {
      dbNotification.is_read = read;
    }

    // Fix typo in database field
    if (message !== undefined) {
      dbNotification.messsage = message;
    }

    // Convert Date objects to strings
    if (notification.created_at && notification.created_at instanceof Date) {
      dbNotification.created_at = notification.created_at.toISOString();
    }

    if (updated_at && updated_at instanceof Date) {
      dbNotification.upated_at = updated_at.toISOString();
    }

    return dbNotification as NotificationInsert;
  },
};
