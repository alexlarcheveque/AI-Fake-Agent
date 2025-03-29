const cron = require("node-cron");
const scheduledMessageService = require("./scheduledMessageService");
const leadStatusService = require("./leadStatusService");
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

// Run once daily at midnight to mark inactive leads
cron.schedule("0 0 * * *", async () => {
  try {
    logger.info("Running inactive leads cron job");
    const count = await leadStatusService.markInactiveLeads();
    logger.info(`Marked ${count} leads as inactive`);
  } catch (error) {
    logger.error("Error in inactive leads cron job:", error);
  }
});
