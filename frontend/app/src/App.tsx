import React, { useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import LeadManagement from "./components/LeadManagement";
import MessageCenter from "./components/MessageCenter";
import Settings from "./components/Settings";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationsPage from "./components/NotificationsPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  // Memoize the auth check result to avoid re-renders
  const authCheck = useMemo(() => {
    // Show nothing while checking authentication
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          Loading...
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return null;
  }, [user, isLoading]);

  // Return auth check result or children
  return authCheck || <>{children}</>;
};

// Separate component to reduce context re-evaluations
const AuthenticatedApp = () => {
  const auth = useAuth();

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-100">
        <Navbar auth={auth} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </div>
    </NotificationProvider>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedApp />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<LeadManagement />} />
        <Route path="/messages" element={<MessageCenter />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
      <Analytics />
    </>
  );
}

export default App;
