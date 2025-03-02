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
  async sendMessage(to, text, messageId = null) {
    logger.info(
      `Attempting to send message to ${to}: ${text.substring(0, 30)}...`
    );
    try {
      // Format the phone number if needed
      const formattedTo = to.startsWith("+") ? to : `+1${to}`;

      // Send message via Twilio
      const twilioMessage = await client.messages.create({
        body: text,
        from: twilioPhoneNumber,
        to: formattedTo,
        statusCallback: `${process.env.BASE_URL}/api/messages/status-callback?messageId=${messageId}`,
      });

      logger.info(`Message sent via Twilio: ${twilioMessage.sid}`);

      // If messageId is provided, update the message with Twilio SID and status
      if (messageId) {
        await Message.update(
          {
            twilioSid: twilioMessage.sid,
            deliveryStatus: twilioMessage.status,
            statusUpdatedAt: new Date(),
          },
          { where: { id: messageId } }
        );
      }

      return {
        success: true,
        sid: twilioMessage.sid,
        status: twilioMessage.status,
      };
    } catch (error) {
      logger.error("Error sending message via Twilio:", error);

      // If messageId is provided, update the message with error details
      if (messageId) {
        await Message.update(
          {
            deliveryStatus: "failed",
            errorCode: error.code,
            errorMessage: error.message,
            statusUpdatedAt: new Date(),
          },
          { where: { id: messageId } }
        );
      }

      return {
        success: false,
        error: error.message,
      };
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
