const twilio = require("twilio");
const Message = require("../models/Message");
const logger = require("../utils/logger");

// Initialize Twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Log the Twilio configuration (with partial SID for security)
const sidPreview = accountSid
  ? `${accountSid.substring(0, 6)}...`
  : "undefined";
logger.info(
  `Using Twilio config: SID=${sidPreview}, Phone=${twilioPhoneNumber}`
);

// Create the Twilio client
const client = twilio(accountSid, authToken);

const twilioService = {
  async sendMessage(to, body) {
    try {
      const message = await client.messages.create({
        to,
        from: twilioPhoneNumber,
        body,
        statusCallback: `${process.env.BASE_URL}/api/messages/status-callback`,
      });

      console.log(`Message sent via Twilio: ${message.sid}`);
      return message;
    } catch (error) {
      console.error("Error sending Twilio message:", error);
      throw error;
    }
  },

  // New method to update message status
  async updateMessageStatus(
    twilioSid,
    status,
    errorCode = null,
    errorMessage = null
  ) {
    try {
      const message = await Message.findOne({ where: { twilioSid } });

      if (!message) {
        logger.warn(`No message found with Twilio SID: ${twilioSid}`);
        return false;
      }

      await message.update({
        deliveryStatus: status,
        errorCode: errorCode,
        errorMessage: errorMessage,
        statusUpdatedAt: new Date(),
      });

      logger.info(`Updated message ${message.id} status to ${status}`);
      return true;
    } catch (error) {
      logger.error(
        `Error updating message status for SID ${twilioSid}:`,
        error
      );
      return false;
    }
  },
};

module.exports = twilioService;
