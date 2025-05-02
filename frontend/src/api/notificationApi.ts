import axios from "axios";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

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

// Use Vite's environment variable syntax
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

class NotificationApi {
  // Create a new notification
  async createNotification(
    notificationData: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      const response = await api.post("/api/notifications", notificationData);
      return {
        ...response.data,
        timestamp: new Date(response.data.createdAt),
      };
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Get notifications by user ID
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    try {
      const response = await api.get(`/api/notifications/user/${userId}`);
      return response.data.map((item: any) => ({
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
      const response = await api.get(`/api/notifications/lead/${leadId}`);
      return response.data.map((item: any) => ({
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
      const response = await api.put(`/api/notifications/${id}`, data);
      return {
        ...response.data,
        timestamp: new Date(response.data.createdAt),
      };
    } catch (error) {
      console.error("Error updating notification:", error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(id: string): Promise<void> {
    try {
      await api.delete(`/api/notifications/${id}`);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await api.put(`/api/notifications/user/${userId}/mark-all-read`);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  // Mark a notification as read for a user
  async markAsRead(id: string, userId: string): Promise<Notification> {
    try {
      const response = await api.put(
        `/api/notifications/${id}/user/${userId}/read`
      );
      return {
        ...response.data,
        timestamp: new Date(response.data.createdAt),
      };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark a notification as unread for a user
  async markAsUnread(id: string, userId: string): Promise<Notification> {
    try {
      const response = await api.put(
        `/api/notifications/${id}/user/${userId}/unread`
      );
      return {
        ...response.data,
        timestamp: new Date(response.data.createdAt),
      };
    } catch (error) {
      console.error("Error marking notification as unread:", error);
      throw error;
    }
  }

  // These methods are useful - keeping them
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await api.get("/api/notifications");
      return response.data.items.map((item: any) => ({
        ...item,
        timestamp: new Date(item.createdAt),
      }));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get("/api/notifications/unread-count");
      return response.data.count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  async testConnection(): Promise<{ status: string }> {
    try {
      const response = await api.get("/api/notifications/test");
      return response.data;
    } catch (error) {
      console.error("Notification API connection failed:", error);
      throw error;
    }
  }
}

export default new NotificationApi();
