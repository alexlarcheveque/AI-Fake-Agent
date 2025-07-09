import supabase from "../config/supabase.ts";
import { getUserSettings, updateUserSettings } from "./userSettingsService.ts";
import logger from "../utils/logger.ts";

// Lead limits for different plans
const LEAD_LIMITS = {
  FREE: 10,
  PRO: 1000,
  UNLIMITED: Infinity,
};

// Grace period in days for downgraded users
const DOWNGRADE_GRACE_PERIOD_DAYS = 30;

interface DowngradeResult {
  success: boolean;
  message: string;
  excessLeads: number;
  gracePeriodUntil?: string;
}

/**
 * Handle subscription downgrade with comprehensive lead and feature management
 */
export const handleSubscriptionDowngrade = async (
  userId: string,
  newPlan: "FREE" | "PRO" | "UNLIMITED",
  oldPlan: "FREE" | "PRO" | "UNLIMITED"
): Promise<DowngradeResult> => {
  try {
    logger.info(
      `Processing downgrade for user ${userId}: ${oldPlan} → ${newPlan}`
    );

    const newLimit = LEAD_LIMITS[newPlan];
    const oldLimit = LEAD_LIMITS[oldPlan];

    // If upgrading or same plan, no special handling needed
    if (newLimit >= oldLimit) {
      return {
        success: true,
        message: "Plan updated successfully",
        excessLeads: 0,
      };
    }

    // Count current active leads
    const { count: currentLeadCount, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_uuid", userId)
      .eq("is_archived", false);

    if (countError) {
      throw new Error(`Error counting leads: ${countError.message}`);
    }

    const excessLeads = Math.max(0, (currentLeadCount || 0) - newLimit);

    if (excessLeads > 0) {
      // Set grace period
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(
        gracePeriodEnd.getDate() + DOWNGRADE_GRACE_PERIOD_DAYS
      );

      // Update user settings with grace period
      await updateUserSettings(userId, {
        subscription_plan: newPlan,
        downgrade_grace_period_until: gracePeriodEnd.toISOString(),
      });

      // Archive lowest priority leads after grace period (this would be handled by a cron job)
      await scheduleLeadArchivalAfterGracePeriod(
        userId,
        newLimit,
        gracePeriodEnd
      );

      logger.info(
        `User ${userId} has ${excessLeads} excess leads. Grace period until ${gracePeriodEnd.toISOString()}`
      );

      return {
        success: true,
        message: `Plan downgraded. You have ${excessLeads} leads over the ${newLimit} limit. You have ${DOWNGRADE_GRACE_PERIOD_DAYS} days to manage your leads before the lowest priority ones are archived.`,
        excessLeads,
        gracePeriodUntil: gracePeriodEnd.toISOString(),
      };
    } else {
      // No excess leads, proceed normally
      await updateUserSettings(userId, {
        subscription_plan: newPlan,
        downgrade_grace_period_until: null,
      });

      return {
        success: true,
        message: "Plan downgraded successfully",
        excessLeads: 0,
      };
    }
  } catch (error) {
    logger.error(
      `Error handling downgrade for user ${userId}: ${error.message}`
    );
    throw error;
  }
};

/**
 * Schedule lead archival after grace period expires
 */
const scheduleLeadArchivalAfterGracePeriod = async (
  userId: string,
  newLimit: number,
  gracePeriodEnd: Date
): Promise<void> => {
  // This would typically be handled by a background job/cron
  // For now, we'll create a record that a cron job can process

  const { error } = await supabase.from("scheduled_tasks").insert({
    user_id: userId,
    task_type: "archive_excess_leads",
    scheduled_for: gracePeriodEnd.toISOString(),
    parameters: {
      keep_limit: newLimit,
      reason: "subscription_downgrade",
    },
    status: "pending",
  });

  if (error) {
    logger.error(`Error scheduling lead archival: ${error.message}`);
  }
};

/**
 * Archive excess leads based on priority (lowest scores first)
 */
export const archiveExcessLeads = async (
  userId: string,
  keepLimit: number
): Promise<{ archivedCount: number }> => {
  try {
    // Get all leads sorted by priority (overall_score desc, then by last activity)
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, overall_score, status, created_at")
      .eq("user_uuid", userId)
      .eq("is_archived", false)
      .order("overall_score", { ascending: false })
      .order("created_at", { ascending: false });

    if (leadsError) {
      throw new Error(`Error fetching leads: ${leadsError.message}`);
    }

    if (!leads || leads.length <= keepLimit) {
      return { archivedCount: 0 };
    }

    // Archive excess leads (keep the highest priority ones)
    const leadsToArchive = leads.slice(keepLimit);
    const leadIdsToArchive = leadsToArchive.map((lead) => lead.id);

    const { error: archiveError } = await supabase
      .from("leads")
      .update({
        is_archived: true,
        archived_reason: "subscription_downgrade",
        archived_at: new Date().toISOString(),
      })
      .in("id", leadIdsToArchive);

    if (archiveError) {
      throw new Error(`Error archiving leads: ${archiveError.message}`);
    }

    logger.info(
      `Archived ${leadIdsToArchive.length} excess leads for user ${userId}`
    );

    // Clear grace period
    await updateUserSettings(userId, {
      downgrade_grace_period_until: null,
    });

    return { archivedCount: leadIdsToArchive.length };
  } catch (error) {
    logger.error(
      `Error archiving excess leads for user ${userId}: ${error.message}`
    );
    throw error;
  }
};

/**
 * Process expired grace periods (to be called by cron job)
 */
export const processExpiredGracePeriods = async (): Promise<void> => {
  try {
    // Find users whose grace period has expired
    const { data: expiredUsers, error } = await supabase
      .from("user_settings")
      .select("uuid, subscription_plan")
      .not("downgrade_grace_period_until", "is", null)
      .lt("downgrade_grace_period_until", new Date().toISOString());

    if (error) {
      throw new Error(`Error finding expired grace periods: ${error.message}`);
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      return;
    }

    logger.info(`Processing ${expiredUsers.length} expired grace periods`);

    for (const user of expiredUsers) {
      try {
        const limit = LEAD_LIMITS[user.subscription_plan] || LEAD_LIMITS.FREE;
        await archiveExcessLeads(user.uuid, limit);
      } catch (userError) {
        logger.error(
          `Error processing grace period for user ${user.uuid}: ${userError.message}`
        );
      }
    }
  } catch (error) {
    logger.error(`Error processing expired grace periods: ${error.message}`);
  }
};

export default {
  handleSubscriptionDowngrade,
  archiveExcessLeads,
  processExpiredGracePeriods,
};
