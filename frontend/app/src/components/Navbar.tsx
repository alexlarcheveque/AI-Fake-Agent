import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { useUserSettings } from "../hooks/useUserSettings";
import { format } from "date-fns";
import { NotificationRow } from "../../../../backend/models/Notification";

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { userSettings, loading } = useUserSettings();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead, markAsUnread } =
    useNotifications();
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close profile menu if clicked outside
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
      // Close notifications if clicked outside
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle notification click and navigation
  const handleNotificationClick = (notification: NotificationRow) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.lead_id) {
      navigate(`/messages?leadId=${notification.lead_id}`);
    } else {
      navigate("/notifications");
    }

    // Close notification panel after clicking
    setShowNotifications(false);
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        );
      case "property_search":
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  // Mark notification as unread (stopping event propagation)
  const handleMarkAsUnread = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    markAsUnread(notificationId);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="bg-white shadow-md relative z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                RealNurture{" "}
                <span className="text-xs font-normal text-gray-500">
                  (Beta)
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/")
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/messages"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/messages")
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Messages
              </Link>
              <Link
                to="/leads"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive("/leads")
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Leads
              </Link>
              <a
                href="https://forms.gle/URBsfWCUZmAHQGpz6"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 ml-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium text-sm transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                Feedback
              </a>
            </div>
          </div>

          {/* Right side - Notifications and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                }}
                className="p-1 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="sr-only">View notifications</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {/* Show a blue badge with count if there are unread notifications */}
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="origin-top-right fixed sm:absolute right-0 mt-2 w-96 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">
                        Notifications
                      </h3>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500">
                        <svg
                          className="mx-auto h-8 w-8 text-gray-400 mb-2"
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
                        <p>No notifications</p>
                      </div>
                    ) : (
                      <>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start ${
                                !notification.is_read ? "bg-blue-50" : ""
                              }`}
                            >
                              <div className="flex-shrink-0 mr-3">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                  {!notification.is_read && (
                                    <span className="ml-2 text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                      Unread
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-xs text-gray-500">
                                    {format(
                                      new Date(notification.created_at),
                                      "MMM d, yyyy h:mm a"
                                    )}
                                  </p>
                                  {notification.is_read ? (
                                    <button
                                      onClick={(e) =>
                                        handleMarkAsUnread(e, notification.id)
                                      }
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Mark as unread
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="px-4 py-2 border-t border-gray-200">
                          <Link
                            to="/notifications"
                            className="text-xs text-center block text-blue-600 hover:text-blue-800"
                            onClick={() => setShowNotifications(false)}
                          >
                            View all notifications
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="bg-white p-1 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                  <span className="text-gray-700 font-medium">
                    {userSettings?.agent_name
                      ? (userSettings.agent_name as string)
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </span>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {userSettings?.agent_name || "User"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {userSettings?.company_name || ""}
                    </p>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <span className="block text-xs text-gray-500">
                        Your Phone Number
                      </span>
                      <span className="block text-sm text-gray-900">
                        (213) 415-2761
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
