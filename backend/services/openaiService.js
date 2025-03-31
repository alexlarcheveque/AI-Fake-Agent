const OpenAI = require("openai");
const logger = require("../utils/logger");
const agentSettings = require("../config/agentSettings");
const { format, addDays, getDay } = require("date-fns");

const apiKey = process.env.OPENAI_API_KEY || "your_api_key_here";

const openai = new OpenAI({ apiKey });

const openaiService = {
  async generateResponse(
    userMessage,
    settingsMap = {},
    previousMessages = [],
    promptContext = {}
  ) {
    try {
      // Destructure promptContext to get lead information
      const { 
        leadName = "the client", 
        leadStatus = "New",
        qualifyingLeadDetected = false
      } = promptContext;
      
      // Get settings from agentSettings if not provided
      const configSettings = settingsMap || agentSettings.getAll();

      // Get current date for proper date references in the system prompt
      const currentDate = new Date();
      const formattedCurrentDate = format(currentDate, "MMMM d, yyyy");
      const currentDayName = format(currentDate, "EEEE");
      
      // Calculate tomorrow's date for examples
      const tomorrow = addDays(currentDate, 1);
      const tomorrowFormatted = format(tomorrow, "MM/dd/yyyy");
      
      // Calculate weekend dates for examples
      const daysUntilSaturday = (6 - getDay(currentDate) + 7) % 7;
      const daysUntilSunday = (0 - getDay(currentDate) + 7) % 7;
      const nextSaturday = addDays(currentDate, daysUntilSaturday || 7);
      const nextSunday = addDays(currentDate, daysUntilSunday || 7);
      const saturdayFormatted = format(nextSaturday, "MM/dd/yyyy");
      const sundayFormatted = format(nextSunday, "MM/dd/yyyy");

      console.log("Using settings for AI response:", {
        AGENT_NAME: configSettings.AGENT_NAME,
        COMPANY_NAME: configSettings.COMPANY_NAME,
        AGENT_STATE: configSettings.AGENT_STATE,
        CURRENT_DATE: formattedCurrentDate,
      });

      // Convert previous messages to OpenAI format
      const messageHistory = previousMessages.map((msg) => ({
        role: msg.sender === "lead" ? "user" : "assistant",
        content: msg.text,
      }));

      // If this is the first message and there's lead context, add it as the first user message
      if (
        messageHistory.length === 0 &&
        userMessage.startsWith("Initial warm and engaging introduction")
      ) {
        messageHistory.push({
          role: "user",
          content:
            "Here's my situation: " +
            userMessage.replace(
              "Initial warm and engaging introduction message with the following context: ",
              ""
            ),
        });
        // Set an empty text so the AI just responds to the context
        userMessage = "";
      }

      console.log("messageHistory", messageHistory);

      // If qualifying lead detected, add instructions to ask qualification questions
      let qualificationInstructions = "";
      if (qualifyingLeadDetected) {
        qualificationInstructions = `
        IMPORTANT: This lead has shown interest in buying/selling real estate. Ask 1-2 friendly 
        questions to gather more information about their needs in ONE of these areas:
        - Timeline (When they want to buy/sell)
        - Budget (What price range they're considering)
        - Location (What areas they're interested in)
        
        Keep it conversational, not like a formal survey. Don't ask about all three at once.
        `;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional, experienced, and helpful real estate agent assistant in the state of ${configSettings.AGENT_STATE} acting as a real estate agent named "${configSettings.AGENT_NAME}" and are working for a company named "${configSettings.COMPANY_NAME}". 
            You are interacting with potential home buyers or sellers. 
            You have experience in serving the lead's location as your team has helped buy and sell properties in that area. 
            Keep responses under 150 tokens, keep formatting simple and concise.

            Today's date is ${formattedCurrentDate} (${currentDayName}).

            All leads have filled out some sort of ad or form on our website. They don't have any context about our company or agent, so we need to build rapport and get to know them. Make sure to confirm with them that their timeline, search criteria, budget, and preapproval status is correct.

              ## Instructions for Buyers:

              - **Objective**: Help potential home buyers set an appointment to view a property.
              - **Services**:
                - The main goal is to firstly build rapport with the buyer.
                - Then help potential home buyers set an appointment to view a property.
                - Assist them in finding properties in their area that meet their criteria. If their criteria is missing or not specific, ask them for more details.
                - Ask proactive questions and address any questions/objections they have regarding the local real estate market.
                - If interested in specific properties and only once have provided a valid email, reply that you will find properties that meet their criteria and include "NEW SEARCH CRITERIA: BED:<bed_count> BATH:<bath_count> PRICE:<price_range> SQFT:<sqft_range>" at the end of the message.
                - If an appointment is scheduled, conclude with the exact text "NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM" at the end of your message, where MM/DD/YYYY is the actual date with real numbers (not placeholders). For example, if the appointment is for June 1, 2025, you would write "NEW APPOINTMENT SET: 06/01/2025 at 2:00 PM". Be sure to include leading zeros for single-digit months and days.
              - **Tone and Style**: Maintain professionalism, be informative, and steer them towards the next steps in their real estate journey. Ensure responses are concise and informative, suitable for text conversation.

              ## Instructions for Sellers:

              - **Objective**: Assist potential home sellers in setting an appointment to sell their property.
              - **Services**: 
                - Answer any questions they may have about the real estate market in their area.
              - **Tone and Style**: Maintain professionalism, be informative, and guide them towards the next steps in their real estate journey.

              # Output Format

              Provide responses in a concise and text-friendly format, with clear actionable steps for the client.

              # Appointment Format Requirements:
              
              When scheduling appointments, ALWAYS follow these rules:
              1. Format dates as MM/DD/YYYY (with leading zeros for single digits)
              2. Format times as HH:MM AM/PM or HH:MM PM (include minutes even for whole hours)
              3. Use the exact phrase "NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM" at the end of your message
              4. NEVER use placeholders like "<MM/DD/YYYY>" - always use real dates
              5. IF a client asks for a specific date (e.g., "Saturday"), convert it to the correct MM/DD/YYYY format based on today's date (${formattedCurrentDate})
              6. Use REALISTIC scheduling: No appointments in the past or same day, earliest is tomorrow (${tomorrowFormatted})
              
              # Examples

              Example 1:
              - **Input**: Potential buyer interested in a 3-bedroom house within the zip code 12345. Email provided.
              - **Output**: "Thank you for your interest! I'll find properties matching your criteria. NEW SEARCH CRITERIA: BED:3 BATH:2 PRICE:300000-500000 SQFT:1500-2500"

              Example 2:
              - **Input**: Potential seller interested in setting up an appointment for tomorrow.
              - **Output**: "I can help set up a meeting to discuss listing your property. I'm available tomorrow at 2 PM. NEW APPOINTMENT SET: ${tomorrowFormatted} at 2:00 PM"

              Example 3:
              - **Input**: Lead wants to schedule a house viewing on Saturday.
              - **Output**: "I'd be happy to show you properties this Saturday at 3:00 PM. NEW APPOINTMENT SET: ${saturdayFormatted} at 3:00 PM"
              
              Example 4:
              - **Input**: Client asks to meet this weekend.
              - **Output**: "I'm available to meet this Sunday. Does 10:30 AM work for you? NEW APPOINTMENT SET: ${sundayFormatted} at 10:30 AM"

              # Notes

              - Ensure responses meet the buyer's or seller's immediate needs and encourage the desired next steps.
              - NEVER use placeholder text for dates. Always convert day names (like "Saturday") to a specific date (like "${saturdayFormatted}").
              - For appointments, always use the exact format "NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM" with real dates and times.

              ${qualificationInstructions}`,
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
      
      // Check for "NEW APPOINTMENT SET:" in the response
      const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
      const appointmentMatch = responseContent.match(appointmentRegex);
      
      // Check for "NEW SEARCH CRITERIA:" in the response
      const searchCriteriaRegex = /NEW SEARCH CRITERIA:.*?(?:\n|$)/i;
      const searchCriteriaMatch = responseContent.match(searchCriteriaRegex);
      
      if (appointmentMatch) {
        let appointmentDate = appointmentMatch[1];
        const appointmentTime = appointmentMatch[2];
        
        // Check if the date is a placeholder (like MM/DD/YYYY)
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(appointmentDate)) {
          // Look for day names in the message to extract a real date
          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
                            'tomorrow', 'today', 'next week'];
          const dayRegex = new RegExp(`(${dayNames.join('|')})`, 'i');
          const dayMatch = responseContent.toLowerCase().match(dayRegex);
          
          if (dayMatch) {
            // Convert day name to an actual date
            const dayName = dayMatch[1].toLowerCase();
            const today = new Date();
            let targetDate = new Date(today);
            
            if (dayName === 'tomorrow') {
              targetDate.setDate(today.getDate() + 1);
            } else if (dayName === 'today') {
              targetDate.setDate(today.getDate() + 1); // Schedule for tomorrow instead of today
            } else if (dayName === 'next week') {
              targetDate.setDate(today.getDate() + 7);
            } else {
              // Handle specific day names
              const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const targetDay = daysOfWeek.indexOf(dayName);
              if (targetDay !== -1) {
                const currentDay = today.getDay();
                let daysToAdd = (targetDay + 7 - currentDay) % 7;
                // If today is the target day or would result in scheduling for today, schedule for next week
                if (daysToAdd === 0 || daysToAdd === 7) {
                  daysToAdd = 7;
                }
                targetDate.setDate(today.getDate() + daysToAdd);
              }
            }
            
            // Format the date as MM/DD/YYYY
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const year = targetDate.getFullYear();
            appointmentDate = `${month}/${day}/${year}`;
            
            console.log(`Converted day name "${dayName}" to date: ${appointmentDate}`);
          } else {
            // Default to a date 3 days from now if no day name is found
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 3);
            const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
            const day = String(defaultDate.getDate()).padStart(2, '0');
            const year = defaultDate.getFullYear();
            appointmentDate = `${month}/${day}/${year}`;
            
            console.log(`Using default date: ${appointmentDate}`);
          }
        }
        
        console.log(`Detected appointment: ${appointmentDate} at ${appointmentTime}`);
        
        // Remove the original "NEW APPOINTMENT SET:" part from the response
        let cleanedResponse = responseContent.replace(appointmentRegex, '').trim();
        
        // Just return the cleaned response with appointment details
        return {
          text: cleanedResponse,
          appointmentDetails: {
            date: appointmentDate,
            time: appointmentTime
          }
        };
      } else if (searchCriteriaMatch) {
        // Handle property search criteria
        console.log(`Detected property search criteria: ${searchCriteriaMatch[0]}`);
        
        // Extract the raw search criteria text
        const rawSearchCriteria = searchCriteriaMatch[0].replace(/NEW SEARCH CRITERIA:\s*/i, '').trim();
        
        // Clean up the response by removing the search criteria text
        const cleanedResponse = responseContent.replace(/NEW SEARCH CRITERIA:.*/gs, '').trim();
        
        // Parse the search criteria in a more structured way
        const searchCriteria = this.parsePropertySearchCriteria(rawSearchCriteria);
        
        // Return both the cleaned response and a flag indicating it's a property search
        return {
          text: cleanedResponse,
          isPropertySearch: true,
          searchCriteria: rawSearchCriteria,
          parsedCriteria: searchCriteria
        };
      }
      
      // If no appointment or search criteria detected, return the original response
      return responseContent;
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

  // Handle property search criteria from AI-detected text
  async handlePropertySearchCriteria(leadId, searchCriteria) {
    try {
      const propertyService = require('./propertyService');
      
      // Log the detected search criteria
      logger.info(`Handling property search criteria for lead ${leadId}:`, searchCriteria);
      
      // Convert AI-detected search criteria to database format
      const dbSearchCriteria = {
        minBedrooms: searchCriteria.beds || null,
        maxBedrooms: null,
        minBathrooms: searchCriteria.baths || null,
        maxBathrooms: null,
        minPrice: searchCriteria.minPrice || null,
        maxPrice: searchCriteria.maxPrice || null,
        minSquareFeet: searchCriteria.minSqft || null,
        maxSquareFeet: searchCriteria.maxSqft || null,
        locations: searchCriteria.locations || [],
        propertyTypes: ['Single Family Home'], // Default, can be overridden if detected
        originalSearchText: searchCriteria.originalText || null
      };
      
      // Save the search and run matching
      const search = await propertyService.saveLeadPropertySearch(leadId, dbSearchCriteria);
      
      logger.info(`Created property search for lead ${leadId} with ID ${search.id}`);
      return search.id;
    } catch (error) {
      logger.error('Error handling property search criteria:', error);
      return null;
    }
  },

  // Parse property search criteria from text
  parsePropertySearchCriteria(criteriaText) {
    try {
      const criteria = {
        originalText: criteriaText,
      };
      
      // Match beds, e.g., "BED:3" or "BEDS:3"
      const bedsMatch = criteriaText.match(/BED(?:S)?:?\s*(\d+)/i);
      if (bedsMatch) {
        criteria.beds = parseInt(bedsMatch[1]);
      }
      
      // Match baths, e.g., "BATH:2" or "BATHS:2"
      const bathsMatch = criteriaText.match(/BATH(?:S)?:?\s*(\d+(?:\.\d+)?)/i);
      if (bathsMatch) {
        criteria.baths = parseFloat(bathsMatch[1]);
      }
      
      // Match price range, e.g., "PRICE:$800,000" or "PRICE:$500,000-$800,000"
      const priceRangeMatch = criteriaText.match(/PRICE:?\s*\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?/i);
      if (priceRangeMatch) {
        const minPrice = priceRangeMatch[1].replace(/,/g, '');
        criteria.minPrice = parseInt(minPrice);
        
        if (priceRangeMatch[2]) {
          const maxPrice = priceRangeMatch[2].replace(/,/g, '');
          criteria.maxPrice = parseInt(maxPrice);
        } else {
          // If only one price is specified, treat it as the maximum price
          criteria.maxPrice = criteria.minPrice;
          criteria.minPrice = undefined;
        }
      }
      
      // Match square footage, e.g., "SQFT:1500-2500" or "SQFT:2000+"
      const sqftMatch = criteriaText.match(/SQFT:?\s*([\d,]+)(?:\s*-\s*([\d,]+)|\s*\+)?/i);
      if (sqftMatch) {
        const minSqft = sqftMatch[1].replace(/,/g, '');
        criteria.minSqft = parseInt(minSqft);
        
        if (sqftMatch[2]) {
          const maxSqft = sqftMatch[2].replace(/,/g, '');
          criteria.maxSqft = parseInt(maxSqft);
        }
      }
      
      // Match locations (look for any text not part of the other criteria)
      const locationMatches = criteriaText.match(/(?:IN|LOCATION|AREA):\s*([^,]+(?:,\s*[^,]+)*)/i);
      if (locationMatches) {
        criteria.locations = locationMatches[1].split(',').map(loc => loc.trim());
      } else {
        // Try to find standalone location mentions (not tagged with LOCATION:)
        // This is a simplified approach and might pick up false positives
        const words = criteriaText.split(/\s+/);
        const potentialLocations = words.filter(word => 
          !word.match(/BED|BATH|PRICE|SQFT|:|\d+/i) && 
          word.length > 3
        );
        
        if (potentialLocations.length > 0) {
          criteria.locations = potentialLocations;
        }
      }
      
      // Remove any empty locations
      if (criteria.locations) {
        criteria.locations = criteria.locations.filter(loc => loc && loc.trim().length > 0);
        if (criteria.locations.length === 0) {
          delete criteria.locations;
        }
      }
      
      return criteria;
    } catch (error) {
      logger.error('Error parsing property search criteria:', error);
      return { originalText: criteriaText };
    }
  },
};

module.exports = openaiService;
