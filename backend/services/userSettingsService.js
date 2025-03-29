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
      if (!userId) {
        console.log("No userId provided, returning default settings");
        return DEFAULT_SETTINGS;
      }
      
      // Find the settings for this user
      const userSettings = await UserSettings.findOne({
        where: { userId },
      });

      if (!userSettings) {
        console.log(`No settings found for user ${userId}, using defaults`);
        return DEFAULT_SETTINGS;
      }
      
      // Map the database column names to the uppercase keys expected by OpenAI service
      const settingsMap = {
        AGENT_NAME: userSettings.agentName || DEFAULT_SETTINGS.AGENT_NAME,
        COMPANY_NAME: userSettings.companyName || DEFAULT_SETTINGS.COMPANY_NAME,
        AGENT_STATE: userSettings.agentState || DEFAULT_SETTINGS.AGENT_STATE,
        AGENT_CITY: userSettings.agentCity || DEFAULT_SETTINGS.AGENT_CITY,
        AI_ASSISTANT_ENABLED: userSettings.aiAssistantEnabled !== undefined ? 
                             userSettings.aiAssistantEnabled : 
                             DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED
      };
      
      console.log(`Retrieved settings for user ${userId}:`, settingsMap);
      return settingsMap;
    } catch (error) {
      console.error(`Error getting settings for user ${userId}:`, error);
      return DEFAULT_SETTINGS; // Fallback to defaults on error
    }
  },
};

module.exports = userSettingsService;
