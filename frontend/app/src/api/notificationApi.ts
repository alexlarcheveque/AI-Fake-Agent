import {
  NotificationRow,
  NotificationInsert,
} from "../../../../backend/models/Notification";
import apiClient from "./apiClient";

class NotificationApi {
  // Create a new notification
  async createNotification(
    notificationData: NotificationInsert
  ): Promise<NotificationRow> {
    try {
      const data = await apiClient.post("/notifications", notificationData);

      console.log("notification data", data);

      return data;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Get notifications by user ID
  async getNotificationsByUserId(): Promise<NotificationRow[]> {
    try {
      const data = await apiClient.get("/notifications");

      return data;
    } catch (error) {
      console.error("Error fetching notifications by user ID:", error);
      throw error;
    }
  }

  // Get notifications by lead ID
  async getNotificationsByLeadId(leadId: string): Promise<NotificationRow[]> {
    try {
      const data = await apiClient.get(`/notifications/lead/${leadId}`);
      return data;
    } catch (error) {
      console.error("Error fetching notifications by lead ID:", error);
      throw error;
    }
  }

  // Update a notification
  async updateNotification(
    id: string,
    data: Partial<NotificationInsert>
  ): Promise<NotificationRow> {
    try {
      const response = await apiClient.put(`/notifications/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating notification:", error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(id: number): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.put(`/notifications/mark-all-read`);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  // Mark a notification as read for a user
  async markAsRead(id: number): Promise<NotificationRow> {
    try {
      const response = await apiClient.put(`/notifications/${id}/read`);
      return response;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark a notification as unread for a user
  async markAsUnread(id: number): Promise<NotificationRow> {
    try {
      const response = await apiClient.put(`/notifications/${id}/unread`);
      return response;
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
}

export default new NotificationApi();
