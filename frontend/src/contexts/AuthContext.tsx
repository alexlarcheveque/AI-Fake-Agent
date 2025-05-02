import React, { createContext, useContext, useEffect, useState } from "react";
import supabase from "../config/supabase";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
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

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on component mount
    const checkSession = async () => {
      setIsLoading(true);

      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setToken(session.access_token);

          // Get user data
          const {
            data: { user },
          } = await supabase.auth.getUser(session.access_token);

          if (user) {
            setUser({
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || "",
            });
          }
        }
      } catch (error) {
        console.error("Error checking authentication session:", error);
        // Clear potentially corrupted auth state
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setToken(session.access_token);

        // Store token in localStorage for API calls
        localStorage.setItem("token", session.access_token);

        const {
          data: { user },
        } = await supabase.auth.getUser(session.access_token);

        if (user) {
          setUser({
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.name || "",
          });
        }
      } else {
        // If no session, clear the auth state
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // The onAuthStateChange handler will update the state
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();

      // Clear auth state
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const getToken = async (): Promise<string | null> => {
    // If we already have a token in state, return it
    if (token) return token;

    try {
      // Try to get a fresh token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentToken = session?.access_token || null;

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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
