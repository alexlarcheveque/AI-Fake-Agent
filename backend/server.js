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
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "https://realnurture.ai",
        "https://app.realnurture.ai",
        "http://localhost:5173",
      ];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`Origin ${origin} not allowed by CORS`);
        callback(new Error("Not allowed by CORS"));
      }
    },
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
    // Log binding information
    console.log(`Attempting to bind to 0.0.0.0:${PORT}`);

    // Start the server with explicit host binding
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on 0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      // Check what interfaces we're actually listening on
      const addressInfo = server.address();
      console.log(`Server address info:`, addressInfo);
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
