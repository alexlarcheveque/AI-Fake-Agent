import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

export type NotificationRow = Tables<"notifications">;
export type NotificationInsert = TablesInsert<"notifications">;
export type NotificationUpdate = TablesUpdate<"notifications">;
