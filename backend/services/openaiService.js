const OpenAI = require("openai");
const logger = require("../utils/logger");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openaiService = {
  async generateResponse(text, settings) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a helpful real estate agent assistant acting as a real estate agent named "${settings.AGENT_NAME}" 
              and are working for a company named "${settings.COMPANY_NAME}", located in the city of ${settings.AGENT_CITY}, ${settings.AGENT_STATE}. 
              Your main goal is to help potential home buyers set an appointment with you to view a property,
              and to help with any questions they may have about the real estate market in ${settings.AGENT_CITY}.
              Be professional, informative, and guide them towards taking the next step in their real estate journey.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 150,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error("Error generating OpenAI response:", error);
      throw error;
    }
  },
};

module.exports = openaiService;
