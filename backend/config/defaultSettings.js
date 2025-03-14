/**
 * Default settings for the application when user settings are not available
 */
const DEFAULT_SETTINGS = {
  AGENT_NAME: "Your Name",
  COMPANY_NAME: "Your Company",
  AGENT_STATE: "Your State",
  AGENT_CITY: "Your City",
  AGENT_PHONE: "Your Phone",
  AGENT_EMAIL: "your.email@example.com",
  AGENT_WEBSITE: "https://yourwebsite.com",
  AGENT_PHOTO_URL: "https://example.com/agent-photo.jpg",
  COMPANY_LOGO_URL: "https://example.com/company-logo.png",
  AI_ASSISTANT_ENABLED: true,
  FOLLOW_UP_DAYS: 3,
  FOLLOW_UP_MESSAGE:
    "Hi {{name}}, just checking in to see if you have any questions about real estate opportunities. Let me know if you'd like to chat!",
  TIMEZONE: "America/New_York",
  WORKING_HOURS_START: "9:00",
  WORKING_HOURS_END: "17:00",
  WORKING_DAYS: "1,2,3,4,5", // Monday to Friday
};

module.exports = DEFAULT_SETTINGS;
