import supabase from "../config/supabase.ts";
import { MessageInsert, MessageRow } from "../models/Message.ts";

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
  // Convert to database format if needed
  const updateData = settings;

  console.log("update message -- data to update", updateData);

  const { data, error } = await supabase
    .from("messages")
    .update(updateData)
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteMessage = async (messageId: number): Promise<void> => {
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

  console.log("lead", lead);

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

  // respond to the lead
  if (lead.is_ai_enabled) {
    await createMessage({
      lead_id: lead.id,
      sender: "agent",
      is_ai_generated: true,
      delivery_status: "scheduled",
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
};
