import supabase from "../config/supabase.ts";
import { LeadInsert, LeadRow, LeadUpdate } from "../models/Lead.ts";
import { createMessage } from "./messageService.ts";
import { getUserSettings } from "./userSettingsService.ts";
import { calculateLeadScores } from "./leadScoringService.ts";
import logger from "../utils/logger.ts";

// Define the enum locally
export enum LeadStatus {
  NEW = "new",
  IN_CONVERSATION = "in_conversation",
  CONVERTED = "converted",
  INACTIVE = "inactive",
}

// Define lead limits for different subscription plans
const LEAD_LIMITS = {
  FREE: 10,
  PRO: 1000,
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
    .eq("is_archived", false)
    .neq("status", LeadStatus.CONVERTED)
    .order("overall_score", { ascending: false });

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
 * Updates the lead status based on both message and call history
 * - "In Conversation": Lead has responded to at least one message/call
 * - "Inactive": Lead hasn't responded to 10+ messages/calls OR 10+ messages/calls failed in a row
 *
 * @param leadId The ID of the lead to update
 * @returns Updated lead data
 */
export const updateLeadStatusBasedOnCommunications = async (
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

    // Get all calls for this lead
    const { data: calls, error: callsError } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (callsError) throw new Error(callsError.message);

    // Get current lead data
    const lead = await getLeadById(leadId);
    if (!lead) throw new Error(`Lead with ID ${leadId} not found`);

    // Don't automatically update CONVERTED status - it's a terminal state
    if (lead.status === LeadStatus.CONVERTED) {
      logger.info(
        `Not auto-updating lead ${leadId} with CONVERTED status as it's a terminal state`
      );
      return lead;
    }

    // Combine messages and calls into a single chronological array
    const communications = [
      ...messages.map((msg) => ({
        type: "message" as const,
        created_at: msg.created_at,
        sender: msg.sender,
        delivery_status: msg.delivery_status,
        data: msg,
      })),
      ...calls.map((call) => ({
        type: "call" as const,
        created_at: call.created_at,
        sender: call.direction === "outbound" ? "agent" : "lead",
        delivery_status: call.status,
        data: call,
      })),
    ].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Count responses from lead
    const leadResponses = communications.filter(
      (comm) => comm.sender === "lead"
    );

    // Analyze consecutive attempts and failures from the end of the timeline
    let consecutiveNoResponse = 0;
    let consecutiveFailures = 0;
    let lastLeadResponseIndex = -1;

    // Find the last response from the lead
    for (let i = communications.length - 1; i >= 0; i--) {
      if (communications[i].sender === "lead") {
        lastLeadResponseIndex = i;
        break;
      }
    }

    // Count consecutive agent attempts without response since last lead response
    if (lastLeadResponseIndex >= 0) {
      consecutiveNoResponse = communications.length - lastLeadResponseIndex - 1;
    } else {
      // If lead has never responded, count all agent attempts
      consecutiveNoResponse = communications.filter(
        (comm) => comm.sender === "agent"
      ).length;
    }

    // Count consecutive failures from the end
    for (let i = communications.length - 1; i >= 0; i--) {
      const comm = communications[i];

      // Only count agent attempts for consecutive failures
      if (comm.sender !== "agent") break;

      // Check if this communication failed
      const isFailed = isCommunicationFailed(comm);

      if (isFailed) {
        consecutiveFailures++;
      } else {
        // If we hit a successful attempt, stop counting consecutive failures
        break;
      }
    }

    let newStatus = lead.status;

    // Update status based on communication history
    if (leadResponses.length > 0) {
      // If lead has ever responded, they're "in conversation"
      newStatus = LeadStatus.IN_CONVERSATION;

      // But if they haven't responded to 10+ consecutive attempts OR 10+ consecutive failures, mark as inactive
      if (consecutiveNoResponse >= 10 || consecutiveFailures >= 10) {
        newStatus = LeadStatus.INACTIVE;

        const reason =
          consecutiveFailures >= 10
            ? `${consecutiveFailures} consecutive communication failures`
            : `${consecutiveNoResponse} consecutive attempts without response`;

        logger.info(`Marking lead ${leadId} as inactive due to: ${reason}`);
      }
    } else {
      // If lead has never responded but we have 10+ consecutive failures, mark as inactive
      if (consecutiveFailures >= 10) {
        newStatus = LeadStatus.INACTIVE;
        logger.info(
          `Marking lead ${leadId} as inactive due to ${consecutiveFailures} consecutive communication failures (no prior responses)`
        );
      } else {
        // If lead has never responded and no consecutive failures, keep them as new
        newStatus = LeadStatus.NEW;
      }
    }

    let updatedLead = lead;

    // Only update if status has changed
    if (newStatus !== lead.status) {
      updatedLead = await updateLead(leadId, { status: newStatus });

      // Schedule a follow-up based on new status
      await scheduleNextFollowUp(leadId);
    }

    // Update lead scores after any interaction
    try {
      await calculateLeadScores(leadId);
      logger.info(
        `Updated lead scores for lead ${leadId} after communication interaction`
      );
    } catch (scoringError) {
      logger.error(
        `Error updating lead scores for lead ${leadId}: ${scoringError.message}`
      );
      // Don't throw to prevent disrupting the main workflow
    }

    return updatedLead;
  } catch (error) {
    console.error(`Error updating lead status: ${error.message}`);
    throw error;
  }
};

/**
 * Helper function to determine if a communication attempt failed
 */
const isCommunicationFailed = (communication: any): boolean => {
  if (communication.type === "message") {
    // Message failures: "failed" status or specific error conditions
    return communication.delivery_status === "failed";
  } else if (communication.type === "call") {
    // Call failures: "failed", "busy", "no-answer", "canceled" statuses
    return ["failed", "busy", "no-answer", "canceled"].includes(
      communication.delivery_status
    );
  }
  return false;
};

/**
 * Updates the lead status based on message history
 * - "In Conversation": Lead has responded to at least one message
 * - "Inactive": Lead hasn't responded to at least 10 messages
 *
 * @param leadId The ID of the lead to update
 * @returns Updated lead data
 * @deprecated Use updateLeadStatusBasedOnCommunications instead for more comprehensive tracking
 */
export const updateLeadStatusBasedOnMessages = async (
  leadId: number
): Promise<LeadRow> => {
  // For backwards compatibility, delegate to the new comprehensive function
  logger.info(
    `updateLeadStatusBasedOnMessages called for lead ${leadId}, delegating to updateLeadStatusBasedOnCommunications`
  );
  return updateLeadStatusBasedOnCommunications(leadId);
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
      case LeadStatus.CONVERTED:
        logger.info(`No follow-up scheduled for converted lead ${leadId}`);
        return;
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
