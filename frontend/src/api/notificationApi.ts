import axios from 'axios';

export interface Notification {
  id: string;
  type: 'appointment' | 'message' | 'lead' | 'system' | 'property_search';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, any>;
}

export interface CreateNotificationRequest {
  type: Notification['type'];
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// Use Vite's environment variable syntax
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  // Test the connection to the API
  async testConnection(): Promise<{ status: string }> {
    try {
      const response = await api.get("/api/notifications/test");
      return response.data.data;
    } catch (error) {
      console.error("Notification API connection failed:", error);
      throw error;
    }
  }
  
  // Get all notifications
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await api.get("/api/notifications");
      return response.data.data.items.map((item: any) => ({
        ...item,
        timestamp: new Date(item.createdAt)
      }));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  // Get a single notification by id
  async getNotification(id: string): Promise<Notification> {
    try {
      const response = await api.get(`/api/notifications/${id}`);
      return {
        ...response.data.data,
        timestamp: new Date(response.data.data.createdAt)
      };
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  }

  // Create a new notification
  async createNotification(notificationData: CreateNotificationRequest): Promise<Notification> {
    try {
      const response = await api.post("/api/notifications", notificationData);
      return {
        ...response.data.data,
        timestamp: new Date(response.data.data.createdAt)
      };
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<Notification> {
    try {
      const response = await api.put(`/api/notifications/${id}/read`);
      return {
        ...response.data.data,
        timestamp: new Date(response.data.data.createdAt)
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark notification as unread
  async markAsUnread(id: string): Promise<Notification> {
    try {
      const response = await api.put(`/api/notifications/${id}/unread`);
      return {
        ...response.data.data,
        timestamp: new Date(response.data.data.createdAt)
      };
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      await api.put("/api/notifications/mark-all-read");
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    try {
      await api.delete(`/api/notifications/${id}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get("/api/notifications/unread-count");
      return response.data.data.count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }
}

export default new NotificationApi(); 