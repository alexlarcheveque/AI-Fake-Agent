import axios from 'axios';

export interface Notification {
  id: string;
  type: 'appointment' | 'message' | 'lead' | 'system' | 'property_search';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: any;
}

export interface CreateNotificationRequest {
  type: Notification['type'];
  title: string;
  message: string;
  metadata?: any;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or wherever your app stores it
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class NotificationApi {
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get('/api/notifications');
    // Convert timestamp strings to Date objects
    return response.data.notifications.map((notification: any) => ({
      ...notification,
      timestamp: new Date(notification.createdAt || notification.timestamp)
    }));
  }

  async getNotification(id: string): Promise<Notification> {
    const response = await api.get(`/api/notifications/${id}`);
    // Convert timestamp string to Date object
    return {
      ...response.data.notification,
      timestamp: new Date(response.data.notification.createdAt || response.data.notification.timestamp)
    };
  }

  async createNotification(notificationData: CreateNotificationRequest): Promise<Notification> {
    const response = await api.post('/api/notifications', notificationData);
    // Convert timestamp string to Date object
    return {
      ...response.data.notification,
      timestamp: new Date(response.data.notification.createdAt || response.data.notification.timestamp)
    };
  }

  async markAsRead(id: string): Promise<Notification> {
    const response = await api.patch(`/api/notifications/${id}/read`);
    // Convert timestamp string to Date object
    return {
      ...response.data.notification,
      timestamp: new Date(response.data.notification.createdAt || response.data.notification.timestamp)
    };
  }

  async markAsUnread(id: string): Promise<Notification> {
    const response = await api.patch(`/api/notifications/${id}/unread`);
    // Convert timestamp string to Date object
    return {
      ...response.data.notification,
      timestamp: new Date(response.data.notification.createdAt || response.data.notification.timestamp)
    };
  }

  async markAllAsRead(): Promise<void> {
    await api.patch('/api/notifications/mark-all-read');
  }

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/api/notifications/${id}`);
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/api/notifications/counts/unread');
    return response.data.count;
  }
}

// Export an instance of the NotificationApi class as the default export
export default new NotificationApi(); 