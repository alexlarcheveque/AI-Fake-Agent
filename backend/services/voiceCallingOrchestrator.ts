import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";
import { initiateCall } from "./twilioVoiceService.ts";
import { LeadRow } from "../models/Lead.ts";

/**
 * Check if current time is within calling hours for a user
 */
export const isWithinCallingHours = (userSettings: any): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const startHour = userSettings.voice_calling_hours_start || 11;
  const endHour = userSettings.voice_calling_hours_end || 19;
  const allowedDays = userSettings.voice_calling_days || [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  // Check if current day is allowed
  if (!allowedDays.includes(currentDay)) {
    return false;
  }

  // Check if current hour is within allowed range
  return currentHour >= startHour && currentHour < endHour;
};

/**
 * Check if a lead has exceeded quarterly call limits
 */
export const hasExceededQuarterlyLimit = async (
  leadId: number,
  userSettings: any
): Promise<boolean> => {
  try {
    const quarterlyLimit = userSettings.quarterly_call_limit || 1;

    // Calculate start of current quarter
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);

    // Count calls made to this lead in current quarter
    const { data, error } = await supabase
      .from("calls")
      .select("id")
      .eq("lead_id", leadId)
      .gte("created_at", quarterStart.toISOString());

    if (error) {
      logger.error("Error checking quarterly call limit:", error);
      return false; // Allow call if we can't check limit
    }

    const callCount = data?.length || 0;
    return callCount >= quarterlyLimit;
  } catch (error) {
    logger.error("Error in hasExceededQuarterlyLimit:", error);
    return false;
  }
};

/**
 * Check if enough time has passed since last call attempt
 */
export const canMakeCallAttempt = (
  lead: LeadRow,
  minHoursBetweenCalls: number = 24
): boolean => {
  if (!lead.last_call_attempt) {
    return true;
  }

  const lastAttempt = new Date(lead.last_call_attempt);
  const now = new Date();
  const hoursSinceLastAttempt =
    (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastAttempt >= minHoursBetweenCalls;
};

/**
 * Determine call type based on lead status and history
 */
export const determineCallType = (
  lead: LeadRow
): "new_lead" | "follow_up" | "reactivation" => {
  if (!lead.last_call_attempt) {
    return "new_lead";
  }

  if (lead.status === "inactive") {
    return "reactivation";
  }

  return "follow_up";
};

/**
 * Process new leads for calling
 */
export const processNewLeads = async (): Promise<void> => {
  try {
    logger.info("Processing new leads for voice calling...");

    // Get all new leads created in the last hour that haven't been called yet
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: newLeads, error } = await supabase
      .from("leads")
      .select("*")
      .is("last_call_attempt", null)
      .eq("is_ai_enabled", true)
      .eq("voice_calling_enabled", true)
      .gte("created_at", oneHourAgo.toISOString());

    if (error) {
      logger.error("Error fetching new leads:", error);
      return;
    }

    if (!newLeads || newLeads.length === 0) {
      logger.info("No new leads found for calling");
      return;
    }

    for (const lead of newLeads) {
      await processLeadForCalling(lead, "new_lead");
    }
  } catch (error) {
    logger.error("Error processing new leads:", error);
  }
};

/**
 * Process inactive leads for reactivation calls
 */
export const processInactiveLeads = async (): Promise<void> => {
  try {
    logger.info("Processing inactive leads for reactivation calls...");

    // Get inactive leads that haven't been called in the current quarter
    const { data: inactiveLeads, error } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "inactive")
      .eq("is_ai_enabled", true)
      .eq("voice_calling_enabled", true);

    if (error) {
      logger.error("Error fetching inactive leads:", error);
      return;
    }

    if (!inactiveLeads || inactiveLeads.length === 0) {
      logger.info("No inactive leads found for calling");
      return;
    }

    for (const lead of inactiveLeads) {
      await processLeadForCalling(lead, "reactivation");
    }
  } catch (error) {
    logger.error("Error processing inactive leads:", error);
  }
};

/**
 * Process a single lead for calling
 */
export const processLeadForCalling = async (
  lead: LeadRow,
  callType: "new_lead" | "follow_up" | "reactivation"
): Promise<boolean> => {
  try {
    logger.info(
      `Processing lead ${lead.id} (${lead.name}) for ${callType} call`
    );

    // Check if lead has voice calling enabled
    if (!lead.voice_calling_enabled) {
      logger.info(`Voice calling disabled for lead ${lead.id}`);
      return false;
    }

    // Get user settings
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("uuid", lead.user_uuid)
      .single();

    if (settingsError || !userSettings) {
      logger.error(
        `User settings not found for lead ${lead.id}:`,
        settingsError
      );
      return false;
    }

    // Check if voice calling is enabled globally for this user
    if (!userSettings.voice_calling_enabled) {
      logger.info(`Voice calling disabled for user ${lead.user_uuid}`);
      return false;
    }

    // Check calling hours
    if (!isWithinCallingHours(userSettings)) {
      logger.info(`Outside calling hours for lead ${lead.id}`);
      return false;
    }

    // Check quarterly limits for inactive leads
    if (callType === "reactivation") {
      const exceededLimit = await hasExceededQuarterlyLimit(
        lead.id,
        userSettings
      );
      if (exceededLimit) {
        logger.info(`Quarterly call limit exceeded for lead ${lead.id}`);
        return false;
      }
    }

    // Check minimum time between calls
    if (!canMakeCallAttempt(lead, 2)) {
      // Minimum 2 hours between calls
      logger.info(`Too soon since last call attempt for lead ${lead.id}`);
      return false;
    }

    // Initiate the call
    try {
      const call = await initiateCall({
        leadId: lead.id,
        callType,
        voiceId: userSettings.elevenlabs_voice_id,
      });

      logger.info(
        `Call initiated successfully for lead ${lead.id}, call ID: ${call.id}`
      );
      return true;
    } catch (callError) {
      logger.error(`Failed to initiate call for lead ${lead.id}:`, callError);
      return false;
    }
  } catch (error) {
    logger.error(`Error processing lead ${lead.id} for calling:`, error);
    return false;
  }
};

/**
 * Manual call initiation (for UI button clicks)
 */
export const initiateManualCall = async (
  leadId: number,
  conversational: boolean = false
): Promise<{ success: boolean; message: string; callId?: number }> => {
  try {
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, message: "Lead not found" };
    }

    // Get user settings
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("uuid", lead.user_uuid)
      .single();

    if (settingsError || !userSettings) {
      return { success: false, message: "User settings not found" };
    }

    // Check if voice calling is enabled
    if (!userSettings.voice_calling_enabled || !lead.voice_calling_enabled) {
      return { success: false, message: "Voice calling is disabled" };
    }

    // Check calling hours
    if (!isWithinCallingHours(userSettings)) {
      return {
        success: false,
        message: `Calls are only allowed between ${
          userSettings.voice_calling_hours_start || 11
        }:00 and ${userSettings.voice_calling_hours_end || 19}:00`,
      };
    }

    // Determine call type
    const callType = determineCallType(lead);

    // Check quarterly limits for reactivation calls
    if (callType === "reactivation") {
      const exceededLimit = await hasExceededQuarterlyLimit(
        leadId,
        userSettings
      );
      if (exceededLimit) {
        return {
          success: false,
          message: "Quarterly call limit exceeded for this lead",
        };
      }
    }

    // Initiate the call
    try {
      const call = await initiateCall({
        leadId,
        callType,
        voiceId: userSettings.elevenlabs_voice_id,
        conversational,
      });

      return {
        success: true,
        message: conversational
          ? "Conversational AI call initiated successfully"
          : "Call initiated successfully",
        callId: call.id,
      };
    } catch (callError) {
      logger.error(`Failed to initiate call for lead ${leadId}:`, callError);
      return { success: false, message: "Failed to initiate call" };
    }
  } catch (error) {
    logger.error(`Error initiating manual call for lead ${leadId}:`, error);
    return { success: false, message: "Failed to initiate call" };
  }
};

/**
 * Get calling statistics for a user
 */
export const getCallingStats = async (userUuid: string) => {
  try {
    // Get current quarter boundaries
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);

    // Get user's lead IDs first
    const { data: userLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .eq("user_uuid", userUuid);

    if (leadsError) {
      throw leadsError;
    }

    const leadIds = userLeads?.map((lead) => lead.id) || [];

    // Get calls made this quarter
    const { data: quarterCalls, error: quarterError } = await supabase
      .from("calls")
      .select("id, status, call_type, lead_id")
      .gte("created_at", quarterStart.toISOString())
      .in("lead_id", leadIds);

    if (quarterError) {
      throw quarterError;
    }

    // Get calls made today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayCalls, error: todayError } = await supabase
      .from("calls")
      .select("id, status, call_type")
      .gte("created_at", todayStart.toISOString())
      .in("lead_id", leadIds);

    if (todayError) {
      throw todayError;
    }

    return {
      quarterTotal: quarterCalls?.length || 0,
      quarterCompleted:
        quarterCalls?.filter((call) => call.status === "completed").length || 0,
      todayTotal: todayCalls?.length || 0,
      todayCompleted:
        todayCalls?.filter((call) => call.status === "completed").length || 0,
      callTypes: {
        new_lead:
          quarterCalls?.filter((call) => call.call_type === "new_lead")
            .length || 0,
        follow_up:
          quarterCalls?.filter((call) => call.call_type === "follow_up")
            .length || 0,
        reactivation:
          quarterCalls?.filter((call) => call.call_type === "reactivation")
            .length || 0,
      },
    };
  } catch (error) {
    logger.error(`Error getting calling stats for user ${userUuid}:`, error);
    throw error;
  }
};

export default {
  processNewLeads,
  processInactiveLeads,
  processLeadForCalling,
  initiateManualCall,
  getCallingStats,
  isWithinCallingHours,
  hasExceededQuarterlyLimit,
  canMakeCallAttempt,
  determineCallType,
};
