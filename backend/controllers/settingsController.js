const Settings = require("../models/Settings");
const logger = require("../utils/logger");

const settingsController = {
  // Get all settings
  async getSettings(req, res) {
    try {
      const settings = await Settings.findAll();
      const formattedSettings = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      res.json(formattedSettings);
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
        await Settings.upsert({
          key,
          value: String(value),
          category: "agent",
        });
      }

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      logger.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  },

  // Initialize default settings if they don't exist
  async initializeSettings() {
    try {
      // Wait for the Settings model to be synced
      await Settings.sync();

      const defaultSettings = {
        AGENT_NAME: "Alex Larcheveque",
        COMPANY_NAME: "Serene Team",
        AGENT_CITY: "Culver City",
        AGENT_STATE: "California",
      };

      const promises = Object.entries(defaultSettings).map(([key, value]) =>
        Settings.findOrCreate({
          where: { key },
          defaults: {
            value: String(value),
            category: "agent",
          },
        })
      );

      await Promise.all(promises);
      logger.info("Settings initialized successfully");
    } catch (error) {
      logger.error("Error initializing settings:", error);
      throw error; // Rethrow to be caught by the server initialization
    }
  },
};

module.exports = settingsController;
