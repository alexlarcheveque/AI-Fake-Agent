require("dotenv").config();

// Add environment variable check
console.log("Environment variables check:");
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("TWILIO_ACCOUNT_SID exists:", !!process.env.TWILIO_ACCOUNT_SID);
console.log("TWILIO_AUTH_TOKEN exists:", !!process.env.TWILIO_AUTH_TOKEN);
console.log("TWILIO_PHONE_NUMBER exists:", !!process.env.TWILIO_PHONE_NUMBER);
console.log("BASE_URL:", process.env.BASE_URL);
console.log("GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET exists:", !!process.env.GOOGLE_CLIENT_SECRET);
console.log("GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);

const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const leadRoutes = require("./routes/leadRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userSettingsRoutes = require("./routes/userSettingsRoutes");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const agentSettings = require("./config/agentSettings");
const scheduledMessageService = require("./services/scheduledMessageService");
require("./models/associations");
const http = require("http");
const { Server } = require("socket.io");
const messageController = require("./controllers/messageController");

const app = express();

// Add this at the very top, before any other middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  if (req.body) console.log("Body:", req.body);
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
  if (req.originalUrl.includes("/api/messages/receive")) {
    console.log("Twilio webhook raw body:", req.body);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Method:", req.method);
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user-settings", userSettingsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/oauth", oauthRoutes);

// Add this before your other routes
app.post("/api/test-form", (req, res) => {
  console.log("Test form data received:", req.body);
  res.json({ received: req.body });
});

// Add these routes to handle both potential webhook paths
app.post("/api/messages/receive", (req, res) => {
  console.log("Received webhook at /api/messages/receive");
  messageController.receiveMessage(req, res);
});

// Also handle the path without the /api prefix (Twilio might be using this)
app.post("/messages/receive", (req, res) => {
  console.log("Received webhook at /messages/receive");
  messageController.receiveMessage(req, res);
});

// Add this route at the root level
app.post("/messages/receive", (req, res) => {
  console.log("========== INCOMING WEBHOOK ==========");
  console.log("Body:", req.body);
  console.log("From:", req.body.From);
  console.log("To:", req.body.To);
  console.log("Body:", req.body.Body);
  console.log("MessageSid:", req.body.MessageSid);
  console.log("======================================");

  messageController.receiveMessage(req, res);
});

// Add this route at the root level
app.post("/messages/receive", (req, res) => {
  console.log("========== INCOMING WEBHOOK ==========");
  console.log("Body:", req.body);
  console.log("From:", req.body.From);
  console.log("To:", req.body.To);
  console.log("Body:", req.body.Body);
  console.log("MessageSid:", req.body.MessageSid);
  console.log("======================================");

  messageController.receiveMessage(req, res);
});

app.post("/sms", (req, res) => {
  console.log("Received SMS webhook:", req.body);
  messageController.receiveMessage(req, res);
});

// Add this route to handle the typo
app.post("/api/mesages/receive", (req, res) => {
  console.log("Received webhook at misspelled URL");
  messageController.receiveMessage(req, res);
});

app.get("/test", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Make io available globally
app.set("io", io);

// Sync database and start server
const initializeApp = async () => {
  try {
    // Check if migrations should be skipped
    if (process.env.SKIP_MIGRATIONS !== 'true') {
      // Use a safer sync option that doesn't alter existing tables
      // This will only create tables that don't exist yet
      await sequelize.sync({ alter: false });
      console.log("Database sync completed (tables created if they didn't exist)");
    } else {
      console.log("Skipping database sync as SKIP_MIGRATIONS is set to true");
    }

    // No need to initialize global settings anymore
    // We'll create user settings when needed

    // If you need to log something at startup
    console.log(
      "App initialization complete - user settings will be created as needed"
    );

    // Keep the agentSettings initialization which is now updated to use the new model
    await agentSettings.initialize();

    // Start the server (use server instead of app)
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Check for scheduled messages every minute
    setInterval(async () => {
      await scheduledMessageService.checkAndSendScheduledMessages();
    }, 60000); // 60000 ms = 1 minute
  } catch (error) {
    console.error("Error initializing application:", error);
    process.exit(1);
  }
};

// Start the application
initializeApp();

// Export for testing purposes
module.exports = app;
