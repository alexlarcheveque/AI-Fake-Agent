import supabase from "../config/supabase.ts";
import {
  SearchCriteriaRow,
  SearchCriteriaInsert,
  SearchCriteriaUpdate,
} from "../models/SearchCriteria.ts";

// Create a new search criteria for a lead
export const createSearchCriteria = async (
  criteria: SearchCriteriaInsert
): Promise<SearchCriteriaRow> => {
  const { data, error } = await supabase
    .from("search_criterias")
    .insert([criteria])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Get search criteria by ID
export const getSearchCriteriaById = async (
  id: number
): Promise<SearchCriteriaRow | null> => {
  const { data, error } = await supabase
    .from("search_criterias")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Code for "no rows returned"
    throw new Error(error.message);
  }
  return data;
};

// Get search criteria by lead ID
export const getSearchCriteriaByLeadId = async (
  leadId: number
): Promise<SearchCriteriaRow | null> => {
  const { data, error } = await supabase
    .from("search_criterias")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Update an existing search criteria
export const updateSearchCriteria = async (
  id: number,
  updates: SearchCriteriaUpdate
): Promise<SearchCriteriaRow> => {
  const { data, error } = await supabase
    .from("search_criterias")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Delete a search criteria
export const deleteSearchCriteria = async (
  id: number
): Promise<SearchCriteriaRow> => {
  const { data, error } = await supabase
    .from("search_criterias")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Create or update search criteria for a lead
export const upsertSearchCriteria = async (
  criteria: SearchCriteriaInsert & { id?: number }
): Promise<SearchCriteriaRow> => {
  // Check if criteria already exists for this lead
  const existingCriteria = criteria.lead_id
    ? await getSearchCriteriaByLeadId(criteria.lead_id)
    : null;

  console.log("existingCriteria", existingCriteria);
  console.log("new criteria", criteria);

  if (existingCriteria) {
    // Update existing criteria
    return updateSearchCriteria(existingCriteria.id, criteria);
  } else {
    // Create new criteria
    return createSearchCriteria(criteria);
  }
};
