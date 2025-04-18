import UserSettings from "../models/UserSettings.js";
import logger from "../utils/logger.js";

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
        // Prompt settings
        buyerLeadPrompt: settings.buyerLeadPrompt || "",
        sellerLeadPrompt: settings.sellerLeadPrompt || "",
        followUpPrompt: settings.followUpPrompt || "",
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

      const {
        agentName,
        companyName,
        agentState,
        agentCity,
        aiAssistantEnabled,
        buyerLeadPrompt,
        sellerLeadPrompt,
        followUpPrompt,
        followUpIntervalNew,
        followUpIntervalInConversation,
        followUpIntervalQualified,
        followUpIntervalAppointmentSet,
        followUpIntervalConverted,
        followUpIntervalInactive,
      } = req.body;

      // Find or create settings for this user
      let [settings, created] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: {
          userId,
          agentName: agentName || "Your Name",
          companyName: companyName || "Your Company",
          agentState: agentState || "",
          agentCity: agentCity || "",
          aiAssistantEnabled:
            aiAssistantEnabled !== undefined
              ? aiAssistantEnabled
              : true,
          // Default follow-up intervals
          followUpIntervalNew: followUpIntervalNew || 2,
          followUpIntervalInConversation: followUpIntervalInConversation || 3,
          followUpIntervalQualified: followUpIntervalQualified || 5,
          followUpIntervalAppointmentSet: followUpIntervalAppointmentSet || 1,
          followUpIntervalConverted: followUpIntervalConverted || 14,
          followUpIntervalInactive: followUpIntervalInactive || 30,
        },
      });

      if (!created) {
        // Build update object with only the fields that were sent
        let updateObject = {};
        if (agentName !== undefined) updateObject.agentName = agentName;
        if (companyName !== undefined) updateObject.companyName = companyName;
        if (agentState !== undefined) updateObject.agentState = agentState;
        if (agentCity !== undefined) updateObject.agentCity = agentCity;
        if (aiAssistantEnabled !== undefined) updateObject.aiAssistantEnabled = aiAssistantEnabled;
        if (buyerLeadPrompt !== undefined) updateObject.buyerLeadPrompt = buyerLeadPrompt;
        if (sellerLeadPrompt !== undefined) updateObject.sellerLeadPrompt = sellerLeadPrompt;
        if (followUpPrompt !== undefined) updateObject.followUpPrompt = followUpPrompt;
        if (followUpIntervalNew !== undefined) updateObject.followUpIntervalNew = followUpIntervalNew;
        if (followUpIntervalInConversation !== undefined) updateObject.followUpIntervalInConversation = followUpIntervalInConversation;
        if (followUpIntervalQualified !== undefined) updateObject.followUpIntervalQualified = followUpIntervalQualified;
        if (followUpIntervalAppointmentSet !== undefined) updateObject.followUpIntervalAppointmentSet = followUpIntervalAppointmentSet;
        if (followUpIntervalConverted !== undefined) updateObject.followUpIntervalConverted = followUpIntervalConverted;
        if (followUpIntervalInactive !== undefined) updateObject.followUpIntervalInactive = followUpIntervalInactive;

        // Update existing settings
        await settings.update(updateObject);
      }

      return res.json({
        agentName: settings.agentName || "",
        companyName: settings.companyName || "",
        agentState: settings.agentState || "",
        agentCity: settings.agentCity || "",
        aiAssistantEnabled: settings.aiAssistantEnabled || false,
        // Prompt settings
        buyerLeadPrompt: settings.buyerLeadPrompt || "",
        sellerLeadPrompt: settings.sellerLeadPrompt || "",
        followUpPrompt: settings.followUpPrompt || "",
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

export default settingsController;
