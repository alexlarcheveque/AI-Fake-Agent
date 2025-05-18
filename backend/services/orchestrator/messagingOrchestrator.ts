import {
  getLeadById,
  updateLeadStatusBasedOnMessages,
} from "../leadService.ts";
import { getMessageById, updateMessage } from "../messageService.ts";
import { generateResponse } from "../openaiService.ts";
import { sendMessage } from "../twilioService.ts";
import logger from "../../utils/logger.ts";

export const sendTwilioMessage = async (messageId, leadId) => {
  // First, get the message and update it with sender information
  const messageToUpdate = await getMessageById(messageId);

  try {
    // First update the message with sender info before sending
    await updateMessage(messageId, {
      ...messageToUpdate,
      sender: "agent",
    });

    logger.info(`Updated message ${messageId} with sender info before sending`);

    const { phone_number } = await getLeadById(leadId);

    // Now send the message via Twilio
    const twilioResponse = await sendMessage(
      phone_number,
      messageToUpdate.text
    );

    // Immediately update the message with the Twilio SID
    if (twilioResponse && twilioResponse.sid) {
      logger.info(
        `Received Twilio SID: ${twilioResponse.sid} for message ${messageId}`
      );

      // Update with SID first, before updating status
      const sidUpdateResult = await updateMessage(messageId, {
        twilio_sid: String(twilioResponse.sid),
        delivery_status: "sent",
      });

      logger.info(`Updated message ${messageId} status to sent`);
    }
  } catch (error) {
    logger.error(
      `Error in sendTwilioMessage for message ${messageId}: ${error.message}`
    );
    await updateMessage(messageId, {
      delivery_status: "failed",
      error_code: error.code || "UNKNOWN",
      error_message: error.message || "Unknown error",
    });
  }
};

export const craftAndSendMessage = async (messageId, leadId) => {
  try {
    logger.info(
      "message id to update -- craftAndSendMessage",
      messageId,
      leadId
    );

    await getMessageById(messageId);

    const generatedText = await generateResponse(leadId);
    logger.info("generatedText", generatedText);

    await updateMessage(messageId, {
      text: generatedText,
    });

    logger.info(`Updated message ${messageId} with generated text`);

    const { phone_number } = await getLeadById(leadId);

    try {
      const twilioResponse = await sendMessage(phone_number, generatedText);

      if (twilioResponse && twilioResponse.sid) {
        await updateMessage(messageId, {
          twilio_sid: String(twilioResponse.sid),
          delivery_status: "sent",
        });

        logger.info(
          `Updated message ${messageId} with Twilio SID: ${twilioResponse.sid}`
        );

        // Update lead status after sending message
        await updateLeadStatusBasedOnMessages(leadId);
      }

      logger.info(`Successfully processed message ${messageId}`);
    } catch (twilioError) {
      // Mark the message as failed so it won't be retried
      logger.error(`Error sending Twilio message: ${twilioError.message}`);

      await updateMessage(messageId, {
        delivery_status: "failed",
        error_code: twilioError.code || "TWILIO_ERROR",
        error_message: twilioError.message || "Failed to send via Twilio",
      });
    }
  } catch (error) {
    logger.error(
      `Error in craftAndSendMessage for message ${messageId}: ${error.message}`
    );

    // Mark message as failed so it won't be retried
    try {
      await updateMessage(messageId, {
        delivery_status: "failed",
        error_code: "PROCESSING_ERROR",
        error_message: error.message || "Error processing message",
      });
    } catch (updateError) {
      logger.error(`Error updating message status: ${updateError.message}`);
    }
  }
};
