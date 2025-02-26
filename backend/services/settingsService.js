const Settings = require("../models/Settings");
const { Op } = require("sequelize");

const settingsService = {
  // Get a setting for a specific user, fallback to global if not found
  async getSetting(key, userId = null, defaultValue = null) {
    try {
      // First try to find user-specific setting
      if (userId) {
        const userSetting = await Settings.findOne({
          where: { key, userId },
        });

        if (userSetting) {
          return userSetting.value;
        }
      }

      // If not found or no userId provided, try to find global setting
      const globalSetting = await Settings.findOne({
        where: { key, userId: null },
      });

      return globalSetting ? globalSetting.value : defaultValue;
    } catch (error) {
      console.error("Error getting setting:", error);
      return defaultValue;
    }
  },

  // Save a setting for a specific user (or global if userId is null)
  async saveSetting(key, value, userId = null, category = "agent") {
    try {
      // Try to find existing setting with BOTH key and userId
      const [setting, created] = await Settings.findOrCreate({
        where: { key, userId }, // This ensures we find the right setting for this user
        defaults: { value, category },
      });

      // Update if it already exists
      if (!created) {
        setting.value = value;
        await setting.save();
      }

      return setting;
    } catch (error) {
      console.error("Error saving setting:", error);
      throw error;
    }
  },

  // Get all settings for a user, including global fallbacks
  async getAllSettings(userId = null) {
    try {
      // Get all global settings
      const globalSettings = await Settings.findAll({
        where: { userId: null },
      });

      // If no userId, just return global settings
      if (!userId) {
        return globalSettings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});
      }

      // Get user-specific settings
      const userSettings = await Settings.findAll({
        where: { userId },
      });

      // Merge global and user settings (user settings override global)
      const mergedSettings = {};

      // First add all global settings
      globalSettings.forEach((setting) => {
        mergedSettings[setting.key] = setting.value;
      });

      // Then override with user-specific settings
      userSettings.forEach((setting) => {
        mergedSettings[setting.key] = setting.value;
      });

      return mergedSettings;
    } catch (error) {
      console.error("Error getting all settings:", error);
      throw error;
    }
  },
};

module.exports = settingsService;
