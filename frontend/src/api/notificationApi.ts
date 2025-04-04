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
  
  // Fallback function to create a local notification if API fails
  private createFallbackNotification(notificationData: CreateNotificationRequest): Notification {
    const fallbackNotification: Notification = {
      id: `local-${Date.now()}`,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      timestamp: new Date(),
      isRead: false,
      metadata: notificationData.metadata
    };

    try {
      const existingNotifications = this.getLocalNotifications();
      const updatedNotifications = [...existingNotifications, fallbackNotification];
      localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      return fallbackNotification;
    } catch (error) {
      console.error('Error creating fallback notification:', error);
      return fallbackNotification;
    }
  }

  // Get all notifications
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await api.get("/api/notifications");
      return response.data.data.items.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return this.getLocalNotifications();
    }
  }

  // Get a single notification by id
  async getNotification(id: string): Promise<Notification> {
    try {
      const response = await api.get(`/api/notifications/${id}`);
      return {
        ...response.data.data,
        timestamp: new Date(response.data.data.timestamp)
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
        timestamp: new Date(response.data.data.timestamp)
      };
    } catch (error) {
      console.error("Error creating notification:", error);
      return this.createFallbackNotification(notificationData);
    }
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<Notification> {
    try {
      const response = await api.put(`/api/notifications/${id}/read`);
      return {
        ...response.data.data,
        timestamp: new Date(response.data.data.timestamp)
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
        timestamp: new Date(response.data.data.timestamp)
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
      return this.getLocalUnreadCount();
    }
  }

  // Local storage fallback methods
  private getLocalNotifications(): Notification[] {
    try {
      const notifications = localStorage.getItem('notifications');
      return notifications ? JSON.parse(notifications) : [];
    } catch (error) {
      console.error('Error getting local notifications:', error);
      return [];
    }
  }

  private getLocalUnreadCount(): number {
    const notifications = this.getLocalNotifications();
    return notifications.filter(n => !n.isRead).length;
  }
}

export default new NotificationApi(); 