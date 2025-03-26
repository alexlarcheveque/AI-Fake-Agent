const OpenAI = require("openai");
const logger = require("../utils/logger");
const agentSettings = require("../config/agentSettings");

const apiKey = process.env.OPENAI_API_KEY || "your_api_key_here";

const openai = new OpenAI({ apiKey });

const openaiService = {
  async generateResponse(text, settings = null, previousMessages = []) {
    try {
      // Get settings from agentSettings if not provided
      const configSettings = settings || agentSettings.getAll();

      console.log("Using settings for AI response:", {
        AGENT_NAME: configSettings.AGENT_NAME,
        COMPANY_NAME: configSettings.COMPANY_NAME,
        AGENT_STATE: configSettings.AGENT_STATE,
      });

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
              5. IF a client asks for a specific date (e.g., "Saturday"), convert it to the correct MM/DD/YYYY format
              
              # Examples

              Example 1:
              - **Input**: Potential buyer interested in a 3-bedroom house within the zip code 12345. Email provided.
              - **Output**: "Thank you for your interest! I'll find properties matching your criteria. NEW SEARCH CRITERIA: BED:3 BATH:2 PRICE:300000-500000 SQFT:1500-2500"

              Example 2:
              - **Input**: Potential seller interested in setting up an appointment to list their home on June 1st.
              - **Output**: "I can help set up a meeting to discuss listing your property. I'm available on June 1st at 2 PM. NEW APPOINTMENT SET: 06/01/2025 at 2:00 PM"

              Example 3:
              - **Input**: Lead wants to schedule a house viewing on Saturday.
              - **Output**: "I'd be happy to show you properties this Saturday, March 29th, at 3:00 PM. NEW APPOINTMENT SET: 03/29/2025 at 3:00 PM"
              
              Example 4:
              - **Input**: Client asks to meet this weekend.
              - **Output**: "I'm available to meet this Sunday, April 13th. Does 10:30 AM work for you? NEW APPOINTMENT SET: 04/13/2025 at 10:30 AM"

              # Notes

              - Ensure responses meet the buyer's or seller's immediate needs and encourage the desired next steps.
              - NEVER use placeholder text for dates. Always convert day names (like "Saturday") to a specific date (like "03/29/2025").
              - For appointments, always use the exact format "NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM" with real dates and times.`,
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

      const responseContent = completion.choices[0].message.content;
      
      // Check for "NEW APPOINTMENT SET:" in the response
      const appointmentRegex = /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
      const appointmentMatch = responseContent.match(appointmentRegex);
      
      if (appointmentMatch) {
        let appointmentDate = appointmentMatch[1];
        const appointmentTime = appointmentMatch[2];
        
        // Check if the date is a placeholder (like MM/DD/YYYY)
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(appointmentDate)) {
          // Look for day names in the message to extract a real date
          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
                            'tomorrow', 'today', 'next week'];
          const dayRegex = new RegExp(`(${dayNames.join('|')})`, 'i');
          const dayMatch = responseContent.match(dayRegex);
          
          if (dayMatch) {
            // Convert day name to an actual date
            const dayName = dayMatch[1].toLowerCase();
            const today = new Date();
            let targetDate = new Date(today);
            
            if (dayName === 'tomorrow') {
              targetDate.setDate(today.getDate() + 1);
            } else if (dayName === 'today') {
              // Keep today's date
            } else if (dayName === 'next week') {
              targetDate.setDate(today.getDate() + 7);
            } else {
              // Handle specific day names
              const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const targetDay = daysOfWeek.indexOf(dayName);
              if (targetDay !== -1) {
                const currentDay = today.getDay();
                const daysToAdd = (targetDay + 7 - currentDay) % 7;
                // If today is the target day, schedule for next week
                targetDate.setDate(today.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
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
        
        // Remove the original "NEW APPOINTMENT SET:" part from the response - don't add any confirmation text
        let cleanedResponse = responseContent.replace(appointmentRegex, '').trim();
        
        // Just return the cleaned response with appointment details - no added text
        return {
          text: cleanedResponse,
          appointmentDetails: {
            date: appointmentDate,
            time: appointmentTime
          }
        };
      }
      
      // If no appointment detected, return the original response
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
};

module.exports = openaiService;
