import supabase from "../config/supabase.ts";
import {
  Notification,
  NotificationInsert,
  NotificationUtils,
} from "../models/Notification.ts";

interface CreateNotificationParams {
  lead_id?: number | null;
  user_id?: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  read?: boolean | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export const createNotification = async (
  settings: CreateNotificationParams
): Promise<Notification[]> => {
  const notificationData = NotificationUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("notifications")
    .insert([notificationData])
    .select();

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const getNotificationsByUserId = async (
  userId: string
): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("is_read", { ascending: false });

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const getNotificationsByLeadId = async (
  leadId: number
): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("lead_id", leadId);

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const updateNotification = async (
  id: number,
  settings: Partial<Notification>
): Promise<Notification[]> => {
  const updateData = NotificationUtils.toInsert(settings);

  const { data, error } = await supabase
    .from("notifications")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return data.length;
};

export const markAllAsRead = async (
  userId: string
): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .select();

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const markAsRead = async (id: number): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const markAsUnread = async (id: number): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: false })
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};

export const deleteNotification = async (
  id: number
): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);
  return data.map((notification) => NotificationUtils.toModel(notification));
};
