import UserSettings from "../models/UserSettings.js";
import { Op } from "sequelize";

const agentSettings = {
  _settings: {
    agentName: "Default Agent",
    companyName: "Default Company",
    agentState: "Default State",
    agentCity: "Default City",
  },

  async initialize() {
    try {
      let defaultSettings;
      
      try {
        // First try to find settings with isDefault flag
        defaultSettings = await UserSettings.findOne({
          where: { isDefault: true }
        });
      } catch (error) {
        // If isDefault column doesn't exist or any other error, log but continue
        console.log("Could not query by isDefault, trying to find any user settings");
      }
      
      // If we didn't find settings by isDefault, try to find any record
      if (!defaultSettings) {
        try {
          defaultSettings = await UserSettings.findOne();
        } catch (error) {
          console.error("Error finding any user settings:", error);
        }
      }

      // If no settings exist, we'll use the defaults but not create a record
      // since we don't have a valid userId
      if (defaultSettings) {
        // Use the found settings
        this._settings = {
          agentName: defaultSettings.agentName || this._settings.agentName,
          companyName: defaultSettings.companyName || this._settings.companyName,
          agentState: defaultSettings.agentState || this._settings.agentState,
          agentCity: defaultSettings.agentCity || this._settings.agentCity,
        };
        console.log("Agent settings initialized from UserSettings table");
      } else {
        console.log("No user settings found, using defaults");
        // Just use the default settings defined in _settings
      }

      return this._settings;
    } catch (error) {
      console.error("Error loading default settings:", error);
      return this._settings; // Return defaults if there's an error
    }
  },

  async loadUserSettings(userId) {
    if (!userId) {
      return;
    }

    try {
      const userSettings = await UserSettings.findOne({
        where: { userId },
      });

      if (userSettings) {
        this._settings = {
          agentName: userSettings.agentName || this._settings.agentName,
          companyName: userSettings.companyName || this._settings.companyName,
          agentState: userSettings.agentState || this._settings.agentState,
        };
      }
    } catch (error) {
      console.error("Failed to load user settings", error);
    }
  },

  // Getters
  get agentName() {
    return this._settings.agentName;
  },

  get companyName() {
    return this._settings.companyName;
  },

  get agentState() {
    return this._settings.agentState;
  },

  get agentCity() {
    return this._settings.agentCity;
  },

  // Method to get all settings as an object
  async getAll() {
    return {
      AGENT_NAME: this.agentName,
      AGENT_STATE: this.agentState,
      COMPANY_NAME: this.companyName,
      AGENT_CITY: this.agentCity,
    };
  },

  getSystemPrompt: function () {
    return `You are a helpful real estate agent assistant acting as a real estate agent named "${this.agentName}" 
            and are working for a company named "${this.companyName}", located in the city of ${this.agentCity}, ${this.agentState}. 
            Your main goal is to help potential home buyers set an appointment with you to view a property,
            and to help with any questions they may have about the real estate market in ${this.agentCity}.
            Be professional, informative, and guide them towards taking the next step in their real estate journey.`;
  },
};

export default agentSettings;
