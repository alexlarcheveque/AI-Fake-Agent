import { getLeadById } from "../leadService.ts";
import { getMessageById, updateMessage } from "../messageService.ts";
import { generateResponse } from "../openaiService.ts";
import { sendMessage } from "../twilioService.ts";
import logger from "../../utils/logger.ts";

export const sendTwilioMessage = async (messageId, leadId) => {
  // First, get the message and update it with sender information
  const messageToUpdate = await getMessageById(messageId);

  try {
    // First update the message with sender info before sending
    const updatedMessage = await updateMessage(messageId, {
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
      });

      logger.info(
        `Updated message ${messageId} with Twilio SID: ${twilioResponse.sid}`
      );

      // Then update status separately
      const statusUpdateResult = await updateMessage(messageId, {
        delivery_status: "sent",
      });

      logger.info(`Updated message ${messageId} status to sent`);

      // Verify the SID was saved correctly
      const verifyMessage = await getMessageById(messageId);
      logger.info(
        `Verification: Message ${messageId} has SID: ${verifyMessage.twilio_sid}`
      );
    } else {
      logger.error(`No SID returned from Twilio for message ${messageId}`);
      await updateMessage(messageId, {
        delivery_status: "failed",
        error_message: "No SID returned from Twilio",
      });
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

    // 1. Get the message and generate text
    const messageToUpdate = await getMessageById(messageId);
    logger.info(`Crafting message ${messageId} for lead ${leadId}`);

    // 2. Generate the response text
    const generatedText = await generateResponse(leadId);

    console.log("generatedText", generatedText);

    // 3. First update with the generated text but keep as scheduled
    const textUpdateResult = await updateMessage(messageId, {
      text: generatedText,
      sender: "agent",
    });

    logger.info(`Updated message ${messageId} with generated text`);

    // 4. Get lead phone number
    const { phone_number } = await getLeadById(leadId);

    // 5. Send via Twilio
    const twilioResponse = await sendMessage(phone_number, generatedText);

    // 6. Immediately update with the Twilio SID first
    if (twilioResponse && twilioResponse.sid) {
      // Update SID first in a separate transaction
      const sidUpdateResult = await updateMessage(messageId, {
        twilio_sid: String(twilioResponse.sid),
      });

      logger.info(
        `Updated message ${messageId} with Twilio SID: ${twilioResponse.sid}`
      );

      // Then update status in a separate transaction
      const statusUpdateResult = await updateMessage(messageId, {
        delivery_status: "sent",
      });

      logger.info(`Updated message ${messageId} status to sent`);

      // Verify the SID was saved
      const verifyMessage = await getMessageById(messageId);
      logger.info(
        `Verification: Message ${messageId} has SID: ${verifyMessage.twilio_sid}`
      );
    } else {
      logger.error(`No SID returned from Twilio for message ${messageId}`);
      await updateMessage(messageId, {
        delivery_status: "failed",
        error_message: "No SID returned from Twilio",
      });
    }
  } catch (error) {
    logger.error(
      `Error in craftAndSendMessage for message ${messageId}: ${error.message}`
    );

    try {
      await updateMessage(messageId, {
        delivery_status: "failed",
        error_code: error.code || "UNKNOWN",
        error_message: error.message || "Unknown error",
      });
    } catch (updateError) {
      logger.error(
        `Failed to update error status for message ${messageId}: ${updateError.message}`
      );
    }
  }
};
