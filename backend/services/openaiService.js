const OpenAI = require("openai");
const logger = require("../utils/logger");
const agentSettings = require("../config/agentSettings");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openaiService = {
  async generateResponse(text, settings = null, previousMessages = []) {
    try {
      // Get settings from agentSettings if not provided
      const configSettings = settings || agentSettings.getAll();

      // Convert previous messages to OpenAI format
      const messageHistory = previousMessages.map((msg) => ({
        role: msg.sender === "lead" ? "user" : "assistant",
        content: msg.text,
      }));

      // If this is the first message and there's lead context, add it as the first user message
      if (
        messageHistory.length === 0 &&
        text.startsWith("Initial warm and engaging introduction")
      ) {
        messageHistory.push({
          role: "user",
          content:
            "Here's my situation: " +
            text.replace(
              "Initial warm and engaging introduction message with the following context: ",
              ""
            ),
        });
        // Set an empty text so the AI just responds to the context
        text = "";
      }

      console.log("messageHistory", messageHistory);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional, experienced, and helpful real estate agent assistant in the state of ${configSettings.AGENT_STATE} acting as a real estate agent named "${configSettings.AGENT_NAME}" and are working for a company named "${configSettings.COMPANY_NAME}". 
            You are interacting with potential home buyers or sellers. 
            You have experience in serving the lead's location as your team has helped buy and sell properties in that area. 
            Keep responses under 150 tokens, keep formatting simple and concise.

            All leads have filled out some sort of ad or form on our website. They don't have any context about our company or agent, so we need to build rapport and get to know them. Make sure to confirm with them that their timeline, search criteria, budget, and preapproval status is correct.

              ## Instructions for Buyers:

              - **Objective**: Help potential home buyers set an appointment to view a property.
              - **Services**:
                - The main goal is to firstly build rapport with the buyer.
                - Then help potential home buyers set an appointment to view a property.
                - Assist them in finding properties in their area that meet their criteria. If their criteria is missing or not specific, ask them for more details.
                - Ask proactive questions and address any questions/objections they have regarding the local real estate market.
                - If interested in specific properties and only once have provided a valid email, reply that you will find properties that meet their criteria and include "NEW SEARCH CRITERIA: BED:<bed_count> BATH:<bath_count> PRICE:<price_range> SQFT:<sqft_range>" at the end of the message.
                - If an appointment is scheduled, conclude with "NEW APPOINTMENT SET: <appointment_date> at <appointment_time>" at the end of the message.
              - **Tone and Style**: Maintain professionalism, be informative, and steer them towards the next steps in their real estate journey. Ensure responses are concise and informative, suitable for text conversation.

              ## Instructions for Sellers:

              - **Objective**: Assist potential home sellers in setting an appointment to sell their property.
              - **Services**: 
                - Answer any questions they may have about the real estate market in their area.
              - **Tone and Style**: Maintain professionalism, be informative, and guide them towards the next steps in their real estate journey.

              # Output Format

              Provide responses in a concise and text-friendly format, with clear actionable steps for the client.

              # Examples

              Example 1:
              - **Input**: Potential buyer interested in a 3-bedroom house within the zip code 12345. Email provided.
              - **Output**: "Thank you for your interest! I'll find properties matching your criteria. NEW SEARCH CRITERIA: 3-bedroom homes in 12345."

              Example 2:
              - **Input**: Potential seller interested in setting up an appointment to list their home.
              - **Output**: "I can help set up a meeting to discuss listing your property. When are you available?"

              # Notes

              - Ensure responses meet the buyer's or seller's immediate needs and encourage the desired next steps.
              - Consider potential prompt updates for handling different regions and market conditions.`,
          },
          ...messageHistory,
          ...(text
            ? [
                {
                  role: "user",
                  content: text,
                },
              ]
            : []),
        ],
        max_tokens: 1000,
        temperature: 1,
        frequency_penalty: 0.81,
        presence_penalty: 0.85,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error("Error generating OpenAI response:", error);
      throw error;
    }
  },

  /**
   * Generates a follow-up message for a lead based on their information
   * @param {Object} lead - The lead object
   * @returns {Promise<string>} - The generated follow-up message
   */
  async generateFollowUpMessage(lead) {
    try {
      // Use agentSettings instead of appSettings
      const settingsMap = agentSettings.getAll();

      // Create a prompt based on the lead's message count
      let prompt = "";

      if (lead.messageCount === 0) {
        prompt = `Generate an initial follow-up message to a potential real estate lead named ${lead.name}. 
        The message should be friendly, professional, and encourage a response. 
        Keep it brief (under 160 characters if possible) and conversational.`;
      } else {
        // For subsequent follow-ups
        prompt = `Generate follow-up message #${
          lead.messageCount + 1
        } for a real estate lead named ${lead.name} 
        who hasn't responded to previous messages. Keep it casual but professional, 
        and don't be pushy. The message should be brief (under 160 characters if possible).`;
      }

      // Generate the response using the existing generateResponse function
      const followUpMessage = await this.generateResponse(
        prompt,
        settingsMap,
        [] // No previous messages needed for follow-up
      );

      return followUpMessage;
    } catch (error) {
      logger.error(
        `Error generating follow-up message for lead ${lead.id}:`,
        error
      );
      // Return a default message in case of error
      return `Hi ${lead.name}, just checking in to see if you have any questions about real estate opportunities. Let me know if you'd like to chat!`;
    }
  },
};

module.exports = openaiService;
