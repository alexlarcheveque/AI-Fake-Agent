const UserSettings = require("../models/UserSettings");

const agentSettings = {
  _settings: {
    agentName: "Default Agent",
    companyName: "Default Company",
    city: "Default City",
    state: "Default State",
  },

  async initialize() {
    // This method is no longer needed for global settings
    // But we'll keep it for backward compatibility
    console.log("Agent settings initialized with defaults");
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
          name: userSettings.agentName,
          companyName: userSettings.companyName,
          city: userSettings.agentCity,
          state: userSettings.agentState,
        };
      }
    } catch (error) {
      console.error("Failed to load user settings", error);
    }
  },

  get name() {
    return this._settings.name;
  },
  get companyName() {
    return this._settings.companyName;
  },
  get city() {
    return this._settings.city;
  },
  get state() {
    return this._settings.state;
  },

  getSystemPrompt: function () {
    return `You are a helpful real estate agent assistant acting as a real estate agent named "${this.name}" 
            and are working for a company named "${this.companyName}", located in the city of ${this.city}, ${this.state}. 
            Your main goal is to help potential home buyers set an appointment with you to view a property,
            and to help with any questions they may have about the real estate market in ${this.city}.
            Be professional, informative, and guide them towards taking the next step in their real estate journey.`;
  },
};

module.exports = agentSettings;
