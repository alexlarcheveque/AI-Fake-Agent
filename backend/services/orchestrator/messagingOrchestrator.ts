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
  } catch (error) {
    messageToUpdate.delivery_status = "failed";
  }

  console.log("message to update -- twilioResponse", twilioResponse);
  console.log("message to update -- messageToUpdate", messageToUpdate);
  // Update the message to reflect that the message is sent
  await updateMessage(messageId, messageToUpdate);
};

export const craftAndSendMessage = async (messageId, leadId) => {
  // Use OpenAI endpoint to create the body of what the message is going to say
  const messageToUpdate = await getMessageById(messageId);
  messageToUpdate.text = await generateResponse(leadId);
  messageToUpdate.sender = "agent";

  const { phone_number } = await getLeadById(leadId);
  let twilioResponse;
  try {
    twilioResponse = await sendMessage(phone_number, messageToUpdate.text);
    messageToUpdate.delivery_status = "sent";
  } catch (error) {
    messageToUpdate.delivery_status = "failed";
  }

  console.log("message to update -- twilioResponse", twilioResponse);
  console.log("message to update -- messageToUpdate", messageToUpdate);
  // Update the message to reflect that the message is sent
  await updateMessage(messageId, messageToUpdate);
};
