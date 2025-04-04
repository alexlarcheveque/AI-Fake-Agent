import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import notificationApi from "../api/notificationApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to migrate notifications from localStorage to the database
  const migrateNotifications = async () => {
    try {
      // Check if localStorage has notifications
      if (localStorage.getItem('notifications')) {
        console.log('Migrating notifications from localStorage to database...');
        const migratedCount = await notificationApi.migrateFromLocalStorage();
        console.log(`Successfully migrated ${migratedCount} notifications`);
      }
    } catch (error) {
      console.error('Failed to migrate notifications:', error);
      // Don't throw the error - we don't want to block login if migration fails
    }
  };

  useEffect(() => {
    // Check for stored token on initial load
    const initAuth = async () => {
      console.log("Initializing auth...");
      const token = localStorage.getItem("token");

      if (token) {
        console.log("Token found in localStorage");
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          console.log("Making request to /auth/me...");

          const response = await axios.get(`${API_URL}/api/auth/me`);
          console.log("Auth verification successful:", response.data);
          setUser(response.data);
          
          // Migrate notifications after successful auth verification
          await migrateNotifications();
        } catch (error) {
          console.error("Auth verification failed:", error);
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        }
      } else {
        console.log("No token found in localStorage");
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });

    const { user, token } = response.data;
    setUser(user);
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    
    // Migrate notifications after successful login
    await migrateNotifications();
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      name,
      email,
      password,
    });

    const { user, token } = response.data;
    setUser(user);
    localStorage.setItem("token", token);
    
    // No need to migrate notifications for new users
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
