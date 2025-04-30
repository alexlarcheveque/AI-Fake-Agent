const cron = require("node-cron");
const logger = require("../utils/logger");

// Runs every minute
cron.schedule("* * * * *", async () => {
  try {
    logger.info("Running scheduled message cron job");
    // TODO: Implement scheduled message cron job
  } catch (error) {
    logger.error("Error in scheduled message cron job:", error);
  }
});