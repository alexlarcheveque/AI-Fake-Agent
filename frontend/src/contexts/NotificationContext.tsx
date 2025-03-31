import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment } from '../api/appointmentApi';
import appointmentApi from '../api/appointmentApi';
import { format, isToday, isTomorrow, addDays } from 'date-fns';

export interface Notification {
  id: string;
  type: 'appointment' | 'message' | 'lead' | 'system' | 'property_search';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load upcoming appointments and create notifications for them
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const appointments = await appointmentApi.getUpcomingAppointments();
        
        // Create notifications for upcoming appointments
        const appointmentNotifications = appointments
          .filter(appointment => 
            // Only create notifications for appointments that are scheduled within the next 7 days
            appointment.status === 'scheduled' &&
            new Date(appointment.startTime) <= addDays(new Date(), 7)
          )
          .map(appointment => {
            const startDate = new Date(appointment.startTime);
            let timeDescription = '';
            
            if (isToday(startDate)) {
              timeDescription = `today at ${format(startDate, 'h:mm a')}`;
            } else if (isTomorrow(startDate)) {
              timeDescription = `tomorrow at ${format(startDate, 'h:mm a')}`;
            } else {
              timeDescription = `on ${format(startDate, 'MMMM d')} at ${format(startDate, 'h:mm a')}`;
            }
            
            return {
              id: `appointment-${appointment.id}`,
              type: 'appointment' as const,
              title: 'Upcoming Appointment',
              message: `${appointment.title} ${timeDescription}`,
              timestamp: new Date(),
              read: false,
              data: appointment
            };
          });
        
        setNotifications(prev => {
          // Filter out existing appointment notifications
          const filteredNotifications = prev.filter(n => n.type !== 'appointment');
          return [...filteredNotifications, ...appointmentNotifications];
        });
      } catch (error) {
        console.error('Failed to load appointment notifications:', error);
      }
    };
    
    loadAppointments();
    
    // Refresh appointments every 5 minutes
    const intervalId = setInterval(loadAppointments, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${notification.type}-${Date.now()}`,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount,
      addNotification, 
      markAllAsRead, 
      markAsRead,
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