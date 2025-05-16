import supabase from "../config/supabase.ts";
import { LeadInsert, LeadRow, LeadUpdate } from "../models/Lead.ts";

// Define lead limits for different subscription plans
const LEAD_LIMITS = {
  FREE: 10,
  PREMIUM: 100,
  UNLIMITED: Infinity,
};

// Function to check if a user has reached their lead limit
export const checkLeadLimit = async (
  userId: string
): Promise<{
  canCreateLead: boolean;
  currentCount: number;
  limit: number;
  subscriptionPlan: string;
}> => {
  // Get the user's subscription plan
  const { data: userSettings, error: userError } = await supabase
    .from("user_settings")
    .select("subscription_plan")
    .eq("uuid", userId)
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  // Default to FREE plan if no subscription_plan is set
  const subscriptionPlan = userSettings?.subscription_plan || "FREE";

  // Get the lead limit based on the subscription plan
  const limit = LEAD_LIMITS[subscriptionPlan] || LEAD_LIMITS.FREE;

  // Count the user's existing leads
  const { count, error: countError } = await supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("user_uuid", userId)
    .eq("is_archived", false);

  if (countError) {
    throw new Error(countError.message);
  }

  const currentCount = count || 0;
  const canCreateLead = currentCount < limit;

  return {
    canCreateLead,
    currentCount,
    limit,
    subscriptionPlan,
  };
};

export const createLead = async (user, settings: LeadRow): Promise<LeadRow> => {
  const {
    name,
    email,
    phone_number,
    status,
    is_ai_enabled,
    lead_type,
    context,
    first_message,
  } = settings;

  console.log("create lead settings", settings);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if the user has reached their lead limit
  const { canCreateLead, limit, currentCount } = await checkLeadLimit(user.id);

  if (!canCreateLead) {
    throw new Error(
      `Lead limit reached. Your plan allows ${limit} leads. You currently have ${currentCount} leads. Please upgrade your plan to add more leads.`
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        name,
        email,
        phone_number,
        status,
        lead_type,
        is_ai_enabled,
        is_archived: false,
        user_uuid: user?.id,
        context,
        first_message,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getLeadsByUserId = async (userId: string): Promise<LeadRow[]> => {
  const { data, error }: { data: LeadRow[]; error: any } = await supabase
    .from("leads")
    .select("*")
    .eq("user_uuid", userId)
    .eq("is_archived", false);

  if (error) throw new Error(error.message);
  return data;
};

export const getLeadById = async (id: number): Promise<LeadRow> => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("is_archived", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows returned
    throw new Error(error.message);
  }
  return data;
};

export const updateLead = async (
  id: number,
  settings: Partial<LeadRow>
): Promise<LeadRow> => {
  // Convert to database format
  const updateData = settings;

  const { data, error } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", id)
    .eq("is_archived", false)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteLead = async (id: number): Promise<LeadRow> => {
  const { data, error } = await supabase
    .from("leads")
    .update({ is_archived: true }) // Fixed field name (isArchived -> is_archived)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Added new function for searching leads
export const searchLeads = async (
  userId: string,
  searchTerm: string = "",
  searchFields: string[] = ["name", "email", "phone_number"],
  page: number = 1,
  pageSize: number = 10
): Promise<{
  leads: LeadRow[];
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
    leads: data,
    totalLeads: count || 0,
    totalPages,
    currentPage: page,
  };
};
