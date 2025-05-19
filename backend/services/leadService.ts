import supabase from "../config/supabase.ts";
import { LeadInsert, LeadRow, LeadUpdate } from "../models/Lead.ts";
import { createMessage } from "./messageService.ts";
import { getUserSettings } from "./userSettingsService.ts";
import logger from "../utils/logger.ts";
import { LeadStatus } from "../../shared/types/leadTypes.ts";

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
        status: status || LeadStatus.NEW, // Default to "new" status if not provided
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

/**
 * Updates the lead status based on message history
 * - "In Conversation": Lead has responded to at least one message
 * - "Inactive": Lead hasn't responded to at least 10 messages
 *
 * @param leadId The ID of the lead to update
 * @returns Updated lead data
 */
export const updateLeadStatusBasedOnMessages = async (
  leadId: number
): Promise<LeadRow> => {
  try {
    // Get all messages for this lead
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (messagesError) throw new Error(messagesError.message);

    // Get current lead data
    const lead = await getLeadById(leadId);
    if (!lead) throw new Error(`Lead with ID ${leadId} not found`);

    // Count messages from lead (user responses)
    const leadMessages = messages.filter((msg) => msg.sender === "lead");

    // Count consecutive messages from agent with no response
    const agentMessages = messages.filter(
      (msg) => msg.sender === "agent" && msg.delivery_status === "delivered"
    );

    let consecutiveAgentMessages = 0;
    let lastLeadMessageIndex = -1;

    // Find the last message from the lead
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "lead") {
        lastLeadMessageIndex = i;
        break;
      }
    }

    // Count how many consecutive agent messages there have been since the last lead message
    if (lastLeadMessageIndex >= 0) {
      consecutiveAgentMessages = messages.length - lastLeadMessageIndex - 1;
    } else {
      // If the lead has never sent a message, count all agent messages
      consecutiveAgentMessages = agentMessages.length;
    }

    let newStatus = lead.status;

    // Update status based on message history
    if (leadMessages.length > 0) {
      // If lead has ever responded, they're "in conversation"
      newStatus = LeadStatus.IN_CONVERSATION;

      // But if they haven't responded to 10+ consecutive messages, mark as inactive
      if (consecutiveAgentMessages >= 10) {
        newStatus = LeadStatus.INACTIVE;
      }
    } else {
      // If lead has never responded, keep them as new
      newStatus = LeadStatus.NEW;
    }

    // Only update if status has changed
    if (newStatus !== lead.status) {
      const updatedLead = await updateLead(leadId, { status: newStatus });

      // Schedule a follow-up based on new status
      await scheduleNextFollowUp(leadId);

      return updatedLead;
    }

    return lead;
  } catch (error) {
    console.error(`Error updating lead status: ${error.message}`);
    throw error;
  }
};

/**
 * Schedules the next follow-up message for a lead based on their status and user settings
 *
 * @param leadId The ID of the lead to schedule a follow-up for
 * @returns Promise<void>
 */
export const scheduleNextFollowUp = async (leadId: number): Promise<void> => {
  try {
    // Get lead data
    const lead = await getLeadById(leadId);
    if (!lead || !lead.is_ai_enabled) {
      logger.info(
        `No follow-up scheduled for lead ${leadId}: AI is disabled or lead not found`
      );
      return;
    }

    // Get user settings for follow-up intervals
    const userSettings = await getUserSettings(lead.user_uuid);

    // Determine appropriate interval based on lead status
    let intervalDays = 0;
    switch (lead.status) {
      case LeadStatus.NEW:
        intervalDays = userSettings.follow_up_interval_new;
        break;
      case LeadStatus.IN_CONVERSATION:
        intervalDays = userSettings.follow_up_interval_in_converesation;
        break;
      case LeadStatus.INACTIVE:
        intervalDays = userSettings.follow_up_interval_inactive;
        break;
      default:
        intervalDays = userSettings.follow_up_interval_in_converesation;
    }

    // Check if there's already a pending scheduled message
    const { data: pendingMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .eq("delivery_status", "scheduled")
      .gt("scheduled_at", new Date().toISOString());

    // If there's already a scheduled message, don't create another one
    if (pendingMessages && pendingMessages.length > 0) {
      logger.info(`Follow-up already scheduled for lead ${leadId}, skipping`);
      return;
    }

    // Calculate next follow-up date (current date + interval days)
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + intervalDays);

    // Create a new scheduled message
    await createMessage({
      lead_id: leadId,
      sender: "agent",
      is_ai_generated: true,
      delivery_status: "scheduled",
      scheduled_at: scheduledAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logger.info(
      `Scheduled follow-up for lead ${leadId} with status "${
        lead.status
      }" on ${scheduledAt.toISOString()}`
    );
  } catch (error) {
    logger.error(
      `Error scheduling follow-up for lead ${leadId}: ${error.message}`
    );
    // Don't throw to prevent disrupting the workflow
  }
};
