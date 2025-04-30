import supabase from "../config/supabase.js";

export const createMessage = async (settings) => {
  const {
    lead_id,
    text,
    sender,
    scheduled_at,
    is_ai_generated,
    delivery_status,
    error_code,
    error_message,
    created_at,
    updated_at,
  } = settings;

  const { data, error } = await supabase.from("messages").insert([
    {
      lead_id,
      text,
      sender,
      scheduled_at,
      is_ai_generated,
      delivery_status,
      error_code,
      error_message,
      created_at,
      updated_at,
    },
  ]);

  if (error) throw new Error(error.message);
  return data;
};

export const getMessagesByLeadId = async (leadId) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("leadId", leadId);
  return data;
};

export const getMessagesByLeadIdDescending = async (leadId) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("leadId", leadId)
    .order("createdAt", { descending: true });

  if (error) throw new Error(error.message);
  return data;
};

export const getMessagesThatAreOverdue = async () => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .lte("scheduledAt", new Date())
    .eq("deliveryStatus", "queued");
  if (error) throw new Error(error.message);
  return data;
};

export const updateMessage = async (messageId, settings) => {
  const { data, error } = await supabase
    .from("messages")
    .update(settings)
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  return data;
};

export const deleteMessage = async (messageId) => {
  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  return data;
};

export const receiveIncomingMessage = async (messageData) => {
  const { from, to, text, twilioSid, status } = messageData;

  // Find the lead associated with this phone number
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", from)
    .single();

  if (leadError && leadError.code !== "PGRST116") {
    throw new Error(`Error finding lead: ${leadError.message}`);
  }

  createMessage({
    lead_id: lead.id,
    text,
    sender: "lead",
    is_incoming: true,
    twilioSid,
    delivery_status: status,
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (error) throw new Error(`Error saving incoming message: ${error.message}`);
  return data;
};
