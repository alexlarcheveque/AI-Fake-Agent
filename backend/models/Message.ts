import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Message row type from the database types
export type MessageRow = Tables<"messages">;
export type MessageInsert = TablesInsert<"messages">;
export type MessageUpdate = TablesUpdate<"messages">;
