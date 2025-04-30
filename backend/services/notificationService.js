import supabase from "../config/supabase.js";

export const createNotification = async (settings) => {
  const {
    lead_id,
    user_id,
    type,
    title,
    message,
    read,
    created_at,
    updated_at,
  } = settings;

  const { data, error } = await supabase
    .from("notifications")
    .insert([
      { lead_id, user_id, type, title, message, read, created_at, updated_at },
    ]);

  if (error) throw new Error(error.message);
  return data;
};

export const getNotificationsByUserId = async (userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("is_read", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getNotificationsByLeadId = async (leadId) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data;
};

export const updateNotification = async (id, settings) => {
  const { data, error } = await supabase
    .from("notifications")
    .update(settings)
    .eq("id", id);

  if (error) throw new Error(error.message);
  return data;
};

export const getUnreadCount = async (userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);
  return data;
};

export const markAllAsRead = async (userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data;
};

export const markAsRead = async (id, userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
  return data;
};

export const markAsUnread = async (id, userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  return data;
};

export const deleteNotification = async (id) => {
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return data;
};
