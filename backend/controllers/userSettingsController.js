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
          // Default follow-up intervals
          followUpIntervalNew: 2,
          followUpIntervalInConversation: 3,
          followUpIntervalQualified: 5,
          followUpIntervalAppointmentSet: 1,
          followUpIntervalConverted: 14,
          followUpIntervalInactive: 30,
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
          // Default follow-up intervals
          followUpIntervalNew: 2,
          followUpIntervalInConversation: 3,
          followUpIntervalQualified: 5,
          followUpIntervalAppointmentSet: 1,
          followUpIntervalConverted: 14,
          followUpIntervalInactive: 30,
        });
      }

      return res.json({
        agentName: settings.agentName || "",
        companyName: settings.companyName || "",
        agentState: settings.agentState || "",
        agentCity: settings.agentCity || "",
        aiAssistantEnabled: settings.aiAssistantEnabled || false,
        // Follow-up intervals
        followUpIntervalNew: settings.followUpIntervalNew || 2,
        followUpIntervalInConversation: settings.followUpIntervalInConversation || 3,
        followUpIntervalQualified: settings.followUpIntervalQualified || 5,
        followUpIntervalAppointmentSet: settings.followUpIntervalAppointmentSet || 1,
        followUpIntervalConverted: settings.followUpIntervalConverted || 14,
        followUpIntervalInactive: settings.followUpIntervalInactive || 30,
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
          // Default follow-up intervals
          followUpIntervalNew: req.body.followUpIntervalNew || 2,
          followUpIntervalInConversation: req.body.followUpIntervalInConversation || 3,
          followUpIntervalQualified: req.body.followUpIntervalQualified || 5,
          followUpIntervalAppointmentSet: req.body.followUpIntervalAppointmentSet || 1,
          followUpIntervalConverted: req.body.followUpIntervalConverted || 14,
          followUpIntervalInactive: req.body.followUpIntervalInactive || 30,
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
          // Update follow-up intervals if provided
          followUpIntervalNew: req.body.followUpIntervalNew !== undefined 
            ? req.body.followUpIntervalNew 
            : settings.followUpIntervalNew,
          followUpIntervalInConversation: req.body.followUpIntervalInConversation !== undefined 
            ? req.body.followUpIntervalInConversation 
            : settings.followUpIntervalInConversation,
          followUpIntervalQualified: req.body.followUpIntervalQualified !== undefined 
            ? req.body.followUpIntervalQualified 
            : settings.followUpIntervalQualified,
          followUpIntervalAppointmentSet: req.body.followUpIntervalAppointmentSet !== undefined 
            ? req.body.followUpIntervalAppointmentSet 
            : settings.followUpIntervalAppointmentSet,
          followUpIntervalConverted: req.body.followUpIntervalConverted !== undefined 
            ? req.body.followUpIntervalConverted 
            : settings.followUpIntervalConverted,
          followUpIntervalInactive: req.body.followUpIntervalInactive !== undefined 
            ? req.body.followUpIntervalInactive 
            : settings.followUpIntervalInactive,
        });
      }

      return res.json({
        agentName: settings.agentName || "",
        companyName: settings.companyName || "",
        agentState: settings.agentState || "",
        agentCity: settings.agentCity || "",
        aiAssistantEnabled: settings.aiAssistantEnabled || false,
        // Follow-up intervals
        followUpIntervalNew: settings.followUpIntervalNew || 2,
        followUpIntervalInConversation: settings.followUpIntervalInConversation || 3,
        followUpIntervalQualified: settings.followUpIntervalQualified || 5,
        followUpIntervalAppointmentSet: settings.followUpIntervalAppointmentSet || 1,
        followUpIntervalConverted: settings.followUpIntervalConverted || 14,
        followUpIntervalInactive: settings.followUpIntervalInactive || 30,
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
          // Default follow-up intervals
          followUpIntervalNew: 2,
          followUpIntervalInConversation: 3,
          followUpIntervalQualified: 5,
          followUpIntervalAppointmentSet: 1,
          followUpIntervalConverted: 14,
          followUpIntervalInactive: 30,
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
