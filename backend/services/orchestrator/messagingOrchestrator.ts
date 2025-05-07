import { getLeadById } from "../leadService.ts";
import { getMessageById, updateMessage } from "../messageService.ts";
import { generateResponse } from "../openaiService.ts";
import { sendMessage } from "../twilioService.ts";

export const craftAndSendMessage = async (messageId, leadId) => {
  // Use OpenAI endpoint to create the body of what the message is going to say
  const messageToUpdate = await getMessageById(messageId);
  messageToUpdate.text = await generateResponse(leadId);

  const { phoneNumber } = await getLeadById(leadId);

  // Use Twilio To Send The Actual Message
  await sendMessage(phoneNumber, messageToUpdate.text);

  messageToUpdate.delivery_status = "pending";

  // Update the message to reflect that the message is sent
  await updateMessage(messageId, messageToUpdate);
};
