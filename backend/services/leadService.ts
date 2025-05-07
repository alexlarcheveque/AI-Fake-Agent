import supabase from "../config/supabase.ts";
import {
  Lead,
  LeadInsert,
  LeadModel,
  LeadUpdate,
  LeadUtils,
} from "../models/Lead.ts";

export const createLead = async (
  user,
  settings: LeadModel
): Promise<LeadModel> => {
  const {
    name,
    email,
    phoneNumber,
    status,
    aiAssistantEnabled,
    leadType,
    context,
  } = settings;

  console.log("create lead settings", settings);

  if (!user) {
    throw new Error("User not found");
  }

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        name,
        email,
        phone_number: phoneNumber,
        status,
        lead_type: leadType,
        is_ai_enabled: aiAssistantEnabled,
        is_archived: false,
        user_uuid: user?.id,
        context,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return LeadUtils.toModel(data);
};

export const getLeadsByUserId = async (
  userId: string
): Promise<LeadModel[]> => {
  const { data, error }: { data: Lead[]; error: any } = await supabase
    .from("leads")
    .select("*")
    .eq("user_uuid", userId);

  if (error) throw new Error(error.message);
  return data.map((lead) => LeadUtils.toModel(lead));
};

export const getLeadById = async (id: number): Promise<LeadModel> => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows returned
    throw new Error(error.message);
  }
  return LeadUtils.toModel(data);
};

export const updateLead = async (
  id: number,
  settings: Partial<Lead>
): Promise<Lead> => {
  // Convert to database format
  const updateData = LeadUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return LeadUtils.toModel(data);
};

export const deleteLead = async (id: number): Promise<Lead> => {
  const { data, error } = await supabase
    .from("leads")
    .update({ is_archived: true }) // Fixed field name (isArchived -> is_archived)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return LeadUtils.toModel(data);
};

// Added new function for searching leads
export const searchLeads = async (
  userId: string,
  searchTerm: string = "",
  searchFields: string[] = ["name", "email", "phone_number"],
  page: number = 1,
  pageSize: number = 10
): Promise<{
  leads: Lead[];
  totalLeads: number;
  totalPages: number;
  currentPage: number;
}> => {
  // Build the query
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("user_uuid", userId);

  // Add search if provided
  if (searchTerm && searchFields.length > 0) {
    const searchConditions = searchFields.map(
      (field) => `${field}.ilike.%${searchTerm}%`
    );
    query = query.or(searchConditions.join(","));
  }

  // Add pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  // Execute query
  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return {
    leads: data.map((lead) => LeadUtils.toModel(lead)),
    totalLeads: count || 0,
    totalPages,
    currentPage: page,
  };
};
