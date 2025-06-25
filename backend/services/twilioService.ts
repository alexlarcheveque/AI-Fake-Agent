import twilio from "twilio";
import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";

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

export const sendMessage = async (to: number, body: string): Promise<any> => {
  try {
    // Use backend URL for status callback
    const statusCallbackUrl =
      process.env.NODE_ENV === "production"
        ? `${process.env.BACKEND_URL}/api/messages/status-callback`
        : "https://wanted-husky-scarcely.ngrok-free.app/api/messages/status-callback";

    logger.info(`Sending message to ${to}`);

    const message = await client.messages.create({
      from: twilioPhoneNumber,
      to: to.toString(),
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

export const updateMessageStatus = async (
  twilioSid: string,
  status: string,
  errorCode: string | null = null,
  errorMessage: string | null = null
): Promise<boolean> => {
  try {
    // Find message with the Twilio SID
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("twilio_sid", twilioSid)
      .single();

    if (error || !data) {
      logger.warn(`No message found with Twilio SID: ${twilioSid}`);
      return false;
    }

    // Update the message
    await supabase
      .from("messages")
      .update({
        delivery_status: status,
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    logger.info(`Updated message ${data.id} status to ${status}`);
    return true;
  } catch (error) {
    logger.error(`Error updating message status for SID ${twilioSid}:`, error);
    return false;
  }
};

export const getStatusCallbackUrl = () => {
  return `${process.env.BACKEND_URL}/api/messages/status-callback`;
};
