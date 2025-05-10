import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";

// Routes
import leadRoutes from "./routes/leadRoutes.ts";
import messageRoutes from "./routes/messageRoutes.ts";
import userSettingsRoutes from "./routes/userSettingsRoutes.ts";
import appointmentRoutes from "./routes/appointmentRoutes.ts";
import notificationRoutes from "./routes/notificationRoutes.ts";

// Services
import "./services/cronService";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== API Routes =====
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user-settings", userSettingsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

// ===== Server Initialization =====
const server = http.createServer(app);

// Initialize and start server
const initializeApp = async () => {
  try {
    // Start the server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error initializing application:", error);
    process.exit(1);
  }
};

// Start the application
initializeApp();

// Export for testing purposes
export default app;
