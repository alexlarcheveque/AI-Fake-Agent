const userSettingsService = require("../services/userSettingsService");
const logger = require("../utils/logger");

const settingsController = {
  // Get settings for current user
  async getSettings(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const settings = await userSettingsService.getSettings(userId);
      res.json(settings);
    } catch (error) {
      logger.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  },

  // Update settings for current user
  async updateSettings(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const updatedSettings = await userSettingsService.updateSettings(
        userId,
        req.body
      );
      res.json(updatedSettings);
    } catch (error) {
      logger.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  },

  // Initialize settings for a new user - called during user registration
  async initializeUserSettings(userId, userName) {
    try {
      if (!userId) {
        throw new Error("User ID is required for initializing settings");
      }

      return await userSettingsService.updateSettings(userId, {
        agentName: userName || "Your Name",
        companyName: "Your Company",
        agentCity: "Your City",
        agentState: "Your State",
        aiAssistantEnabled: true,
      });
    } catch (error) {
      logger.error("Error initializing user settings:", error);
      throw error;
    }
  },
};

module.exports = settingsController;
