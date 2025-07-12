import cron from "node-cron";
import logger from "../utils/logger.ts";
import { getMessagesThatAreOverdue } from "./messageService.ts";
import { getScheduledCallsThatAreOverdue, updateCall } from "./callService.ts";
import { craftAndSendMessage } from "./orchestrator/messagingOrchestrator.ts";
import { scheduleNextFollowUp } from "./leadService.ts";
import { processExpiredGracePeriods } from "./subscriptionDowngradeService.ts";
import { initiateAICall } from "../controllers/callController.ts";

// Maximum number of messages to process in a single cron job run
const MAX_MESSAGES_PER_BATCH = 5;
const MAX_CALLS_PER_BATCH = 3;

// Process scheduled messages and calls every 20 seconds
cron.schedule("*/20 * * * * *", async () => {
  try {
    // Process scheduled calls first (follow-up calls, not immediate Call #2)
    // Call #2 for new leads is now handled immediately via webhooks
    const allOverdueCalls = await getScheduledCallsThatAreOverdue();
    const overdueCalls = allOverdueCalls.slice(0, MAX_CALLS_PER_BATCH);

    if (overdueCalls.length > 0) {
      logger.info(`Processing ${overdueCalls.length} scheduled calls`);

      for (const call of overdueCalls) {
        try {
          // Skip new lead Call #2 - these are handled immediately via webhook
          if (call.call_type === "new_lead" && call.attempt_number === 2) {
            logger.info(
              `Skipping new lead Call #2 (handled by webhook): ${call.id}`
            );
            continue;
          }

          logger.info(
            `Processing scheduled call ${call.id} for lead ${call.lead_id}`
          );

          // Update call status to queued
          await updateCall(call.id, {
            status: "queued",
            updated_at: new Date().toISOString(),
          });

          // Initiate the call
          const mockReq = {
            body: { leadId: call.lead_id },
          } as any;

          await initiateAICall(mockReq, null as any);

          logger.info(`Successfully initiated scheduled call ${call.id}`);
        } catch (error) {
          logger.error(`Error processing call ${call.id}:`, error);

          // Mark call as failed
          await updateCall(call.id, {
            status: "failed",
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Process scheduled messages (including call fallback messages)
    const allOverdueMessages = await getMessagesThatAreOverdue();
    const overdueMessages = allOverdueMessages.slice(0, MAX_MESSAGES_PER_BATCH);

    if (overdueMessages.length > 0) {
      logger.info(`Processing ${overdueMessages.length} scheduled messages`);

      for (const message of overdueMessages) {
        try {
          logger.info(
            `Processing message ${message.id} for lead ${message.lead_id}`
          );
          await craftAndSendMessage(message.id, message.lead_id);
          await scheduleNextFollowUp(message.lead_id);
        } catch (error) {
          logger.error(`Error processing message ${message.id}:`, error);
        }
      }
    }

    if (overdueCalls.length === 0 && overdueMessages.length === 0) {
      logger.debug("No overdue calls or messages to process");
    }
  } catch (error) {
    logger.error("Error in cron job processing:", error);
  }
});

// Process subscription downgrades every hour
cron.schedule("0 * * * *", async () => {
  try {
    logger.info("Processing expired grace periods for subscription downgrades");
    await processExpiredGracePeriods();
  } catch (error) {
    logger.error("Error processing subscription downgrades:", error);
  }
});

export { cron };

logger.info("Call and message scheduling cron jobs initialized");
