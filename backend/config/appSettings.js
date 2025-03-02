require("dotenv").config();

const appSettings = {
  // Default settings
  AGENT_NAME: process.env.AGENT_NAME || "Default Agent",
  AGENT_STATE: process.env.AGENT_STATE || "California",
  COMPANY_NAME: process.env.COMPANY_NAME || "Real Estate Company",

  // Add any other settings you need

  // Method to get all settings as an object
  getAll() {
    return {
      AGENT_NAME: this.AGENT_NAME,
      AGENT_STATE: this.AGENT_STATE,
      COMPANY_NAME: this.COMPANY_NAME,
      // Add other settings here
    };
  },

  // Method to get a specific setting
  get(key) {
    return this[key];
  },
};

module.exports = appSettings;
