import supabase from "../config/supabase.ts";
import { NotificationInsert, NotificationRow } from "../models/Notification.ts";

export const createNotification = async (
  settings: NotificationInsert
): Promise<NotificationRow[]> => {
  try {
    console.log(
      "Creating notification with settings:",
      JSON.stringify(settings, null, 2)
    );
    const { data, error } = await supabase
      .from("notifications")
      .insert([settings])
      .select();

    if (error) {
      console.error("Error creating notification:", error);
      throw new Error(error.message);
    }

    console.log("Notification created successfully:", data);
    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in createNotification:", error);
    // Return empty array instead of throwing to prevent cascading failures
    return [];
  }
};

export const getNotificationsByUserId = async (
  userUuid: string
): Promise<NotificationRow[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_uuid", userUuid)
      .order("created_at", { ascending: false })
      .order("is_read", { ascending: false });

    if (error) {
      console.error("Error getting notifications:", error);
      throw new Error(error.message);
    }
    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in getNotificationsByUserId:", error);
    // Return empty array instead of throwing to prevent UI from breaking
    return [];
  }
};

export const getNotificationsByLeadId = async (
  leadId: number
): Promise<NotificationRow[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("lead_id", leadId);

    if (error) {
      console.error("Error getting notifications by lead ID:", error);
      throw new Error(error.message);
    }

    console.log(`Found ${data?.length || 0} notifications for lead ${leadId}`);
    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in getNotificationsByLeadId:", error);
    return [];
  }
};

export const updateNotification = async (
  id: number,
  settings: Partial<NotificationInsert>
): Promise<NotificationRow[]> => {
  try {
    const updateData = settings;
    console.log(
      `Updating notification ${id} with:`,
      JSON.stringify(updateData, null, 2)
    );

    const { data, error } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating notification:", error);
      throw new Error(error.message);
    }

    console.log(`Successfully updated notification ${id}`);
    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in updateNotification:", error);
    return [];
  }
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_uuid", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting unread count:", error);
      throw new Error(error.message);
    }

    return data.length;
  } catch (error) {
    console.error("Exception in getUnreadCount:", error);
    // Return 0 instead of throwing to prevent UI from breaking
    return 0;
  }
};

export const markAllAsRead = async (
  userId: string
): Promise<NotificationRow[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_uuid", userId)
      .select();

    if (error) {
      console.error("Error marking all as read:", error);
      throw new Error(error.message);
    }

    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in markAllAsRead:", error);
    // Return empty array instead of throwing to prevent UI from breaking
    return [];
  }
};

export const markAsRead = async (id: number): Promise<NotificationRow[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error marking notification as read:", error);
      throw new Error(error.message);
    }

    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in markAsRead:", error);
    return [];
  }
};

export const markAsUnread = async (id: number): Promise<NotificationRow[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: false })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error marking notification as unread:", error);
      throw new Error(error.message);
    }

    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in markAsUnread:", error);
    return [];
  }
};

export const deleteNotification = async (
  id: number
): Promise<NotificationRow[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error deleting notification:", error);
      throw new Error(error.message);
    }

    return data.map((notification) => notification);
  } catch (error) {
    console.error("Exception in deleteNotification:", error);
    return [];
  }
};
