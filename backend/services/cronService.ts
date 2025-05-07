import cron from "node-cron";
import logger from "../utils/logger.ts";
import { getMessagesThatAreOverdue } from "./messageService.ts";
import { craftAndSendMessage } from "./orchestrator/messagingOrchestrator.ts";

// Runs every minute
cron.schedule("* * * * *", async () => {
  try {
    logger.info("Running scheduled message cron job");
    const overdueMessages = await getMessagesThatAreOverdue();

    logger.info(`Found ${overdueMessages.length} overdue messages to process`);

    // Process messages sequentially with individual try/catch blocks
    for (const message of overdueMessages) {
      try {
        logger.info(
          `Processing message ${message.id} for lead ${message.lead_id}`
        );
        await craftAndSendMessage(message.id, message.lead_id);
      
        logger.info(`Successfully processed message ${message.id}`);
      } catch (error) {
        // This only catches errors for this specific message
        logger.error(`Error processing message ${message.id}:`, error);
        // Continue with the next message
      }
    }

    logger.info("Completed scheduled message cron job");
  } catch (error) {
    // This catches errors in fetching the messages or other job-level errors
    logger.error("Error in scheduled message cron job:", error);
  }
});
