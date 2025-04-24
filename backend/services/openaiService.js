import OpenAI from "openai";
import logger from "../utils/logger.js";
import agentSettings from "../config/agentSettings.js";
import { format, addDays, getDay } from "date-fns";
import generateBuyerLeadPrompt from "./prompts/buyerPrompt.js";

const apiKey = process.env.OPENAI_API_KEY || "your_api_key_here";

const openai = new OpenAI({ apiKey });

const openaiService = {
 
  async generateResponse(
    leadContext = {},
    previousMessages = [],
    userMessage,
  ) {
    try {
      // Get settings from agentSettings if not provided
      const configSettings = await agentSettings.getAll();

      // get current date and tomorrow's date
      const currentDate = new Date();
      const formattedCurrentDate = format(currentDate, "MMMM d, yyyy");
      const currentDayName = format(currentDate, "EEEE");
      const tomorrow = addDays(currentDate, 1);
      const tomorrowFormatted = format(tomorrow, "MM/dd/yyyy");

      // Convert previous messages to OpenAI format
      const messageHistory = previousMessages.map((msg) => ({
        role: msg.sender === "lead" ? "user" : "assistant",
        content: msg.text,
      }));

      console.log('configSettings', configSettings);

      const systemPrompt = generateBuyerLeadPrompt(
        configSettings, 
        leadContext, 
        formattedCurrentDate, 
        currentDayName, 
        tomorrowFormatted
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messageHistory,
          ...(userMessage
            ? [
                {
                  role: "user",
                  content: userMessage,
                },
              ]
            : []),
        ],
        max_tokens: 1000,
        temperature: 1,
        frequency_penalty: 0.81,
        presence_penalty: 0.85,
      });

      const responseContent = completion.choices[0].message.content;
      
      // Check for appointment details
      const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
      const appointmentMatch = responseContent.match(appointmentRegex);

      console.log('appointmentMatch', appointmentMatch);
      
      // Check for new search details
      const searchCriteriaRegex = /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i;
      const searchCriteriaMatch = responseContent.match(searchCriteriaRegex);

      console.log('searchCriteriaMatch', searchCriteriaMatch);
        
        // Remove the original "NEW APPOINTMENT SET:" part from the response
        let cleanedResponse = responseContent;
         
        if (appointmentMatch) {
          cleanedResponse = responseContent.replace(appointmentRegex, '').trim();
        }

        if (searchCriteriaMatch) {
          cleanedResponse = cleanedResponse.replace(searchCriteriaRegex, '').trim();
        }
        
        // if (searchCriteriaMatch) {
        //   // Extract the raw search criteria text
        //   const rawSearchCriteria = searchCriteriaMatch[0].trim();

        //   console.log('new property search - raw search criteria', rawSearchCriteria);
          
        //   // Clean up the response by removing the search criteria text
        //   cleanedResponse = cleanedResponse.replace(searchCriteriaRegex, '').trim();
          
        //   // Set property search data
        //   isPropertySearch = true;
        //   searchCriteria = rawSearchCriteria;
        // }
        
        return cleanedResponse;
    } catch (error) {
      logger.error("Error generating OpenAI response:", error);
      throw error;
    }
  },
};

export default openaiService;
