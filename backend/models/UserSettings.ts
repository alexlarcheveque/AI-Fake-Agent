import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the UserSettings row type from the database types
export type UserSettingsRow = Tables<"user_settings">;
export type UserSettingsInsert = TablesInsert<"user_settings">;
export type UserSettingsUpdate = TablesUpdate<"user_settings">;

export interface UserSettingsModel {
  id?: string;
  agentName: string;
  companyName: string;
  agentState: string;
  followUpIntervalNew?: number;
  followUpIntervalInConversation?: number;
  followUpIntervalInactive?: number;
}

// Utility functions for working with UserSettings
export const UserSettingsUtils = {
  // Convert database date strings to JavaScript Date objects
  toModel(data: UserSettingsRow): UserSettingsModel {
    return {
      agentName: data.agent_name,
      companyName: data.company_name,
      agentState: data.agent_state,
      followUpIntervalNew: data.follow_up_interval_new,
      followUpIntervalInConversation: data.follow_up_interval_in_converesation,
      followUpIntervalInactive: data.follow_up_interval_inactive,
    };
  },

  // Convert JavaScript model to database format for inserts
  toInsert(settings: Partial<UserSettingsRow>): UserSettingsInsert {
    const { created_at_date, ...dbSettings } = settings as any;
    return dbSettings as UserSettingsInsert;
  },
};
