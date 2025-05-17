import { getLeadById, updateLeadStatusBasedOnMessages } from "../leadService.ts";
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
    console.log(
      "message id to update -- craftAndSendMessage",
      messageId,
      leadId
    );

    await getMessageById(messageId);

    const generatedText = await generateResponse(leadId);
    console.log("generatedText", generatedText);

    await updateMessage(messageId, {
      text: generatedText,
    });

    logger.info(`Updated message ${messageId} with generated text`);

    const { phone_number } = await getLeadById(leadId);

    const twilioResponse = await sendMessage(phone_number, generatedText);

    console.log("twilioResponse -- craftAndSendMessage", twilioResponse);

    if (twilioResponse && twilioResponse.sid) {
      await updateMessage(messageId, {
        twilio_sid: String(twilioResponse.sid),
        delivery_status: "sent",
      });

      logger.info(
        `Updated message ${messageId} with Twilio SID: ${twilioResponse.sid}`
      );
      
      // Update lead status after sending message
      try {
        await updateLeadStatusBasedOnMessages(leadId);
        logger.info(`Successfully updated status for lead ${leadId} after sending message`);
      } catch (statusError) {
        logger.error(`Error updating lead status for lead ${leadId}: ${statusError.message}`);
        // Don't throw to prevent disrupting the message flow
      }
    }
  } catch (error) {
    logger.error(
      `Error in craftAndSendMessage for message ${messageId}: ${error.message}`
    );
  }
};
