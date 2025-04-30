import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import supabase from "./config/supabase.js";
import leadRoutes from "./routes/leadRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userSettingsRoutes from "./routes/userSettingsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import responseHandler from "./middleware/responseHandler.js";
import messageController from "./controllers/messageController.js";
import { globalAuth } from "./middleware/globalAuth.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

// Add environment variable check only when debug mode is enabled
if (process.env.DEBUG_REQUESTS === "true") {
  console.log("Environment variables check:");
  console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
  console.log("SUPABASE_ANON_KEY exists:", !!process.env.SUPABASE_ANON_KEY);
  console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
  console.log("TWILIO_ACCOUNT_SID exists:", !!process.env.TWILIO_ACCOUNT_SID);
  console.log("TWILIO_AUTH_TOKEN exists:", !!process.env.TWILIO_AUTH_TOKEN);
  console.log("TWILIO_PHONE_NUMBER exists:", !!process.env.TWILIO_PHONE_NUMBER);
  console.log("BASE_URL:", process.env.BASE_URL);
  console.log("GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
  console.log(
    "GOOGLE_CLIENT_SECRET exists:",
    !!process.env.GOOGLE_CLIENT_SECRET
  );
  console.log("GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);
}

const app = express();

// Add response handler middleware
app.use(responseHandler);

// Add this at the very top, before any other middleware
app.use((req, res, next) => {
  // Only log detailed request information if debugging is enabled
  if (process.env.DEBUG_REQUESTS === "true") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log("Headers:", req.headers);
    if (req.body) console.log("Body:", req.body);
  } else {
    // When debugging is disabled, only log the method and URL (minimal logging)
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Add this before your routes
app.use((req, res, next) => {
  if (
    req.originalUrl.includes("/api/messages/receive") &&
    process.env.DEBUG_REQUESTS === "true"
  ) {
    console.log("Twilio webhook raw body:", req.body);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Method:", req.method);
  }
  next();
});

// Apply global authentication to all routes
app.use(globalAuth);

// Make supabase client available globally
app.set("supabase", supabase);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user-settings", userSettingsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

// Add this before your other routes
app.post("/api/test-form", (req, res) => {
  console.log("Test form data received:", req.body);
  res.json({ received: req.body });
});

// Add these routes to handle both potential webhook paths
app.post("/api/messages/receive", (req, res) => {
  console.log("Received webhook at /api/messages/receive");
  messageController.receiveIncomingMessage(req, res);
});

// Also handle the path without the /api prefix (Twilio might be using this)
app.post("/messages/receive", (req, res) => {
  if (process.env.DEBUG_REQUESTS === "true") {
    console.log("Received webhook at /messages/receive");
  }
  messageController.receiveIncomingMessage(req, res);
});

// Add this route at the root level
app.post("/messages/receive", (req, res) => {
  if (process.env.DEBUG_REQUESTS === "true") {
    console.log("========== INCOMING WEBHOOK ==========");
    console.log("Body:", req.body);
    console.log("From:", req.body.From);
    console.log("To:", req.body.To);
    console.log("Body:", req.body.Body);
    console.log("MessageSid:", req.body.MessageSid);
    console.log("======================================");
  } else {
    // Log minimal info even when debugging is disabled
    console.log(
      `[${new Date().toISOString()}] SMS received: ${req.body.From} -> ${
        req.body.To
      }`
    );
  }

  messageController.receiveIncomingMessage(req, res);
});

app.post("/sms", (req, res) => {
  if (process.env.DEBUG_REQUESTS === "true") {
    console.log("Received SMS webhook:", req.body);
  } else {
    console.log(`[${new Date().toISOString()}] SMS received via /sms endpoint`);
  }
  messageController.receiveIncomingMessage(req, res);
});

// Add this route to handle the typo
app.post("/api/mesages/receive", (req, res) => {
  if (process.env.DEBUG_REQUESTS === "true") {
    console.log("Received webhook at misspelled URL");
  }
  messageController.receiveIncomingMessage(req, res);
});

app.get("/test", (req, res) => {
  res.send("Server is running");
});

// Global error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Create HTTP server
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
