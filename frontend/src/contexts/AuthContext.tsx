import React, { createContext, useContext, useEffect, useState } from "react";
import supabase from "../config/supabase";

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  getToken: async () => null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  // Return the global instance if available, otherwise use context
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Add safety timeout to prevent infinite loading
  useEffect(() => {
    // Set a timeout to force loading to false after 5 seconds
    // This ensures we don't get stuck in a loading state if there's a problem
    const safetyTimeout = setTimeout(() => {
      if (isLoading && !isInitialized) {
        console.warn(
          "Auth initialization timed out - forcing loading state to false"
        );
        setIsLoading(false);
        setIsInitialized(true);
      }
    }, 5000);

    return () => clearTimeout(safetyTimeout);
  }, [isLoading, isInitialized]);

  useEffect(() => {
    // Check for existing session on component mount
    const checkSession = async () => {
      setIsLoading(true);
      console.log("Checking auth session...");

      try {
        // Get the current session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Supabase session error:", error);
          throw error;
        }

        console.log("Session check result:", data);
        const { session } = data;

        if (session) {
          console.log("Active session found");
          setToken(session.access_token);

          // Get user data
          const userResponse = await supabase.auth.getUser(
            session.access_token
          );

          if (userResponse.error) {
            console.error("Error getting user:", userResponse.error);
            throw userResponse.error;
          }

          const { user } = userResponse.data;

          if (user) {
            console.log("User data retrieved:", user.id);
            setUser({
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || "",
              avatar: user.user_metadata?.avatar || "",
            });
          } else {
            console.log("No user data in the session");
            setUser(null);
          }
        } else {
          console.log("No active session");
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error("Error checking authentication session:", error);
        // Clear potentially corrupted auth state
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      } finally {
        console.log("Auth check completed, setting isLoading to false");
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    checkSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session) {
        console.log("New session established");
        setToken(session.access_token);

        // Store token in localStorage for API calls
        localStorage.setItem("token", session.access_token);

        try {
          const userResponse = await supabase.auth.getUser(
            session.access_token
          );

          if (userResponse.error) {
            console.error(
              "Error getting user after state change:",
              userResponse.error
            );
            throw userResponse.error;
          }

          const { user } = userResponse.data;

          if (user) {
            console.log("User data updated after state change");
            setUser({
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || "",
              avatar: user.user_metadata?.avatar || "",
            });
          }
        } catch (error) {
          console.error("Error processing auth state change:", error);
          setUser(null);
          setToken(null);
        }
      } else {
        // If no session, clear the auth state
        console.log("Session ended, clearing auth state");
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      }

      // Always ensure loading state is updated
      setIsLoading(false);
    });

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting login...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login failed:", error);
        throw error;
      }

      console.log("Login successful");
      // The onAuthStateChange handler will update the state
    } catch (error) {
      console.error("Login error:", error);
      // Ensure loading state is updated even on error
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      console.log("Logging out...");

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error from Supabase:", error);
        throw error;
      }

      // Clear auth state
      console.log("Logout successful, clearing state");
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getToken = async (): Promise<string | null> => {
    // If we already have a token in state, return it
    if (token) return token;

    try {
      console.log("Getting fresh token...");
      // Try to get a fresh token
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session for token:", error);
        throw error;
      }

      const currentToken = data.session?.access_token || null;
      console.log("Token retrieved:", currentToken ? "Yes" : "No");

      // Update state and localStorage if token exists
      if (currentToken) {
        setToken(currentToken);
        localStorage.setItem("token", currentToken);
      }

      return currentToken;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  // Create auth context value object
  const authValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    getToken,
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};
