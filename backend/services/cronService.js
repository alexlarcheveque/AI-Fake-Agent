const cron = require("node-cron");
const scheduledMessageService = require("./scheduledMessageService");
const logger = require("../utils/logger");

// Run every hour
cron.schedule("0 * * * *", async () => {
  try {
    logger.info("Running scheduled message cron job");
    await scheduledMessageService.checkAndSendScheduledMessages();
  } catch (error) {
    logger.error("Error in scheduled message cron job:", error);
  }
});
