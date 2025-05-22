import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the UserSettings row type from the database types
export type SearchCriteriaRow = Tables<"search_criterias">;
export type SearchCriteriaInsert = TablesInsert<"search_criterias">;
export type SearchCriteriaUpdate = TablesUpdate<"search_criterias">;
