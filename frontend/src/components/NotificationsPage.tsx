import React, { useState, useEffect } from 'react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const { 
    notifications, 
    markAsRead, 
    markAsUnread, 
    markAllAsRead, 
    deleteNotification
  } = useNotifications();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);

  // Apply filters when notifications or filter changes
  useEffect(() => {
    let filtered = [...notifications].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );

    if (filter === "unread") {
      filtered = filtered.filter(notification => !notification.isRead);
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter]);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAsUnread = (id: string) => {
    markAsUnread(id);
  };

  const handleRemoveNotification = (id: string) => {
    deleteNotification(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Format notification time for display
  const formatNotificationTime = (date: Date) => {
    try {
      // If the date is already a Date object, use it directly
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (!dateObj || isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return format(dateObj, "MM/dd/yyyy hh:mm a");
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'message':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        );
      case 'lead':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'property_search':
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Mark All as Read
          </button>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "unread")}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
            </select>
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No notifications
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "unread"
              ? "You don't have any unread notifications."
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <li
                key={`notification-${notification.id}-${notification.isRead ? 'read' : 'unread'}`}
                className={`${
                  !notification.isRead ? "bg-blue-50" : ""
                } hover:bg-gray-50`}
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Unread
                            </span>
                          )}
                        </p>
                        <div className="flex">
                          <p className="text-sm text-gray-500 mr-4">
                            {notification.metadata?.appointmentDate 
                              ? `${notification.metadata.appointmentDate} at ${notification.metadata.appointmentTime}`
                              : formatNotificationTime(notification.timestamp)}
                          </p>
                          <div className="flex space-x-2">
                            {notification.isRead ? (
                              <button
                                onClick={() => handleMarkAsUnread(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark as unread
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 