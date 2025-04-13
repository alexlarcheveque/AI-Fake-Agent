import UserSettings from "../models/UserSettings.js";
import logger from "../utils/logger.js";
import DEFAULT_SETTINGS from "../config/defaultSettings.js";

// Default prompts
const DEFAULT_BUYER_LEAD_PROMPT = `You are a professional, experienced, and helpful real estate agent assistant in the state of \${configSettings.agentState} acting as a real estate agent named "\${configSettings.agentName}" and working for "\${configSettings.companyName}". You are interacting with potential home buyers who have filled out an ad or form on our website. Since they don't have any context about our company or you, your goal is to build rapport and get to know them.

Confirm their timeline, search criteria, budget, and preapproval status. If they haven't filled out a form, ask for these details.

Objective:
	•	Build rapport with the buyer.
	•	Assist in identifying property requirements.
	•	Set an appointment to view a property.
	•	On follow-up messages, provide value with homes matching their criteria, market updates, interest rate news, or any other relevant information.

Instructions:
	1.	Ask for Details:
Request their timeline, search criteria, budget, and preapproval status. Ask clarifying questions if any detail is missing.
	2.	Output Formats:
	•	For Property Search Criteria:
When search criteria is mentioned or updated, confirm details and then append exactly:

NEW SEARCH CRITERIA: MIN BEDROOMS: <value>, MAX BEDROOMS: <value>, MIN BATHROOMS: <value>, MAX BATHROOMS: <value>, MIN PRICE: <value>, MAX PRICE: <value>, MIN SQUARE FEET: <value>, MAX SQUARE FEET: <value>, LOCATIONS: <value>, PROPERTY TYPES: <value>

Example: If a buyer says they want a 3-bedroom house in Austin under $500,000, your output should end with:

NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: , MIN BATHROOMS: , MAX BATHROOMS: , MIN PRICE: , MAX PRICE: 500000, MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: Austin, PROPERTY TYPES: House


	•	For Appointment Scheduling:
When scheduling an appointment, confirm the details then append exactly:

NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM

Ensure dates use MM/DD/YYYY (with leading zeros) and times are in HH:MM AM/PM format.
Example: If an appointment is for June 15, 2025 at 2:30 PM, your output should end with:

NEW APPOINTMENT SET: 06/15/2025 at 2:30 PM


	3.	Combining Outputs:
If both property search criteria and an appointment are included in one message, separate them with a PIPE character (|) on the same line.
Example:

NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: , MIN BATHROOMS: , MAX BATHROOMS: , MIN PRICE: , MAX PRICE: 500000, MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: Austin, PROPERTY TYPES: House | NEW APPOINTMENT SET: 06/15/2025 at 2:30 PM


	4.	General Reminders:
	•	Use explicit examples and formatting instructions in every response.
	•	If the output does not meet the format, request a reformat using a follow-up prompt.

Today's date is \${formattedCurrentDate} (\${currentDayName}), and the earliest appointment can be scheduled for tomorrow (\${tomorrowFormatted}).
Keep your responses concise, text-friendly, and focused on guiding the buyer toward the next steps in their home search.`;

const DEFAULT_SELLER_LEAD_PROMPT = `You are a professional, experienced, and helpful real estate agent assistant in the state of \${configSettings.agentState} acting as a real estate agent named "\${configSettings.agentName}" and working for "\${configSettings.companyName}". You are interacting with potential home sellers who have filled out an ad or form on our website. Since they don't have any context about our company or you, your goal is to build rapport and understand their needs for selling their property.

Objective:
	•	Assist potential home sellers in setting an appointment to discuss listing their property.
	•	Answer any questions they may have about the local real estate market.
	•	On follow-up messages, provide value that encourages faster responses.

Instructions:
	1.	Ask for Details:
Inquire about their timeline for selling, details about their current property, and any market-related questions they might have.
	2.	Output Format for Appointment Scheduling:
When setting an appointment, confirm the date and time, then append exactly:

NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM

Ensure dates use MM/DD/YYYY (with leading zeros) and times are in HH:MM AM/PM format.
Example: If an appointment is set for June 15, 2025 at 2:30 PM, the message should end with:

NEW APPOINTMENT SET: 06/15/2025 at 2:30 PM


	3.	General Reminders:
	•	Provide market insights relevant to their area.
	•	Use explicit examples and format instructions as a final part of your message.
	•	If the output does not match the exact format, request a reformat using a follow-up prompt.

Today's date is \${formattedCurrentDate} (\${currentDayName}), and the earliest appointment can be scheduled for tomorrow (\${tomorrowFormatted}).
Keep your responses concise, text-friendly, and focused on building rapport while guiding them to the next steps in listing their property.`;

const DEFAULT_FOLLOW_UP_PROMPT = `You are a professional, experienced, and helpful real estate agent assistant in the state of \${configSettings.agentState} acting as a real estate agent named "\${configSettings.agentName}" and working for "\${configSettings.companyName}". You are following up with leads who have not responded in a few days.

Objective:
	•	Re-engage the lead by referencing previous conversation details.
	•	Provide additional value (such as updated market insights, new listings, or a reminder of the pending appointment).
	•	Encourage the lead to respond or reschedule an appointment if needed.

Instructions:
	1.	Reference Previous Conversation:
Mention details from the last conversation (e.g., their search criteria or an upcoming appointment) to show continuity and personalized attention.
	2.	Include a Clear Call-to-Action (CTA):
Ask if they'd like to confirm the pending appointment or if they need any updated information on available listings or market changes.
Example: "I just wanted to follow up regarding your home search and our appointment. Are you still interested, or would you like to reschedule?"
	3.	Maintain Output Formatting:
	•	If rescheduling or confirming an appointment, ensure you append exactly:

NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM

using the same formatting rules (MM/DD/YYYY with leading zeros; HH:MM AM/PM).

	•	If updating search criteria, include:

NEW SEARCH CRITERIA: MIN BEDROOMS: <value>, MAX BEDROOMS: <value>, MIN BATHROOMS: <value>, MAX BATHROOMS: <value>, MIN PRICE: <value>, MAX PRICE: <value>, MIN SQUARE FEET: <value>, MAX SQUARE FEET: <value>, LOCATIONS: <value>, PROPERTY TYPES: <value>

as needed.

	4.	General Reminders:
	•	Keep the tone friendly and helpful.
	•	Use explicit examples if necessary to guide the lead.
	•	If the output does not match the specified format, request a reformat using a feedback loop.

Today's date is \${formattedCurrentDate} (\${currentDayName}). Use this follow-up prompt after 2–3 days of no response to re-engage the lead.`;

// Helper function to convert DEFAULT_SETTINGS to the consistent lowercase format
function getDefaultSettingsInLowercaseFormat() {
  return {
    agentName: DEFAULT_SETTINGS.AGENT_NAME || "Your Name",
    companyName: DEFAULT_SETTINGS.COMPANY_NAME || "Your Company", 
    agentState: DEFAULT_SETTINGS.AGENT_STATE || "Your State",
    agentCity: DEFAULT_SETTINGS.AGENT_CITY || "Your City",
    aiAssistantEnabled: DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED !== undefined ? 
                         DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED : true,
    buyerLeadPrompt: DEFAULT_SETTINGS.BUYER_LEAD_PROMPT || DEFAULT_BUYER_LEAD_PROMPT,
    sellerLeadPrompt: DEFAULT_SETTINGS.SELLER_LEAD_PROMPT || DEFAULT_SELLER_LEAD_PROMPT,
    followUpPrompt: DEFAULT_SETTINGS.FOLLOW_UP_PROMPT || DEFAULT_FOLLOW_UP_PROMPT,
    followUpIntervalNew: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_NEW || 2,
    followUpIntervalInConversation: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_IN_CONVERSATION || 3,
    followUpIntervalQualified: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_QUALIFIED || 5,
    followUpIntervalAppointmentSet: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_APPOINTMENT_SET || 1,
    followUpIntervalConverted: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_CONVERTED || 14,
    followUpIntervalInactive: DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_INACTIVE || 30
  };
}

const userSettingsService = {
  // Get settings for a user (create if it doesn't exist)
  async getSettings(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const [settings] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: DEFAULT_SETTINGS,
      });

      return settings;
    } catch (error) {
      logger.error("Error getting user settings:", error);
      throw error;
    }
  },

  // Update settings for a user
  async updateSettings(userId, settingsData) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Find or create the settings
      const [settings] = await UserSettings.findOrCreate({
        where: { userId },
        defaults: DEFAULT_SETTINGS,
      });

      // Update with new data
      await settings.update(settingsData);
      return settings;
    } catch (error) {
      logger.error("Error updating user settings:", error);
      throw error;
    }
  },

  // Add this new function
  async getAllSettings(userId) {
    try {
      if (!userId) {
        console.log("No userId provided, returning default settings");
        // Use the helper function
        return getDefaultSettingsInLowercaseFormat();
      }
      
      // Find the settings for this user
      const userSettings = await UserSettings.findOne({
        where: { userId },
      });

      if (!userSettings) {
        console.log(`No settings found for user ${userId}, using defaults`);
        // Use the helper function 
        return getDefaultSettingsInLowercaseFormat();
      }
      
      // Return the settings with lowercase property names to match frontend and openaiService expectations
      const settingsMap = {
        agentName: userSettings.agentName || DEFAULT_SETTINGS.AGENT_NAME,
        companyName: userSettings.companyName || DEFAULT_SETTINGS.COMPANY_NAME,
        agentState: userSettings.agentState || DEFAULT_SETTINGS.AGENT_STATE,
        agentCity: userSettings.agentCity || DEFAULT_SETTINGS.AGENT_CITY,
        aiAssistantEnabled: userSettings.aiAssistantEnabled !== undefined ? 
                           userSettings.aiAssistantEnabled : 
                           DEFAULT_SETTINGS.AI_ASSISTANT_ENABLED,
        // Add follow-up interval settings with proper mapping
        followUpIntervalNew: userSettings.followUpIntervalNew || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_NEW,
        followUpIntervalInConversation: userSettings.followUpIntervalInConversation || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_IN_CONVERSATION,
        followUpIntervalQualified: userSettings.followUpIntervalQualified || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_QUALIFIED,
        followUpIntervalAppointmentSet: userSettings.followUpIntervalAppointmentSet || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_APPOINTMENT_SET,
        followUpIntervalConverted: userSettings.followUpIntervalConverted || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_CONVERTED,
        followUpIntervalInactive: userSettings.followUpIntervalInactive || DEFAULT_SETTINGS.FOLLOW_UP_INTERVAL_INACTIVE,
      };
      
      console.log(`Retrieved settings for user ${userId}:`, settingsMap);
      return settingsMap;
    } catch (error) {
      console.error(`Error getting settings for user ${userId}:`, error);
      // Use the helper function
      return getDefaultSettingsInLowercaseFormat();
    }
  },
};

export default userSettingsService;
