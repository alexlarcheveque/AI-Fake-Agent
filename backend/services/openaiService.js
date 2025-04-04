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

      // Ensure we have all required settings with proper casing
      // This is critical since the configSettings are used in the system prompt
      const resolvedSettings = {
        // First check the lowercase keys directly as they come from the frontend
        AGENT_NAME: configSettings.agentName || configSettings.AGENT_NAME || "Your Name",
        COMPANY_NAME: configSettings.companyName || configSettings.COMPANY_NAME || "Your Company",
        AGENT_STATE: configSettings.agentState || configSettings.AGENT_STATE || "Your State",
        AGENT_CITY: configSettings.agentCity || configSettings.AGENT_CITY || "Your City",
        AI_ASSISTANT_ENABLED: typeof configSettings.aiAssistantEnabled !== 'undefined' 
          ? configSettings.aiAssistantEnabled 
          : (typeof configSettings.AI_ASSISTANT_ENABLED !== 'undefined' 
             ? configSettings.AI_ASSISTANT_ENABLED 
             : true),
        // Follow-up intervals with consistent naming
        FOLLOW_UP_INTERVAL_NEW: configSettings.followUpIntervalNew || configSettings.FOLLOW_UP_INTERVAL_NEW || 2,
        FOLLOW_UP_INTERVAL_IN_CONVERSATION: configSettings.followUpIntervalInConversation || configSettings.FOLLOW_UP_INTERVAL_IN_CONVERSATION || 3,
        FOLLOW_UP_INTERVAL_QUALIFIED: configSettings.followUpIntervalQualified || configSettings.FOLLOW_UP_INTERVAL_QUALIFIED || 5,
        FOLLOW_UP_INTERVAL_APPOINTMENT_SET: configSettings.followUpIntervalAppointmentSet || configSettings.FOLLOW_UP_INTERVAL_APPOINTMENT_SET || 1,
        FOLLOW_UP_INTERVAL_CONVERTED: configSettings.followUpIntervalConverted || configSettings.FOLLOW_UP_INTERVAL_CONVERTED || 14,
        FOLLOW_UP_INTERVAL_INACTIVE: configSettings.followUpIntervalInactive || configSettings.FOLLOW_UP_INTERVAL_INACTIVE || 30,
      };

      // Log the actual resolved settings we're using
      console.log("Original settings:", configSettings);
      console.log("Resolved settings for AI response:", resolvedSettings);

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
      
      // Calculate next Tuesday's date for examples
      const daysUntilTuesday = (2 - getDay(currentDate) + 7) % 7;
      const nextTuesday = addDays(currentDate, daysUntilTuesday || 7);
      const tuesdayFormatted = format(nextTuesday, "MM/dd/yyyy");

      console.log("Using settings for AI response:", {
        AGENT_NAME: configSettings.agentName,
        COMPANY_NAME: configSettings.companyName,
        AGENT_STATE: configSettings.agentState,
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
            content: `You are a professional, experienced, and helpful real estate agent assistant in the state of ${configSettings.agentState} acting as a real estate agent named "${configSettings.agentName}" and are working for a company named "${configSettings.companyName}". 
            You are interacting with potential home buyers or sellers. 
            You have experience in serving the lead's location as your team has helped buy and sell properties in that area. 
            You are texting these leads, so keep formatting simple and concise.

            Today's date is ${formattedCurrentDate} (${currentDayName}).

            All leads have filled out some sort of ad or form on our website. They don't have any context about our company or agent, so we need to build rapport and get to know them.
            Make sure to confirm with them that their timeline, search criteria, budget, and preapproval status is correct. If they have not filled out a form, find out their timeline, search criteria, budget, and preapproval status.

              ## Instructions for Buyers:

              - **Objective**: Help potential home buyers set an appointment to view a property.
              - **Services**:
                - The main goal is to firstly build rapport with the buyer.
                - Then help potential home buyers set an appointment to view a property.
                - Assist them in finding properties in their area that meet their criteria. If their criteria is missing or not specific, ask them for more details.
                - Ask proactive questions and address any questions/objections they have regarding the local real estate market.
                - If there is an update regarding their search criteria, always include the NEW SEARCH CRITERIA format at the end of your message. (More instructions under "Property Search Format Requirements")
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
              
              # Property Search Format Requirements:
              
              When identifying property requirements, ALWAYS follow these rules:
              1. Use the exact format "NEW SEARCH CRITERIA: MIN BEDROOMS: <value>, MAX BEDROOMS: <value>, MAX BATHROOMS: <value>, MIN PRICE: <value>, MAX PRICE: <value>, MIN SQUARE FEET: <value>, MAX SQUARE FEET: <value>, LOCATIONS: <value>, PROPERTY TYPES: <value> at the end of your message
              2. ALWAYS include ALL fields listed below, even for partial updates
              3. For fields not mentioned by the user, include the field with an empty value (e.g., "MIN BEDROOMS: ")
              4. Format all fields as follows:
                - MIN BEDROOMS: <number>
                - MAX BEDROOMS: <number>
                - MIN BATHROOMS: <number>
                - MAX BATHROOMS: <number>
                - MIN PRICE: <dollar_amount>
                - MAX PRICE: <dollar_amount>
                - MIN SQUARE FEET: <number>
                - MAX SQUARE FEET: <number>
                - LOCATIONS: <city_names_comma_separated>
                - PROPERTY TYPES: <types_comma_separated>
              5. Only include the NEW SEARCH CRITERIA format when a client clearly expresses property search criteria
              6. IMPORTANT: Include ALL fields every time, even if some have no value
              7. Always use actual numbers, not placeholders (e.g., "MIN BEDROOMS: 3" not "MIN BEDROOMS: <MIN_BED_COUNT>")
              8. CRITICAL: ALWAYS use the NEW SEARCH CRITERIA format whenever updating ANY property criteria, even for minor updates to existing searches
              9. DO NOT use bullet points or human-readable lists for property criteria - ONLY use the exact NEW SEARCH CRITERIA format
              10. Important: You may describe the property criteria in normal text during your message, but you MUST ALSO include the machine-readable NEW SEARCH CRITERIA format at the end of your message

              # Both Appointment and Property Search Requirements:	

              1. When including BOTH property search and appointment in the same message, put them on the SAME LINE separated by a PIPE CHARACTER (|) not a space or newline

              # Examples
              
              Example 1: Property Search
              - **Input**: "I'm looking for a 3-bedroom house in Austin under $500,000."
              - **Output**: "I'll help you find homes matching your criteria in Austin. Based on your requirements, I'll search for 3-bedroom properties under $500,000. I'll send you matching listings as soon as possible. NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: , MIN BATHROOMS: , MAX BATHROOMS: , MIN PRICE: , MAX PRICE: 500000, MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: Austin, PROPERTY TYPES: House"

              Example 2: Appointment Setting
              - **Input**: "Can we meet to discuss listing my property this weekend?"
              - **Output**: "I'd be happy to meet with you to discuss listing your property. I have availability this Sunday at 2:00 PM. Does that work for you? NEW APPOINTMENT SET: ${sundayFormatted} at 2:00 PM"
              
              Example 3: Combined Search Refinement and Appointment
              - **Input**: "I want to see 4-bedroom houses with at least 2.5 bathrooms. Can we tour some properties next Tuesday?"
              - **Output**: "I'll update your search to focus on 4+ bedroom homes with at least 2.5 bathrooms. I'd be happy to show you matching properties next Tuesday. Does 1:00 PM work for your schedule? NEW SEARCH CRITERIA: MIN BEDROOMS: 4, MAX BEDROOMS: , MIN BATHROOMS: 2.5, MAX BATHROOMS: , MIN PRICE: , MAX PRICE: , MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: , PROPERTY TYPES: House, NOTE: | NEW APPOINTMENT SET: ${tuesdayFormatted} at 1:00 PM"
              
              Example 4: Property Search Update
              - **Input**: "Actually, I'd like to increase my budget to $800,000 and look in both Austin and Round Rock."
              - **Output**: "I've updated your search criteria with the higher budget of $800,000 and expanded the location to include both Austin and Round Rock. I'll send you updated listings shortly. NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: , MIN BATHROOMS: , MAX BATHROOMS: , MIN PRICE: , MAX PRICE: 800000, MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: Austin, Round Rock, PROPERTY TYPES: House"
              
              Example 5: Asking about current search criteria
              - **Input**: "What are my current search criteria again?"
              - **Output**: "Here are your current search criteria: You're looking for properties with at least 3 bedrooms in Austin and Round Rock. Your budget is up to $800,000, and you haven't specified any particular bathroom requirements or square footage preferences.

              I'll continue to send you listings that match these parameters. Let me know if you'd like to adjust any of these criteria. NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: , MIN BATHROOMS: , MAX BATHROOMS: , MIN PRICE: , MAX PRICE: 800000, MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: Austin, Round Rock, PROPERTY TYPES: House"

              Example 6: Simple property update
              - **Input**: "Can you change my max bedrooms to 5?"
              - **Output**: "I've updated your search criteria to include properties with up to 5 bedrooms maximum. Your other preferences remain the same: minimum 3 bedrooms, budget up to $800,000, and locations in Austin and Round Rock.

              I'll send you matching listings that meet these updated requirements soon. NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: 5, MIN BATHROOMS: , MAX BATHROOMS: , MIN PRICE: , MAX PRICE: 800000, MIN SQUARE FEET: , MAX SQUARE FEET: , LOCATIONS: Austin, Round Rock, PROPERTY TYPES: House"

              # Note:
              - Always use exact formatting for both appointment and property search information
              - For appointments, always use the specific MM/DD/YYYY format with actual dates
              - For property searches, include only the criteria mentioned by the client
              - Never use placeholder text like <COUNT> or <dollar_amount> - use real numbers


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

      console.log("responseContent -- raw from openai", responseContent);
      
      // Check for appointment details
      const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
      const appointmentMatch = responseContent.match(appointmentRegex);
      
      // Check for "NEW SEARCH CRITERIA:" in the response
      const searchCriteriaRegex = /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i;
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
        
        // Check for search criteria in the same message
        const searchCriteriaMatch = cleanedResponse.match(searchCriteriaRegex);
        
        let searchCriteria = null;
        let isPropertySearch = false;
        
        if (searchCriteriaMatch) {
          // Extract the raw search criteria text
          const rawSearchCriteria = searchCriteriaMatch[0].trim();

          console.log('new property search - raw search criteria', rawSearchCriteria);
          
          // Clean up the response by removing the search criteria text
          cleanedResponse = cleanedResponse.replace(searchCriteriaRegex, '').trim();
          
          // Set property search data
          isPropertySearch = true;
          searchCriteria = rawSearchCriteria;
        }
        
        // Return both appointment and property search data if both are present
        if (isPropertySearch) {
          return {
            text: cleanedResponse,
            appointmentDetails: {
              date: appointmentDate,
              time: appointmentTime
            },
            isPropertySearch: true,
            searchCriteria: searchCriteria
          };
        } else {
          // Just return the cleaned response with appointment details
          return {
            text: cleanedResponse,
            appointmentDetails: {
              date: appointmentDate,
              time: appointmentTime
            }
          };
        }
      } else if (searchCriteriaMatch) {
        // Handle the standard search criteria format
        console.log(`Detected NEW SEARCH CRITERIA format: ${searchCriteriaMatch[0]}`);
        
        // Extract the raw search criteria text
        const rawSearchCriteria = searchCriteriaMatch[0].trim();
        
        // Clean up the response by removing the search criteria text
        let cleanedResponse = responseContent.replace(searchCriteriaRegex, '').trim();
        
        // Check if an appointment is also in the same message
        const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
        const appointmentMatch = cleanedResponse.match(appointmentRegex);
        
        if (appointmentMatch) {
          let appointmentDate = appointmentMatch[1];
          const appointmentTime = appointmentMatch[2];
          
          // Process appointment date if needed (same date processing code)
          if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(appointmentDate)) {
            // Look for day names in the message to extract a real date
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
                          'tomorrow', 'today', 'next week'];
            const dayRegex = new RegExp(`(${dayNames.join('|')})`, 'i');
            const dayMatch = responseContent.toLowerCase().match(dayRegex);
            
            if (dayMatch) {
              // Convert day name to an actual date (same date conversion code)
              // ...
            } else {
              // Default to a date 3 days from now (same default date code)
              // ...
            }
          }
          
          // Remove the appointment information from the text
          cleanedResponse = cleanedResponse.replace(appointmentRegex, '').trim();
          
          // Return both property search and appointment details
          return {
            text: cleanedResponse,
            isPropertySearch: true,
            searchCriteria: rawSearchCriteria,
            appointmentDetails: {
              date: appointmentDate,
              time: appointmentTime
            }
          };
        }
        
        // If no appointment, just return property search details
        return {
          text: cleanedResponse,
          isPropertySearch: true,
          searchCriteria: rawSearchCriteria
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
  async handlePropertySearchCriteria(searchCriteria, leadId, isNewFormat = false) {
    try {
      const propertyService = require('./propertyService');
      
      // Log the detected search criteria
      logger.info(`Handling property search criteria for lead ${leadId}:`, searchCriteria);
      
      let dbSearchCriteria;
      
      if (isNewFormat) {
        // Parse the new format - NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: 5, etc.
        dbSearchCriteria = this.parseNewPropertySearchFormat(searchCriteria);
      } else {
        // Convert AI-detected search criteria to database format (legacy format)
        dbSearchCriteria = {
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
      }
      
      // Ensure all needed fields are present, even if empty
      dbSearchCriteria = {
        minBedrooms: dbSearchCriteria.minBedrooms || null,
        maxBedrooms: dbSearchCriteria.maxBedrooms || null,
        minBathrooms: dbSearchCriteria.minBathrooms || null,
        maxBathrooms: dbSearchCriteria.maxBathrooms || null,
        minPrice: dbSearchCriteria.minPrice || null,
        maxPrice: dbSearchCriteria.maxPrice || null,
        minSquareFeet: dbSearchCriteria.minSquareFeet || null,
        maxSquareFeet: dbSearchCriteria.maxSquareFeet || null,
        locations: dbSearchCriteria.locations || [],
        propertyTypes: dbSearchCriteria.propertyTypes || ['Single Family Home'],
        originalSearchText: dbSearchCriteria.originalSearchText || searchCriteria
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

  // Parse the property search format
  parseNewPropertySearchFormat(searchText) {
    try {
      // Extract the criteria part (only looking for NEW SEARCH CRITERIA format)
      const match = searchText.match(/NEW SEARCH CRITERIA:(.*?)(?:\n|$)/i);
      if (!match) return null;
      
      const criteriaText = match[1].trim();
      const criteria = {
        originalSearchText: searchText
      };
      
      // Define all the expected fields with their regex patterns
      const fieldPatterns = {
        minBedrooms: { pattern: /MIN BEDROOMS:\s*(\d+)?/i, type: 'int' },
        maxBedrooms: { pattern: /MAX BEDROOMS:\s*(\d+)?/i, type: 'int' },
        minBathrooms: { pattern: /MIN BATHROOMS:\s*(\d+(?:\.\d+)?)?/i, type: 'float' },
        maxBathrooms: { pattern: /MAX BATHROOMS:\s*(\d+(?:\.\d+)?)?/i, type: 'float' },
        minPrice: { pattern: /MIN PRICE:\s*\$?(\d+(?:,\d+)*)?/i, type: 'currency' },
        maxPrice: { pattern: /MAX PRICE:\s*\$?(\d+(?:,\d+)*)?/i, type: 'currency' },
        minSquareFeet: { pattern: /MIN SQUARE FEET:\s*(\d+(?:,\d+)*)?/i, type: 'int' },
        maxSquareFeet: { pattern: /MAX SQUARE FEET:\s*(\d+(?:,\d+)*)?/i, type: 'int' },
        locations: { pattern: /LOCATIONS:\s*([^,]+(?:,\s*[^,]+)*)?/i, type: 'list' },
        propertyTypes: { pattern: /PROPERTY TYPES:\s*([^,]+(?:,\s*[^,]+)*)?/i, type: 'list' }
      };
      
      // Process each field according to its pattern and type
      Object.entries(fieldPatterns).forEach(([field, config]) => {
        const fieldMatch = criteriaText.match(config.pattern);
        
        if (fieldMatch && fieldMatch[1] && fieldMatch[1].trim()) {
          const value = fieldMatch[1].trim();
          
          // Convert the value based on its type
          switch (config.type) {
            case 'int':
              criteria[field] = parseInt(value.replace(/,/g, ''), 10);
              break;
            case 'float':
              criteria[field] = parseFloat(value);
              break;
            case 'currency':
              criteria[field] = parseInt(value.replace(/,/g, ''), 10);
              break;
            case 'list':
              criteria[field] = value
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0);
              break;
            case 'string':
            default:
              criteria[field] = value;
          }
        } else {
          // Set null for missing or empty values to ensure all fields are present
          // If it's a list type, use an empty array instead of null
          criteria[field] = config.type === 'list' ? [] : null;
        }
      });
      
      console.log('Parsed property search criteria:', criteria);
      return criteria;
    } catch (error) {
      logger.error('Error parsing property search format:', error);
      return {
        originalSearchText: searchText
      };
    }
  },

  // Parse property search criteria from text (legacy format)
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

  // Process and possibly transform the raw AI response
  handleResponse(responseContent) {
    try {
      // Check for appointment details
      const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
      const appointmentMatch = responseContent.match(appointmentRegex);
      
      // Check for "NEW SEARCH CRITERIA:" in the response
      const searchCriteriaRegex = /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i;
      const searchCriteriaMatch = responseContent.match(searchCriteriaRegex);
      
      // We don't need to check for legacy formats anymore
      
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
        
        // Check for search criteria in the same message
        const searchCriteriaMatch = cleanedResponse.match(searchCriteriaRegex);
        
        let searchCriteria = null;
        let isPropertySearch = false;
        
        if (searchCriteriaMatch) {
          // Extract the raw search criteria text
          const rawSearchCriteria = searchCriteriaMatch[0].trim();
          
          // Clean up the response by removing the search criteria text
          cleanedResponse = cleanedResponse.replace(searchCriteriaRegex, '').trim();
          
          // Set property search data
          isPropertySearch = true;
          searchCriteria = rawSearchCriteria;
        }
        
        // Return both appointment and property search data if both are present
        if (isPropertySearch) {
          return {
            text: cleanedResponse,
            appointmentDetails: {
              date: appointmentDate,
              time: appointmentTime
            },
            isPropertySearch: true,
            searchCriteria: searchCriteria
          };
        } else {
          // Just return the cleaned response with appointment details
          return {
            text: cleanedResponse,
            appointmentDetails: {
              date: appointmentDate,
              time: appointmentTime
            }
          };
        }
      } else if (searchCriteriaMatch) {
        // Handle the standard search criteria format
        console.log(`Detected NEW SEARCH CRITERIA format: ${searchCriteriaMatch[0]}`);
        
        // Extract the raw search criteria text
        const rawSearchCriteria = searchCriteriaMatch[0].trim();
        
        // Clean up the response by removing the search criteria text
        let cleanedResponse = responseContent.replace(searchCriteriaRegex, '').trim();
        
        // Check if an appointment is also in the same message
        const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
        const appointmentMatch = cleanedResponse.match(appointmentRegex);
        
        if (appointmentMatch) {
          let appointmentDate = appointmentMatch[1];
          const appointmentTime = appointmentMatch[2];
          
          // Process appointment date if needed (same date processing code)
          if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(appointmentDate)) {
            // Look for day names in the message to extract a real date
            const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
                          'tomorrow', 'today', 'next week'];
            const dayRegex = new RegExp(`(${dayNames.join('|')})`, 'i');
            const dayMatch = responseContent.toLowerCase().match(dayRegex);
            
            if (dayMatch) {
              // Convert day name to an actual date (same date conversion code)
              // ...
            } else {
              // Default to a date 3 days from now (same default date code)
              // ...
            }
          }
          
          // Remove the appointment information from the text
          cleanedResponse = cleanedResponse.replace(appointmentRegex, '').trim();
          
          // Return both property search and appointment details
          return {
            text: cleanedResponse,
            isPropertySearch: true,
            searchCriteria: rawSearchCriteria,
            appointmentDetails: {
              date: appointmentDate,
              time: appointmentTime
            }
          };
        }
        
        // If no appointment, just return property search details
        return {
          text: cleanedResponse,
          isPropertySearch: true,
          searchCriteria: rawSearchCriteria
        };
      }
      
      // If no appointment or search criteria detected, return the original response
      return responseContent;
    } catch (error) {
      logger.error("Error processing AI response:", error);
      throw error;
    }
  },
};

module.exports = openaiService;
