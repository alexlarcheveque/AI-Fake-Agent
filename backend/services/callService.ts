import supabase from "../config/supabase.ts";
import { getUserSettings } from "./userSettingsService.ts";
import {
  getLeadById,
  updateLeadStatusBasedOnCommunications,
} from "./leadService.ts";
import { createMessage } from "./messageService.ts";
import logger from "../utils/logger.ts";

export interface CallInsert {
  lead_id: number;
  direction: "inbound" | "outbound";
  status:
    | "scheduled"
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "failed"
    | "no-answer"
    | "busy"
    | "canceled";
  to_number: string;
  from_number: string;
  call_type: "new_lead" | "follow_up" | "reactivation";
  call_mode: "ai" | "manual";
  attempt_number: number;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  is_voicemail: boolean;
}

export interface CallRow extends CallInsert {
  id: number;
  twilio_call_sid?: string;
  duration?: number;
  started_at?: string;
  ended_at?: string;
  ai_summary?: string;
  sentiment_score?: number;
  lead_interest_level?: string;
  recording_url?: string;
  action_items?: string[];
  customer_interest_level?: "high" | "medium" | "low";
  commitment_details?: string;
}

/**
 * Schedule the initial call for new leads
 * Call #2 will be triggered by webhook when Call #1 completes
 */
export const scheduleNewLeadCalls = async (leadId: number): Promise<void> => {
  try {
    const lead = await getLeadById(leadId);
    if (!lead || !lead.phone_number) {
      logger.error(
        `Cannot schedule calls for lead ${leadId}: missing phone number`
      );
      return;
    }

    // Schedule only Call #1 immediately
    // Call #2 will be triggered by the webhook when Call #1 completes unsuccessfully
    await createCall({
      lead_id: leadId,
      direction: "outbound",
      status: "scheduled",
      to_number: lead.phone_number.toString(),
      from_number: process.env.TWILIO_PHONE_NUMBER!,
      call_type: "new_lead",
      call_mode: "ai",
      attempt_number: 1,
      scheduled_at: new Date().toISOString(), // Immediate
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_voicemail: false,
    });

    logger.info(`Scheduled initial call for new lead ${leadId}`);
  } catch (error) {
    logger.error(`Error scheduling new lead calls for lead ${leadId}:`, error);
    throw error;
  }
};

/**
 * Create a scheduled call record
 */
export const createCall = async (callData: CallInsert): Promise<CallRow> => {
  const { data, error } = await supabase
    .from("calls")
    .insert([callData])
    .select()
    .single();

  if (error) {
    logger.error("Error creating call:", error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Get scheduled calls that are overdue (should be processed now)
 */
export const getScheduledCallsThatAreOverdue = async (): Promise<CallRow[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .lte("scheduled_at", now)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    logger.error("Error fetching overdue calls:", error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Update call status
 */
export const updateCall = async (
  callId: number,
  updates: Partial<CallRow>
): Promise<CallRow> => {
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("calls")
    .update(updates)
    .eq("id", callId)
    .select()
    .single();

  if (error) {
    logger.error(`Error updating call ${callId}:`, error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Handle call completion and immediately trigger Call #2 if Call #1 failed
 */
export const handleCallCompletion = async (
  callId: number,
  status: "completed" | "failed" | "no-answer" | "busy",
  isVoicemail: boolean = false
): Promise<void> => {
  try {
    const call = await getCallById(callId);
    if (!call) {
      logger.error(`Call ${callId} not found`);
      return;
    }

    // Update the call record
    await updateCall(callId, {
      status,
      is_voicemail: isVoicemail,
      ended_at: new Date().toISOString(),
    });

    // If this was Call #1 and it was successful (human answered), we're done
    if (call.attempt_number === 1 && status === "completed" && !isVoicemail) {
      logger.info(`Call #1 (${callId}) completed successfully - lead answered`);
      return;
    }

    // For new lead calls, decide whether to make Call #2
    if (call.call_type === "new_lead" && call.attempt_number === 1) {
      // If Call #1 was definitively voicemail, skip Call #2 since it will hit the same voicemail
      if (isVoicemail) {
        logger.info(
          `Call #1 (${callId}) hit voicemail for lead ${call.lead_id} - skipping Call #2 since it would hit the same voicemail. Scheduling fallback text instead.`
        );
        // Go directly to fallback text instead of making a second call
        await scheduleFallbackText(call.lead_id, true);
        return;
      }

      // For non-voicemail failures (busy, no answer, failed), make Call #2
      logger.info(
        `Call #1 failed for lead ${call.lead_id} (${status}) - making Call #2`
      );
      await makeImmediateCall(call.lead_id, 2);
      return;
    }

    // If this was Call #2, we're done with calls - schedule fallback text
    if (call.attempt_number === 2) {
      logger.info(
        `Call #2 completed for lead ${call.lead_id} (${
          isVoicemail ? "voicemail detected" : status
        }), scheduling fallback text`
      );

      // Schedule fallback text message
      await scheduleFallbackText(call.lead_id, isVoicemail);
    }

    // For other call types, just update and return
    logger.info(`Call ${callId} completed with status: ${status}`);
  } catch (error) {
    logger.error(`Error handling call completion for call ${callId}:`, error);
  }
};

/**
 * Schedule fallback text message after both calls fail
 */
export const scheduleFallbackText = async (
  leadId: number,
  detectedVoicemail: boolean
): Promise<void> => {
  try {
    const messageType = detectedVoicemail
      ? "voicemail_2calls"
      : "missed_2calls";

    // Schedule immediate text message
    await createMessage({
      lead_id: leadId,
      sender: "agent",
      is_ai_generated: true,
      delivery_status: "scheduled",
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add metadata to indicate this is a fallback after call
      call_fallback_type: messageType,
    });

    logger.info(
      `Scheduled fallback text for lead ${leadId} (type: ${messageType})`
    );
  } catch (error) {
    logger.error(`Error scheduling fallback text for lead ${leadId}:`, error);
  }
};

/**
 * Get call by ID
 */
export const getCallById = async (callId: number): Promise<CallRow | null> => {
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error(`Error fetching call ${callId}:`, error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Schedule follow-up calls based on lead status and user settings
 */
export const scheduleFollowUpCalls = async (leadId: number): Promise<void> => {
  try {
    const lead = await getLeadById(leadId);
    if (!lead || !lead.is_ai_enabled || !lead.phone_number) {
      logger.info(
        `No follow-up calls scheduled for lead ${leadId}: AI disabled or no phone`
      );
      return;
    }

    const userSettings = await getUserSettings(lead.user_uuid);

    // Determine call interval based on lead status (same as message intervals for now)
    let intervalDays = 0;
    let callType: "follow_up" | "reactivation" = "follow_up";

    switch (lead.status) {
      case "new":
        intervalDays = userSettings.follow_up_interval_new;
        break;
      case "in_conversation":
        intervalDays = userSettings.follow_up_interval_in_converesation;
        break;
      case "inactive":
        intervalDays = userSettings.follow_up_interval_inactive;
        callType = "reactivation";
        break;
      default:
        intervalDays = userSettings.follow_up_interval_in_converesation;
    }

    // Don't schedule follow-up calls for converted leads
    if (lead.status === "converted") {
      logger.info(`No follow-up calls scheduled for converted lead ${leadId}`);
      return;
    }

    // Check if there's already a pending scheduled call
    const { data: pendingCalls } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "scheduled")
      .gt("scheduled_at", new Date().toISOString());

    if (pendingCalls && pendingCalls.length > 0) {
      logger.info(
        `Follow-up call already scheduled for lead ${leadId}, skipping`
      );
      return;
    }

    // Schedule follow-up call
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + intervalDays);

    await createCall({
      lead_id: leadId,
      direction: "outbound",
      status: "scheduled",
      to_number: lead.phone_number.toString(),
      from_number: process.env.TWILIO_PHONE_NUMBER!,
      call_type: callType,
      call_mode: "ai",
      attempt_number: 1,
      scheduled_at: scheduledAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_voicemail: false,
    });

    logger.info(
      `Scheduled follow-up call for lead ${leadId} on ${scheduledAt.toISOString()}`
    );
  } catch (error) {
    logger.error(`Error scheduling follow-up calls for lead ${leadId}:`, error);
  }
};

/**
 * Make an immediate call (bypassing the cron scheduler)
 */
export const makeImmediateCall = async (
  leadId: number,
  attemptNumber: number = 1
): Promise<void> => {
  try {
    const lead = await getLeadById(leadId);
    if (!lead || !lead.phone_number) {
      logger.error(`Cannot make call for lead ${leadId}: missing phone number`);
      return;
    }

    // Create call record
    const call = await createCall({
      lead_id: leadId,
      direction: "outbound",
      status: "queued",
      to_number: lead.phone_number.toString(),
      from_number: process.env.TWILIO_PHONE_NUMBER!,
      call_type: "new_lead",
      call_mode: "ai",
      attempt_number: attemptNumber,
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_voicemail: false,
    });

    // Import the initiateAICall function dynamically to avoid circular imports
    const { initiateAICall } = await import("../controllers/callController.ts");

    // Make the call immediately
    logger.info(
      `Making immediate call ${call.id} (attempt #${attemptNumber}) for lead ${leadId}`
    );

    // Create a mock request object for the initiateAICall function
    const mockReq = {
      body: {
        leadId: leadId,
      },
    } as any;

    await initiateAICall(mockReq, null as any);

    logger.info(
      `Successfully initiated immediate call for lead ${leadId} (attempt #${attemptNumber})`
    );
  } catch (error) {
    logger.error(`Error making immediate call for lead ${leadId}:`, error);
  }
};
