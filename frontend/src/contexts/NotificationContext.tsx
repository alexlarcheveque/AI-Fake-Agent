import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appointment } from '../api/appointmentApi';
import appointmentApi from '../api/appointmentApi';
import notificationApi, { Notification as ApiNotification } from '../api/notificationApi';
import { format, isToday, isTomorrow, addDays } from 'date-fns';

export interface Notification extends ApiNotification {}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Create a memoized function for fetching notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const notifications = await notificationApi.getNotifications();
      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Handle the error
      setNotifications([]);
    }
  }, []);

  // Fetch notifications from the API on mount and periodically
  useEffect(() => {
    // Fetch notifications immediately
    fetchNotifications();
    
    // Refresh notifications every minute
    const intervalId = setInterval(fetchNotifications, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  // Load upcoming appointments and create appointment notifications
  useEffect(() => {
    // Keep track of the current mount state to prevent state updates after unmount
    let isMounted = true;
    
    const loadAppointments = async () => {
      if (!isMounted) return;
      
      try {
        const appointments = await appointmentApi.getUpcomingAppointments();
        
        if (!isMounted) return;
        
        // Get current notification data outside the map loop to prevent excessive comparisons
        const existingAppointmentNotifications = notifications.filter(
          n => n.type === 'appointment'
        );
        
        // Create notifications for upcoming appointments
        const appointmentsToNotify = appointments
          .filter(appointment => 
            // Only create notifications for appointments that are scheduled within the next 7 days
            appointment.status === 'scheduled' &&
            new Date(appointment.startTime) <= addDays(new Date(), 7)
          )
          .filter(appointment => 
            // Only create notifications for appointments that don't already have a notification
            !existingAppointmentNotifications.some(
              n => n.metadata?.appointmentId === appointment.id
            )
          );
        
        if (appointmentsToNotify.length === 0) {
          return; // No new notifications to create
        }
          
        // Process appointments in sequence rather than parallel
        for (const appointment of appointmentsToNotify) {
          if (!isMounted) return;
          
          const startDate = new Date(appointment.startTime);
          let timeDescription = '';
          
          if (isToday(startDate)) {
            timeDescription = `today at ${format(startDate, 'h:mm a')}`;
          } else if (isTomorrow(startDate)) {
            timeDescription = `tomorrow at ${format(startDate, 'h:mm a')}`;
          } else {
            timeDescription = `on ${format(startDate, 'MMMM d')} at ${format(startDate, 'h:mm a')}`;
          }
          
          try {
            await notificationApi.createNotification({
              type: 'appointment',
              title: 'Upcoming Appointment',
              message: `${appointment.title} ${timeDescription}`,
              metadata: { appointmentId: appointment.id, leadId: appointment.leadId }
            });
          } catch (error) {
            console.error('Failed to create appointment notification:', error);
          }
        }
        
        // Only fetch updated notifications if we actually created some
        if (appointmentsToNotify.length > 0 && isMounted) {
          try {
            await fetchNotifications();
          } catch (error) {
            console.error('Failed to refresh notifications after creating appointment notifications:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load appointment notifications:', error);
      }
    };
    
    loadAppointments();
    
    // Refresh appointments every 5 minutes
    const intervalId = setInterval(loadAppointments, 5 * 60 * 1000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fetchNotifications]); // Only depend on fetchNotifications, not notifications array

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    try {
      const newNotification = await notificationApi.createNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata
      });
      
      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const updatedNotification = await notificationApi.markAsRead(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? updatedNotification : notification
        )
      );
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      const updatedNotification = await notificationApi.markAsUnread(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? updatedNotification : notification
        )
      );
    } catch (error) {
      console.error(`Failed to mark notification ${id} as unread:`, error);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== id)
      );
    } catch (error) {
      console.error(`Failed to remove notification ${id}:`, error);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount,
      addNotification, 
      markAllAsRead, 
      markAsRead,
      markAsUnread,
      removeNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 