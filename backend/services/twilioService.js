import twilio from "twilio";
import Message from "../models/Message.js";
import logger from "../utils/logger.js";

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

export const sendMessage = async (to, body) => {
  try {
    // Make sure the callback URL is correct and includes the full path
    const statusCallbackUrl = `${process.env.BASE_URL}/api/messages/status-callback`;

    const message = await client.messages.create({
      from: twilioPhoneNumber,
      to,
      body,
      statusCallback: statusCallbackUrl,
    });

    console.log(
      `Sending message to ${to} with status callback: ${statusCallbackUrl}`
    );

    return message;
  } catch (error) {
    console.error("Error sending Twilio message:", error);
    throw error;
  }
};

export const updateMessageStatus = async (twilioSid, status, errorCode = null, errorMessage = null) => {
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
};  