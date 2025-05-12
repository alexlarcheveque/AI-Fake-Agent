import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the UserSettings row type from the database types
export type UserSettingsRow = Tables<"user_settings">;
export type UserSettingsInsert = TablesInsert<"user_settings">;
export type UserSettingsUpdate = TablesUpdate<"user_settings">;
