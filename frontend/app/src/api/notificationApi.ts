import supabase from "../config/supabase";
import apiClient from "./apiClient";

export interface Notification {
  id: string;
  type: "appointment" | "message" | "lead" | "system" | "property_search";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, any>;
}

export interface CreateNotificationRequest {
  type: Notification["type"];
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

class NotificationApi {
  // Create a new notification
  async createNotification(
    notificationData: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      const data = await apiClient.post("/notifications", notificationData);

      console.log("notification data", data);

      return {
        id: data.id,
        type: data.type,
        title: data.title,
        message: data.message,
        timestamp: data.createdAt,
        isRead: data.is_read,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Get notifications by user ID
  async getNotificationsByUserId(): Promise<Notification[]> {
    try {
      const data = await apiClient.get("/notifications");
      return data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.createdAt),
      }));
    } catch (error) {
      console.error("Error fetching notifications by user ID:", error);
      throw error;
    }
  }

  // Get notifications by lead ID
  async getNotificationsByLeadId(leadId: string): Promise<Notification[]> {
    try {
      const data = await apiClient.get(`/notifications/lead/${leadId}`);
      return data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.createdAt),
      }));
    } catch (error) {
      console.error("Error fetching notifications by lead ID:", error);
      throw error;
    }
  }

  // Update a notification
  async updateNotification(
    id: string,
    data: Partial<Notification>
  ): Promise<Notification> {
    try {
      const response = await apiClient.put(`/notifications/${id}`, data);
      return {
        ...response,
        timestamp: new Date(response.createdAt),
      };
    } catch (error) {
      console.error("Error updating notification:", error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(id: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await apiClient.put(`/notifications/user/${userId}/mark-all-read`);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  // Mark a notification as read for a user
  async markAsRead(id: string, userId: string): Promise<Notification> {
    try {
      const response = await apiClient.put(
        `/notifications/${id}/user/${userId}/read`
      );
      return {
        ...response,
        timestamp: new Date(response.createdAt),
      };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark a notification as unread for a user
  async markAsUnread(id: string, userId: string): Promise<Notification> {
    try {
      const response = await apiClient.put(
        `/notifications/${id}/user/${userId}/unread`
      );
      return {
        ...response,
        timestamp: new Date(response.createdAt),
      };
    } catch (error) {
      console.error("Error marking notification as unread:", error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const data = await apiClient.get("/notifications/unread-count");
      return data.count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  async testConnection(): Promise<{ status: string }> {
    try {
      return await apiClient.get("/notifications/test");
    } catch (error) {
      console.error("Notification API connection failed:", error);
      throw error;
    }
  }
}

export default new NotificationApi();
