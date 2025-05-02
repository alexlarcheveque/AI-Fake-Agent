import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the UserSettings row type from the database types
export type UserSettingsRow = Tables<"user_settings">;
export type UserSettingsInsert = TablesInsert<"user_settings">;
export type UserSettingsUpdate = TablesUpdate<"user_settings">;

// Extend the database type with additional properties/methods
export interface UserSettings extends UserSettingsRow {
  // Additional properties not in the database
  created_at_date?: Date;
}

// Utility functions for working with UserSettings
export const UserSettingsUtils = {
  // Convert database date strings to JavaScript Date objects
  toModel(data: UserSettingsRow): UserSettings {
    return {
      ...data,
      created_at_date: data.created_at ? new Date(data.created_at) : undefined,
    };
  },

  // Convert JavaScript model to database format for inserts
  toInsert(settings: Partial<UserSettings>): UserSettingsInsert {
    const { created_at_date, ...dbSettings } = settings as any;
    return dbSettings as UserSettingsInsert;
  },

  // Create default settings
  createDefault(userId: string | number): UserSettingsInsert {
    const uuid = typeof userId === "number" ? userId.toString() : userId;

    return {
      uuid,
      agent_name: "",
      company_name: "",
      agent_state: "",
      agent_city: [],
      follow_up_interval_new: 1, // 1 day
      follow_up_interval_in_converesation: 3, // 3 days
      follow_up_interval_nurture: 7, // 7 days
      follow_up_interval_inactive: 30, // 30 days
    };
  },
};
