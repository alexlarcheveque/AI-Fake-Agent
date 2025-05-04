import supabase from "../config/supabase.ts";
import { Message, MessageInsert, MessageUtils } from "../models/Message.ts";

interface CreateMessageParams {
  lead_id: number;
  text: string;
  sender?: string;
  scheduled_at?: Date | string | null;
  is_ai_generated?: boolean | null;
  delivery_status?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  is_incoming?: boolean;
  twilioSid?: string;
}

interface IncomingMessageData {
  from: string;
  to: string;
  text: string;
  twilioSid?: string;
  status?: string;
}

export const createMessage = async (
  settings: CreateMessageParams
): Promise<Message[]> => {
  // Convert to database format if needed
  const insertData = MessageUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("messages")
    .insert([insertData])
    .select();

  if (error) throw new Error(error.message);
  return data.map((msg) => MessageUtils.toModel(msg));
};

export const getMessagesByLeadId = async (
  leadId: number
): Promise<Message[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data.map((msg) => MessageUtils.toModel(msg));
};

export const getMessagesByLeadIdDescending = async (
  leadId: number,
  userId: number
): Promise<Message[]> => {
  try {
    // Debugging information
    console.log(`Getting messages for leadId: ${leadId}, userId: ${userId}`);

    // First, check if the lead belongs to the user
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_uuid", userId)
      .single();

    if (leadError) {
      if (leadError.code === "PGRST116") {
        // Not found
        console.error(`Lead ${leadId} does not belong to user ${userId}`);
        throw new Error(
          `Lead ${leadId} not found or does not belong to the user`
        );
      }
      console.error(`Supabase lead query error: ${leadError.message}`);
      throw new Error(leadError.message);
    }

    // Get all messages for this lead (without user_id filter since it might not exist)
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`Supabase messages query error: ${error.message}`);
      throw new Error(error.message);
    }

    console.log(`Found ${data.length} messages for lead ${leadId}`);
    return data.map((msg) => MessageUtils.toModel(msg));
  } catch (error) {
    console.error(`Error in getMessagesByLeadIdDescending: ${error.message}`);
    throw error;
  }
};

export const getMessagesThatAreOverdue = async (): Promise<Message[]> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .lte("scheduled_at", now)
    .eq("delivery_status", "queued");

  if (error) throw new Error(error.message);
  return data.map((msg) => MessageUtils.toModel(msg));
};

export const updateMessage = async (
  messageId: number,
  settings: Partial<Message>
): Promise<Message> => {
  // Convert to database format if needed
  const updateData = MessageUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("messages")
    .update(updateData)
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return MessageUtils.toModel(data);
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) throw new Error(error.message);
};

export const receiveIncomingMessage = async (
  messageData: IncomingMessageData
): Promise<Message[]> => {
  const { from, to, text, twilioSid, status } = messageData;

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

  // Create the message
  return await createMessage({
    lead_id: lead.id,
    text,
    sender: "lead",
    is_incoming: true,
    twilioSid,
    delivery_status: status || "delivered",
    created_at: new Date(),
    updated_at: new Date(),
  });
};

// Get message statistics for dashboard
export const getMessageStats = async (): Promise<{
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  activeConversations: number;
}> => {
  // Get total message count
  const { count: totalCount, error: totalError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true });

  if (totalError) throw new Error(totalError.message);

  // Get delivered message count
  const { count: deliveredCount, error: deliveredError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("delivery_status", "delivered");

  if (deliveredError) throw new Error(deliveredError.message);

  // Get failed message count
  const { count: failedCount, error: failedError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("delivery_status", "failed");

  if (failedError) throw new Error(failedError.message);

  // Get active conversations (leads with messages in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: activeLeads, error: activeError } = await supabase
    .from("messages")
    .select("lead_id")
    .gte("created_at", sevenDaysAgo.toISOString())
    .is("lead_id", "not.null");

  if (activeError) throw new Error(activeError.message);

  // Count unique lead IDs
  const uniqueLeadIds = new Set(activeLeads.map((msg) => msg.lead_id));

  return {
    totalMessages: totalCount || 0,
    deliveredMessages: deliveredCount || 0,
    failedMessages: failedCount || 0,
    activeConversations: uniqueLeadIds.size,
  };
};
