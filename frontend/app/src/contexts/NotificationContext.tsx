import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import notificationApi from "../api/notificationApi";
import { NotificationRow } from "../../../../backend/models/Notification";

// Define the context type
interface NotificationContextType {
  notifications: NotificationRow[];
  unreadCount: number;
  getNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAsUnread: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (data: any) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

// Create the context with default values
export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  getNotifications: async () => {},
  markAsRead: async () => {},
  markAsUnread: async () => {},
  markAllAsRead: async () => {},
  createNotification: async () => {},
  deleteNotification: async () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch notifications on component mount
  useEffect(() => {
    getNotifications();

    // Set up polling for new notifications every 30 seconds
    const intervalId = setInterval(() => {
      getNotifications();
    }, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(
      (notification) => !notification.is_read
    ).length;
    setUnreadCount(count);
  }, [notifications]);

  // Fetch all notifications
  const getNotifications = useCallback(async () => {
    try {
      const result = await notificationApi.getNotificationsByUserId();
      setNotifications(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback(async (id: number) => {
    try {
      const updatedNotification = await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === Number(id)
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark a notification as unread
  const markAsUnread = useCallback(async (id: number) => {
    try {
      const updatedNotification = await notificationApi.markAsUnread(id);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === Number(id)
            ? { ...notification, is_read: false }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);

  // Create a new notification
  const createNotification = useCallback(async (data: any) => {
    try {
      const newNotification = await notificationApi.createNotification(data);
      setNotifications((prev) => [...prev, newNotification]);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id: number) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== Number(id))
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    getNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    createNotification,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
