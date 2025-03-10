const UserSettings = require("../models/UserSettings");
const logger = require("../utils/logger");

const DEFAULT_SETTINGS = {
  agentName: "Your Name",
  companyName: "Your Company",
  agentCity: "Your City",
  agentState: "Your State",
  aiAssistantEnabled: true,
};

const userSettingsService = {
  // Get settings for a user (create if it doesn't exist)
  async getSettings(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const [settings] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: DEFAULT_SETTINGS,
      });

      return settings;
    } catch (error) {
      logger.error("Error getting user settings:", error);
      throw error;
    }
  },

  // Update settings for a user
  async updateSettings(userId, settingsData) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Find or create the settings
      const [settings] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: DEFAULT_SETTINGS,
      });

      // Update with new data
      await settings.update(settingsData);
      return settings;
    } catch (error) {
      logger.error("Error updating user settings:", error);
      throw error;
    }
  },

  // Add this new function
  async getAllSettings(userId) {
    try {
      const settings = await UserSettings.findAll({
        where: { userId },
      });

      // Convert to a map
      const settingsMap = {};
      settings.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });

      console.log(
        `Retrieved ${settings.length} settings for user ${userId}:`,
        settingsMap
      );

      // Fill in any missing settings with defaults
      Object.keys(DEFAULT_SETTINGS).forEach((key) => {
        if (!settingsMap[key]) {
          settingsMap[key] = DEFAULT_SETTINGS[key];
        }
      });

      return settingsMap;
    } catch (error) {
      console.error(`Error getting settings for user ${userId}:`, error);
      return DEFAULT_SETTINGS; // Fallback to defaults on error
    }
  },
};

module.exports = userSettingsService;
