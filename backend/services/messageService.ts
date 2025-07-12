import supabase from "../config/supabase.ts";
import { MessageInsert, MessageRow } from "../models/Message.ts";
import { updateLeadStatusBasedOnCommunications } from "./leadService.ts";
import logger from "../utils/logger.ts";

// Utility function to clean phone numbers
const cleanPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If the number starts with '1' and is 11 digits, remove the '1'
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return digitsOnly.slice(1);
  }

  // If it's already 10 digits, return as is
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }

  // If we can't clean it properly, return the original digits
  return digitsOnly;
};

export const createMessage = async (
  settings: MessageInsert
): Promise<MessageRow[]> => {
  const { data, error } = await supabase
    .from("messages")
    .insert([settings])
    .select();

  console.log("created message", data);

  if (error) throw new Error(error.message);
  return data;
};

export const getMessageById = async (
  messageId: number
): Promise<MessageRow> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getMessagesByLeadId = async (
  leadId: number
): Promise<MessageRow[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data;
};

export const getMessagesByLeadIdDescending = async (
  leadId: number
): Promise<MessageRow[]> => {
  try {
    // Get all messages for this particular lead
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`Supabase messages query error: ${error.message}`);
      throw new Error(error.message);
    }

    console.log(`Found ${data.length} messages for lead ${leadId}`);
    return data;
  } catch (error) {
    console.error(`Error in getMessagesByLeadIdDescending: ${error.message}`);
    throw error;
  }
};

export const getNextScheduledMessageForLead = async (
  leadId: number
): Promise<MessageRow> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", leadId)
    .eq("delivery_status", "scheduled")
    .gt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const getMessagesThatAreOverdue = async (): Promise<MessageRow[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .lte("scheduled_at", now)
    .eq("delivery_status", "scheduled");

  if (error) throw new Error(error.message);
  return data;
};

export const updateMessage = async (
  messageId: number,
  settings: MessageInsert
): Promise<MessageRow> => {
  console.log("update message -- data to update", settings);

  if (settings.twilio_sid) {
    console.log(
      `IMPORTANT: Updating message ${messageId} with Twilio SID: ${settings.twilio_sid}`
    );
  }

  // Always set the updated_at timestamp to ensure changes are detected
  settings.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("messages")
    .update(settings)
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) {
    console.error(`Error updating message ${messageId}:`, error);
    throw new Error(error.message);
  }

  if (!data) {
    console.error(`No data returned when updating message ${messageId}`);
    throw new Error(`Failed to update message ${messageId}`);
  }

  // For critical updates like twilio_sid, verify the update was successful
  if (settings.twilio_sid && data.twilio_sid !== settings.twilio_sid) {
    console.error(`CRITICAL: Twilio SID mismatch after update for message ${messageId}. 
      Expected: ${settings.twilio_sid}, Got: ${data.twilio_sid}`);
  }

  console.log(
    `Message ${messageId} updated successfully with twilio_sid: ${data.twilio_sid}`
  );

  return data;
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  console.log("delete message", messageId);

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) throw new Error(error.message);
};

export const receiveIncomingMessage = async (messageData): Promise<void> => {
  const to = cleanPhoneNumber(messageData.To);
  const from = cleanPhoneNumber(messageData.From);
  const text = messageData.Body;
  const twilio_sid = messageData.MessageSid;

  // Find the lead associated with this phone number
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("phone_number", from)
    .single();

  if (leadError) {
    if (leadError.code !== "PGRST116") {
      // PGRST116 means not found
      throw new Error(`Error finding lead: ${leadError.message}`);
    }
    // If lead not found, could handle this case (e.g., create a new lead)
    throw new Error(`No lead found with phone number ${from}`);
  }

  if (!lead) {
    throw new Error(`No lead found with phone number ${from}`);
  }

  logger.info(`Received message from lead ${lead.id} (${lead.name})`);

  // Cancel any pending scheduled messages for this lead
  try {
    const { data: scheduledMessages } = await supabase
      .from("messages")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("delivery_status", "scheduled")
      .gt("scheduled_at", new Date().toISOString());

    if (scheduledMessages && scheduledMessages.length > 0) {
      logger.info(
        `Canceling ${scheduledMessages.length} scheduled messages for lead ${lead.id} due to incoming response`
      );

      // Cancel each scheduled message
      for (const msg of scheduledMessages) {
        await deleteMessage(msg.id);
      }
    }
  } catch (error) {
    logger.error(
      `Error canceling scheduled messages for lead ${lead.id}: ${error.message}`
    );
    // Don't throw to continue with message processing
  }

  // Create the incoming message
  await createMessage({
    lead_id: lead.id,
    text,
    sender: "lead",
    twilio_sid,
    delivery_status: "delivered",
    is_ai_generated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Update lead status based on message history
  try {
    await updateLeadStatusBasedOnCommunications(lead.id);
    logger.info(
      `Successfully updated status for lead ${lead.id} after receiving message`
    );
  } catch (error) {
    logger.error(
      `Error updating lead status for lead ${lead.id}: ${error.message}`
    );
    // Don't throw here, just log the error to avoid stopping the message flow
  }

  // respond to the lead
  if (lead.is_ai_enabled) {
    // Schedule debounced response (wait 5 seconds for potential follow-up messages)
    const debounceDelaySeconds = 15;
    const responseTime = new Date();
    responseTime.setSeconds(responseTime.getSeconds() + debounceDelaySeconds);

    logger.info(
      `Scheduling debounced response for lead ${
        lead.id
      } at ${responseTime.toISOString()}`
    );

    await createMessage({
      lead_id: lead.id,
      sender: "agent",
      is_ai_generated: true,
      delivery_status: "scheduled",
      scheduled_at: responseTime.toISOString(), // Schedule for 10 seconds from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
};
