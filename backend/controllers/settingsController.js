const Settings = require("../models/Settings");
const logger = require("../utils/logger");

const DEFAULT_SETTINGS = {
  AGENT_NAME: "",
  COMPANY_NAME: "",
  AGENT_CITY: "",
  AGENT_STATE: "",
  AI_ASSISTANT_ENABLED: true,
};

const settingsController = {
  // Initialize settings with default values
  async initializeSettings() {
    try {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        const [setting] = await Settings.findOrCreate({
          where: { key },
          defaults: { value: value.toString() },
        });
      }
    } catch (error) {
      logger.error("Error initializing settings:", error);
      throw error;
    }
  },

  // Get all settings
  async getSettings(req, res) {
    try {
      const settings = await Settings.findAll();
      const settingsMap = settings.reduce((acc, setting) => {
        // Convert 'true'/'false' strings to actual booleans for boolean settings
        if (setting.key === "AI_ASSISTANT_ENABLED") {
          acc[setting.key] = setting.value === "true";
        } else {
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {});

      res.json(settingsMap);
    } catch (error) {
      logger.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  },

  // Update settings
  async updateSettings(req, res) {
    try {
      const updates = req.body;

      for (const [key, value] of Object.entries(updates)) {
        await Settings.update({ value: value.toString() }, { where: { key } });
      }

      // Fetch and return updated settings
      const settings = await Settings.findAll();
      const settingsMap = settings.reduce((acc, setting) => {
        // Convert 'true'/'false' strings to actual booleans for boolean settings
        if (setting.key === "AI_ASSISTANT_ENABLED") {
          acc[setting.key] = setting.value === "true";
        } else {
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {});

      res.json(settingsMap);
    } catch (error) {
      logger.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  },
};

module.exports = settingsController;
