import OpenAI from "openai";
import logger from "../utils/logger.js";
import agentSettings from "../config/agentSettings.js";
import { format, addDays, getDay } from "date-fns";

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
        leadType = "buyer",
        isFollowUp = false,
        context = "", // Add context for property details
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
        LEAD_TYPE: leadType,
        IS_FOLLOW_UP: isFollowUp
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

      // Define prompts directly in the file
      const BUYER_LEAD_PROMPT = `You are a professional, experienced, and helpful real estate agent assistant in the state of ${configSettings.agentState} acting as a real estate agent named "${configSettings.agentName}" and working for "${configSettings.companyName}". You are interacting with potential home buyers who have filled out an ad or form on our website. Since they don't have any context about our company or you, your goal is to build rapport and get to know them.

Confirm their timeline, search criteria, budget, and preapproval status. If they haven't filled out a form, ask for these details.

${context ? `
# Lead Context Information
This lead has the following context information that you should use to personalize responses:
${context}
` : ''}

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

Today's date is ${formattedCurrentDate} (${currentDayName}), and the earliest appointment can be scheduled for tomorrow (${tomorrowFormatted}).
Keep your responses concise, text-friendly, and focused on guiding the buyer toward the next steps in their home search.`;

      const SELLER_LEAD_PROMPT = `You are a professional, experienced, and helpful real estate agent assistant in the state of ${configSettings.agentState} acting as a real estate agent named "${configSettings.agentName}" and working for "${configSettings.companyName}". You are interacting with potential home sellers who have filled out an ad or form on our website. Since they don't have any context about our company or you, your goal is to build rapport and understand their needs for selling their property.

${context ? `
# Lead Context Information
This lead has the following context information that you should use to personalize responses:
${context}
` : ''}

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

Today's date is ${formattedCurrentDate} (${currentDayName}), and the earliest appointment can be scheduled for tomorrow (${tomorrowFormatted}).
Keep your responses concise, text-friendly, and focused on building rapport while guiding them to the next steps in listing their property.`;

      // Select the appropriate prompt based on lead type and follow-up context
      let systemPrompt = "";
      
       if (leadType === "seller") {
        // Use the seller lead prompt
        systemPrompt = SELLER_LEAD_PROMPT;
      } else {
        // Use the buyer lead prompt 
        systemPrompt = BUYER_LEAD_PROMPT; // default to buyer lead prompt
      } 

      // Process template variables in the prompt
      systemPrompt = systemPrompt
        .replace(/\${configSettings.agentName}/g, configSettings.agentName)
        .replace(/\${configSettings.companyName}/g, configSettings.companyName)
        .replace(/\${configSettings.agentState}/g, configSettings.agentState)
        .replace(/\${configSettings.agentCity}/g, configSettings.agentCity)
        .replace(/\${formattedCurrentDate}/g, formattedCurrentDate)
        .replace(/\${currentDayName}/g, currentDayName)
        .replace(/\${tomorrowFormatted}/g, tomorrowFormatted)
        .replace(/\${saturdayFormatted}/g, saturdayFormatted)
        .replace(/\${sundayFormatted}/g, sundayFormatted)
        .replace(/\${tuesdayFormatted}/g, tuesdayFormatted);

      // If qualifying lead detected, add instructions to ask qualification questions
      let qualificationInstructions = "";
      if (qualifyingLeadDetected) {
        qualificationInstructions = `
        IMPORTANT: This lead has shown interest in ${leadType === "buyer" ? "buying" : "selling"} real estate. Ask 1-2 friendly 
        questions to gather more information about their needs in ONE of these areas:
        - Timeline (When they want to ${leadType === "buyer" ? "buy" : "sell"})
        ${leadType === "buyer" ? "- Budget (What price range they're considering)" : "- Property details (What type of property they're selling)"}
        - Location (${leadType === "buyer" ? "What areas they're interested in" : "Where their property is located"})
        
        Keep it conversational, not like a formal survey. Don't ask about all three at once.
        `;
      }

      // Append any qualification instructions to the system prompt
      if (qualificationInstructions) {
        systemPrompt += "\n\n" + qualificationInstructions;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
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
        prompt = `Generate an initial follow-up message to a potential real estate ${lead.leadType || 'buyer'} lead named ${lead.name}. 
        The message should be friendly, professional, and encourage a response. 
        Keep it brief (under 160 characters if possible) and conversational.`;
      } else {
        // For subsequent follow-ups
        prompt = `Generate follow-up message #${
          lead.messageCount + 1
        } for a real estate ${lead.leadType || 'buyer'} lead named ${lead.name} 
        who hasn't responded to previous messages. Keep it casual but professional, 
        and don't be pushy. The message should be brief (under 160 characters if possible).`;
      }

      // Set up lead context for the follow-up
      const leadDetails = {
        leadName: lead.name,
        leadStatus: lead.status,
        leadType: lead.leadType || 'buyer',
        isFollowUp: true  // This is a follow-up message
      };

      // Generate the response using the existing generateResponse function
      const followUpMessage = await this.generateResponse(
        prompt,
        settingsMap,
        [], // No previous messages needed for follow-up
        leadDetails
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
      
      // Save the search
      const [search, created] = await LeadPropertySearch.findOrCreate({
        where: { leadId, isActive: true },
        defaults: {
          ...dbSearchCriteria,
          isActive: true
        }
      });
      
      if (!created) {
        // Update existing search
        logger.info(`Updating existing property search for lead ${leadId}`);
        await search.update(dbSearchCriteria);
      } else {
        logger.info(`Created new property search for lead ${leadId}`);
      }
      
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

export default openaiService;
