require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const leadRoutes = require("./routes/leadroutes");
const messageRoutes = require("./routes/messageRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const authRoutes = require("./routes/authRoutes");
const settingsController = require("./controllers/settingsController");
const agentSettings = require("./config/agentSettings");
const cronService = require("./services/cronService");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/settings", settingsRoutes);

const PORT = process.env.PORT || 3000;

// Sync database and start server
const initializeApp = async () => {
  try {
    // No need to initialize global settings anymore
    // We'll create user settings when needed

    // If you need to log something at startup
    console.log(
      "App initialization complete - user settings will be created as needed"
    );

    // Sync all models with the database
    await sequelize.sync({ alter: true });

    // Keep the agentSettings initialization which is now updated to use the new model
    await agentSettings.initialize();

    // Start the server
    app.listen(PORT, () => {
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
module.exports = app;
