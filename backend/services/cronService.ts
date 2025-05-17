import cron from "node-cron";
import logger from "../utils/logger.ts";
import { getMessagesThatAreOverdue } from "./messageService.ts";
import { craftAndSendMessage } from "./orchestrator/messagingOrchestrator.ts";
import { scheduleNextFollowUp } from "./leadService.ts";

// Maximum number of messages to process in a single cron job run
const MAX_MESSAGES_PER_BATCH = 5;

// Runs every 20 seconds
cron.schedule("*/20 * * * * *", async () => {
  try {
    const overdueMessages = await getMessagesThatAreOverdue();

    if (overdueMessages.length === 0) {
      return;
    }

    logger.info(
      `Found ${overdueMessages.length} overdue messages, processing up to ${MAX_MESSAGES_PER_BATCH}`
    );

    // Take up to MAX_MESSAGES_PER_BATCH messages to process
    const messagesToProcess = overdueMessages.slice(0, MAX_MESSAGES_PER_BATCH);
    
    // Process each message
    for (const message of messagesToProcess) {
      try {
        logger.info(
          `Processing message ${message.id} for lead ${message.lead_id}`
        );

        await craftAndSendMessage(message.id, message.lead_id);
        logger.info(`Successfully processed message ${message.id}`);
        
        // Schedule the next follow-up after successfully sending a message
        try {
          await scheduleNextFollowUp(message.lead_id);
          logger.info(`Scheduled next follow-up for lead ${message.lead_id}`);
        } catch (followUpError) {
          logger.error(`Error scheduling follow-up for lead ${message.lead_id}:`, followUpError);
          // Don't throw to continue processing other messages
        }
      } catch (error) {
        logger.error(`Error processing message ${message.id}:`, error);
        // Continue processing other messages
      }
    }
    
    // Log remaining messages if any
    if (overdueMessages.length > MAX_MESSAGES_PER_BATCH) {
      logger.info(`${overdueMessages.length - MAX_MESSAGES_PER_BATCH} messages still waiting to be processed in next cron job run`);
    }
  } catch (error) {
    // This catches errors in fetching the messages or other job-level errors
    logger.error("Error in scheduled message cron job:", error);
  }
});
