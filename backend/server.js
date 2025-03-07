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

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user-settings", userSettingsRoutes);

const PORT = process.env.PORT || 3000;

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

    // Start the server
    app.listen(PORT, () => {
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
