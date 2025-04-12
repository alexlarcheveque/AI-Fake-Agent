const UserSettings = require("../models/UserSettings");
const logger = require("../utils/logger");
const DEFAULT_SETTINGS = require("../config/defaultSettings");

// Helper function to convert DEFAULT_SETTINGS to the consistent lowercase format
function getDefaultSettingsInLowercaseFormat() {
  return {
    agentName: DEFAULT_SETTINGS.AGENT_NAME || "Your Name",
    companyName: DEFAULT_SETTINGS.COMPANY_NAME || "Your Company", 
    agentState: DEFAULT_SETTINGS.AGENT_STATE || "Your State",
    agentCity: DEFAULT_SETTINGS.AGENT_CITY || "Your City",
    aiAssistantEnabled: DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED !== undefined ? 
                         DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED : true,
    followUpIntervalNew: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_NEW || 2,
    followUpIntervalInConversation: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_IN_CONVERSATION || 3,
    followUpIntervalQualified: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_QUALIFIED || 5,
    followUpIntervalAppointmentSet: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_APPOINTMENT_SET || 1,
    followUpIntervalConverted: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_CONVERTED || 14,
    followUpIntervalInactive: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_INACTIVE || 30
  };
}

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
        // Use the helper function
        return getDefaultSettingsInLowercaseFormat();
      }
      
      // Find the settings for this user
      const userSettings = await UserSettings.findOne({
        where: { userId },
      });

      if (!userSettings) {
        console.log(`No settings found for user ${userId}, using defaults`);
        // Use the helper function 
        return getDefaultSettingsInLowercaseFormat();
      }
      
      // Return the settings with lowercase property names to match frontend and openaiService expectations
      const settingsMap = {
        agentName: userSettings.agentName || DEFAULT_SETTINGS.AGENT_NAME,
        companyName: userSettings.companyName || DEFAULT_SETTINGS.COMPANY_NAME,
        agentState: userSettings.agentState || DEFAULT_SETTINGS.AGENT_STATE,
        agentCity: userSettings.agentCity || DEFAULT_SETTINGS.AGENT_CITY,
        aiAssistantEnabled: userSettings.aiAssistantEnabled !== undefined ? 
                           userSettings.aiAssistantEnabled : 
                           DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED,
        // Add follow-up interval settings with proper mapping
        followUpIntervalNew: userSettings.followUpIntervalNew || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_NEW,
        followUpIntervalInConversation: userSettings.followUpIntervalInConversation || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_IN_CONVERSATION,
        followUpIntervalQualified: userSettings.followUpIntervalQualified || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_QUALIFIED,
        followUpIntervalAppointmentSet: userSettings.followUpIntervalAppointmentSet || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_APPOINTMENT_SET,
        followUpIntervalConverted: userSettings.followUpIntervalConverted || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_CONVERTED,
        followUpIntervalInactive: userSettings.followUpIntervalInactive || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_INACTIVE,
      };
      
      console.log(`Retrieved settings for user ${userId}:`, settingsMap);
      return settingsMap;
    } catch (error) {
      console.error(`Error getting settings for user ${userId}:`, error);
      // Use the helper function
      return getDefaultSettingsInLowercaseFormat();
    }
  },
};

module.exports = userSettingsService;
