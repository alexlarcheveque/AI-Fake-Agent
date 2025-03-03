const UserSettings = require("../models/UserSettings");
const logger = require("../utils/logger");

const settingsController = {
  // Get settings for current user
  async getSettings(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        // Return default settings for unauthenticated users
        return res.json({
          agentName: "Your Name",
          companyName: "Your Company",
          agentState: "",
          agentCity: "",
          aiAssistantEnabled: true,
        });
      }

      const userId = req.user.id;
      let settings = await UserSettings.findOne({ where: { userId } });

      if (!settings) {
        // Create default settings for this user
        settings = await UserSettings.create({
          userId,
          agentName: "Your Name",
          companyName: "Your Company",
          agentState: "",
          agentCity: "",
          aiAssistantEnabled: true,
        });
      }

      return res.json({
        agentName: settings.agentName || "",
        companyName: settings.companyName || "",
        agentState: settings.agentState || "",
        agentCity: settings.agentCity || "",
        aiAssistantEnabled: settings.aiAssistantEnabled || false,
      });
    } catch (error) {
      logger.error("Error fetching settings:", error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  },

  // Update settings for current user
  async updateSettings(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.user.id;

      // Find or create settings for this user
      let [settings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          agentName: req.body.agentName || "Your Name",
          companyName: req.body.companyName || "Your Company",
          agentState: req.body.agentState || "",
          agentCity: req.body.agentCity || "",
          aiAssistantEnabled:
            req.body.aiAssistantEnabled !== undefined
              ? req.body.aiAssistantEnabled
              : true,
        },
      });

      if (!created) {
        // Update existing settings
        await settings.update({
          agentName: req.body.agentName || settings.agentName,
          companyName: req.body.companyName || settings.companyName,
          agentState: req.body.agentState || settings.agentState,
          agentCity: req.body.agentCity || settings.agentCity,
          aiAssistantEnabled:
            req.body.aiAssistantEnabled !== undefined
              ? req.body.aiAssistantEnabled
              : settings.aiAssistantEnabled,
        });
      }

      return res.json({
        agentName: settings.agentName || "",
        companyName: settings.companyName || "",
        agentState: settings.agentState || "",
        agentCity: settings.agentCity || "",
        aiAssistantEnabled: settings.aiAssistantEnabled || false,
      });
    } catch (error) {
      logger.error("Error updating settings:", error);
      return res.status(500).json({ error: "Failed to update settings" });
    }
  },

  // Initialize settings for a new user - called during user registration
  async initializeUserSettings(userId, userName) {
    try {
      if (!userId) {
        throw new Error("User ID is required for initializing settings");
      }

      const [settings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          agentName: userName || "Your Name",
          companyName: "Your Company",
          agentCity: "",
          agentState: "",
          aiAssistantEnabled: true,
        },
      });

      return settings;
    } catch (error) {
      logger.error("Error initializing user settings:", error);
      throw error;
    }
  },
};

module.exports = settingsController;
