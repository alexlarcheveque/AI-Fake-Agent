import { getLeadById } from "../leadService.ts";
import { getMessageById, updateMessage } from "../messageService.ts";
import { generateResponse } from "../openaiService.ts";
import { sendMessage } from "../twilioService.ts";

export const sendTwilioMessage = async (messageId, leadId) => {
  const messageToUpdate = await getMessageById(messageId);
  messageToUpdate.sender = "agent";

  const { phone_number } = await getLeadById(leadId);
  let twilioResponse;

  try {
    twilioResponse = await sendMessage(phone_number, messageToUpdate.text);
    messageToUpdate.delivery_status = "sent";

    // Ensure we have a valid SID and log it
    if (twilioResponse && twilioResponse.sid) {
      console.log("Twilio SID from response:", twilioResponse.sid);
      messageToUpdate.twilio_sid = String(twilioResponse.sid);
      console.log(
        "Message twilio_sid after assignment:",
        messageToUpdate.twilio_sid
      );
    } else {
      console.error("No SID returned from Twilio response:", twilioResponse);
      messageToUpdate.twilio_sid = null;
    }
  } catch (error) {
    console.error("Error sending message via Twilio:", error);
    messageToUpdate.delivery_status = "failed";
    messageToUpdate.error_code = error.code || "UNKNOWN";
    messageToUpdate.error_message = error.message || "Unknown error";
    messageToUpdate.twilio_sid = null;
  }

  // Log before update
  console.log(
    "Before database update, twilio_sid =",
    messageToUpdate.twilio_sid
  );

  try {
    // Update the message to reflect that the message is sent
    await updateMessage(messageId, messageToUpdate);
  } catch (dbError) {
    console.error("Failed to update message in database:", dbError);
    // Consider retrying or implementing a fallback mechanism here
  }
};

export const craftAndSendMessage = async (messageId, leadId) => {
  let twilioResponse;

  // Use OpenAI endpoint to create the body of what the message is going to say
  const messageToUpdate = await getMessageById(messageId);

  console.log("messageToUpdate -- craftAndSendMessage", messageToUpdate);

  // Generate the response text
  const generatedText = await generateResponse(leadId);
  messageToUpdate.text = generatedText;
  messageToUpdate.sender = "agent";

  console.log("messageToUpdate -- generatedText", generatedText);

  const { phone_number } = await getLeadById(leadId);
  try {
    // Send the message with the generated text
    twilioResponse = await sendMessage(phone_number, generatedText);
    messageToUpdate.delivery_status = "sent";

    // Ensure we have a valid SID
    if (twilioResponse && twilioResponse.sid) {
      messageToUpdate.twilio_sid = String(twilioResponse.sid);
      console.log("Assigned Twilio SID:", messageToUpdate.twilio_sid);
    } else {
      console.error("No SID returned from Twilio response:", twilioResponse);
      messageToUpdate.twilio_sid = null;
    }
  } catch (error) {
    console.error("Error sending message via Twilio:", error);
    messageToUpdate.delivery_status = "failed";
    messageToUpdate.error_code = error.code || "UNKNOWN";
    messageToUpdate.error_message = error.message || "Unknown error";
    messageToUpdate.twilio_sid = null;
  }

  try {
    // Update the message to reflect that the message is sent
    await updateMessage(messageId, messageToUpdate);
  } catch (dbError) {
    console.error("Failed to update message in database:", dbError);
    // Consider retrying or implementing a fallback mechanism here
  }
};
