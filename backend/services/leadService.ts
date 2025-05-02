import supabase from "../config/supabase";
import { Lead, LeadInsert, LeadUpdate, LeadUtils } from "../models/Lead";

interface CreateLeadSettings {
  user_id?: number;
  user_uuid?: string;
  name: string;
  phone_number: number;
  email?: string | null;
  status?: string | null;
  is_ai_enabled?: boolean | null;
  last_message_date?: string | null;
  created_at?: string;
  updated_at?: string;
  is_archived?: boolean | null;
  lead_type?: string | null;
  context?: string | null;
}

export const createLead = async (
  settings: CreateLeadSettings
): Promise<Lead[]> => {
  const {
    user_id,
    user_uuid,
    name,
    phone_number,
    email,
    status,
    is_ai_enabled,
    last_message_date,
    created_at,
    updated_at,
    is_archived,
    lead_type,
    context,
  } = settings;

  // Ensure we have a user_uuid
  const lead_user_uuid =
    user_uuid || (user_id ? user_id.toString() : undefined);

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        user_uuid: lead_user_uuid,
        name,
        phone_number,
        email,
        status,
        is_ai_enabled,
        last_message_date, // This might need conversion if your DB schema changed
        created_at,
        updated_at, // This might need conversion if your DB schema changed
        is_archived,
        lead_type,
        context,
      },
    ])
    .select();

  if (error) throw new Error(error.message);
  return data.map((lead) => LeadUtils.toModel(lead));
};

export const getLeadsByUserId = async (userId: string): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_uuid", userId);

  if (error) throw new Error(error.message);
  return data.map((lead) => LeadUtils.toModel(lead));
};

export const getLeadById = async (id: number): Promise<Lead | null> => {
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
