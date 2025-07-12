import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import expressWs from "express-ws";

// Routes
import leadRoutes from "./routes/leadRoutes.ts";
import messageRoutes from "./routes/messageRoutes.ts";
import userSettingsRoutes from "./routes/userSettingsRoutes.ts";
import appointmentRoutes from "./routes/appointmentRoutes.ts";
import notificationRoutes from "./routes/notificationRoutes.ts";
import searchCriteriaRoutes from "./routes/searchCriteriaRoutes.ts";
import subscriptionRoutes from "./routes/subscriptionRoutes.ts";
import callRoutes from "./routes/callRoutes.ts";
import recordingRoutes from "./routes/recordingRoutes.ts";

// Services
import "./services/cronService";

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Enable WebSocket support
const wsInstance = expressWs(app, server);
console.log("🔌 WebSocket support enabled on server");

// Import WebSocket handler
import { handleRealtimeWebSocket } from "./controllers/callController.ts";

// Add WebSocket route directly to app (bypasses route-level authentication)
wsInstance.app.ws("/api/voice/realtime", (ws, req) => {
  console.log(
    "🚀 WEBSOCKET: Twilio connecting to /api/voice/realtime (direct app route)"
  );
  console.log(
    "🔍 WEBSOCKET: Connection headers:",
    JSON.stringify(req.headers, null, 2)
  );
  handleRealtimeWebSocket(ws, req);
});

// NUCLEAR OPTION: Completely separate WebSocket endpoint for Twilio
wsInstance.app.ws("/twilio-websocket", (ws, req) => {
  console.log("🚀 TWILIO WEBSOCKET: Direct connection to /twilio-websocket");
  console.log(
    "🔍 TWILIO WEBSOCKET: Headers:",
    JSON.stringify(req.headers, null, 2)
  );
  handleRealtimeWebSocket(ws, req);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// ===== Middleware =====
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "https://realnurture.ai",
        "https://app.realnurture.ai",
        "http://localhost:5173",
        "https://real-nurture-backend.fly.dev",
        "http://real-nurture-backend.fly.dev",
      ];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`Origin ${origin} not allowed by CORS: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Debug middleware to log requests before body parsing
app.use((req, res, next) => {
  if (req.path.includes("/calls/leads/") && req.method === "POST") {
    console.log("Request debug:", {
      method: req.method,
      path: req.path,
      headers: req.headers,
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
    });
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint for Fly.io
app.get("/api/health", (req, res) => {
  console.log("Health check endpoint hit");
  res.status(200).json({ status: "ok" });
});

// Root endpoint for basic testing
app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running" });
});

// ===== API Routes =====
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user-settings", userSettingsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search-criteria", searchCriteriaRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/voice", callRoutes);
console.log(
  "📞 Call routes mounted at /api/voice (includes WebSocket at /api/voice/realtime)"
);
app.use("/api/recordings", recordingRoutes);

// ===== Server Initialization =====

// Initialize and start server
const initializeApp = async () => {
  try {
    // Log binding information
    console.log(`Attempting to bind to ${HOST}:${PORT}`);

    // Start the server with explicit host binding
    server.listen(PORT, HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
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
