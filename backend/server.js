require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const leadRoutes = require("./routes/leadroutes");
const messageRoutes = require("./routes/messageRoutes");
const userSettingsRoutes = require("./routes/userSettingsRoutes");
const authRoutes = require("./routes/authRoutes");
const agentSettings = require("./config/agentSettings");
const scheduledMessageService = require("./services/scheduledMessageService");
require("./models/associations");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

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

// Add this before your other routes
app.post("/api/test-form", (req, res) => {
  console.log("Test form data received:", req.body);
  res.json({ received: req.body });
});

app.post("/messages/receive", (req, res) => {
  // Forward the request to your actual handler
  const messageController = require("./controllers/messageController");
  messageController.receiveMessage(req, res);
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
    // Then sync all models
    await sequelize.sync({ alter: true });

    console.log("Database tables recreated successfully");

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
