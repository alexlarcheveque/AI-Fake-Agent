const Settings = require("../models/Settings");

const agentSettings = {
  _settings: {
    name: "Alex Larcheveque",
    companyName: "Serene Team",
    city: "Culver City",
    state: "California",
  },

  async initialize() {
    try {
      const dbSettings = await Settings.findAll();
      const settingsMap = dbSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      this._settings = {
        name: settingsMap.AGENT_NAME || this._settings.name,
        companyName: settingsMap.COMPANY_NAME || this._settings.companyName,
        city: settingsMap.AGENT_CITY || this._settings.city,
        state: settingsMap.AGENT_STATE || this._settings.state,
      };
    } catch (error) {
      console.error("Error loading settings:", error);
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
