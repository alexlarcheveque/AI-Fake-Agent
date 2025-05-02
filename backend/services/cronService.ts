import cron from "node-cron";
import logger from "../utils/logger.ts";

// Runs every minute
cron.schedule("* * * * *", async () => {
  try {
    logger.info("Running scheduled message cron job");
    // TODO: Implement scheduled message cron job
  } catch (error) {
    logger.error("Error in scheduled message cron job:", error);
  }
});

export {}; // This export is needed to make TypeScript treat this file as a module
