import OpenAI from "openai";
import logger from "../utils/logger.ts";
import { format, addDays, addHours } from "date-fns";
import { generateBuyerPrompt } from "./prompts/buyerPrompt.ts";
import { generateSellerPrompt } from "./prompts/sellerPrompt.ts";
import { getMessagesByLeadIdDescending } from "./messageService.ts";
import { getUserSettings } from "./userSettingsService.ts";
import { getLeadById } from "./leadService.ts";
import supabase from "../config/supabase.ts";
import { createAppointment } from "./appointmentService.ts";
import { createNotification } from "./notificationService.ts";
import { LeadRow } from "../models/Lead.ts";
import { upsertSearchCriteria } from "./searchCriteriaService.ts";

const apiKey = process.env.OPENAI_API_KEY || "your_api_key_here";

const openai = new OpenAI({ apiKey });

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const generateResponse = async (
  leadId: number,
  messageId?: number
): Promise<string> => {
  try {
    // get current date and tomorrow's date
    const currentDate = new Date();
    const formattedCurrentDate = format(currentDate, "MMMM d, yyyy");
    const currentDayName = format(currentDate, "EEEE");

    const leadContext = await getLeadById(leadId);
    if (!leadContext.id) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    // Check if this is a call fallback message
    let isCallFallback = false;
    let callFallbackType = null;

    if (messageId) {
      const { data: message } = await supabase
        .from("messages")
        .select("call_fallback_type")
        .eq("id", messageId)
        .single();

      if (message?.call_fallback_type) {
        isCallFallback = true;
        callFallbackType = message.call_fallback_type;
      }
    }

    // Convert previous messages to OpenAI format
    const messageHistory: OpenAIMessage[] = (
      await getMessagesByLeadIdDescending(leadId)
    )
      .filter((msg) => msg.text)
      .filter(
        (msg) =>
          msg.delivery_status !== "failed" &&
          msg.delivery_status !== "scheduled"
      )
      .map((msg) => ({
        role: msg.sender === "lead" ? "user" : "assistant",
        content: msg.text || "",
      }));

    const agentContext = await getUserSettings(leadContext.user_uuid);

    // Determine which prompt to use based on lead type
    let systemPrompt = "";
    const leadType = leadContext.lead_type?.toLowerCase();

    if (leadType === "buyer") {
      systemPrompt = generateBuyerPrompt(leadContext);
    } else if (leadType === "seller") {
      systemPrompt = generateSellerPrompt(leadContext);
    } else {
      // Default to seller prompt if lead type is unclear
      systemPrompt = generateSellerPrompt(leadContext);
    }

    // Add call fallback context if this is a fallback message
    if (isCallFallback) {
      const callFallbackContext = getCallFallbackContext(callFallbackType);
      systemPrompt += `\n\n${callFallbackContext}`;
    }

    logger.info("Generating AI response for lead");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messageHistory,
      ],
      max_tokens: 1000,
      temperature: 1,
      frequency_penalty: 1,
      presence_penalty: 0.85,
    });

    const responseContent = completion.choices[0].message.content || "";

    console.log("responseContent", responseContent);

    // Extract and process metadata without modifying the original response
    await checkForNewSearchCriteria(leadId, responseContent, leadContext);
    await checkForAppointmentDetails(leadId, responseContent, leadContext);

    // Sanitize the response for sending to the user (remove metadata)
    const sanitizedResponse = await sanitizeResponse(responseContent);

    console.log("sanitizedResponse", sanitizedResponse);

    return sanitizedResponse;
  } catch (error) {
    logger.error("Error generating OpenAI response:", error);
    throw error;
  }
};

const checkForNewSearchCriteria = async (
  leadId: number,
  responseContent: string,
  leadContext?: LeadRow
) => {
  // Extract search criteria without modifying the original response
  const searchCriteriaRegex = /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i;
  const searchCriteriaMatch = responseContent.match(searchCriteriaRegex);

  if (!searchCriteriaMatch) {
    return;
  }

  try {
    // Parse the structured format
    const criteriaText = searchCriteriaMatch[0]
      .replace(/NEW SEARCH CRITERIA:/i, "")
      .trim();

    // Create criteria object with leadId
    const criteria: any = {
      lead_id: leadId,
    };

    // Parse each key-value pair
    const keyValuePairs = criteriaText.split(",").map((pair) => pair.trim());

    for (const pair of keyValuePairs) {
      const [key, value] = pair.split(":").map((part) => part.trim());

      if (!key || value === undefined) continue;

      const keyLower = key.toLowerCase();

      // Process based on key type
      if (keyLower === "min bedrooms" && value) {
        criteria.min_bedrooms = parseInt(value, 10);
      } else if (keyLower === "max bedrooms" && value) {
        criteria.max_bedroom = parseInt(value, 10);
      } else if (keyLower === "min bathrooms" && value) {
        criteria.min_bathrooms = parseFloat(value);
      } else if (keyLower === "max bathrooms" && value) {
        criteria.max_bathrooms = parseFloat(value);
      } else if (keyLower === "min price" && value) {
        criteria.min_price = parseInt(value.replace(/[$,]/g, ""), 10);
      } else if (keyLower === "max price" && value) {
        criteria.max_price = parseInt(value.replace(/[$,]/g, ""), 10);
      } else if (keyLower === "min square feet" && value) {
        criteria.min_square_feet = parseInt(value.replace(/,/g, ""), 10);
      } else if (keyLower === "max square feet" && value) {
        criteria.max_square_feet = parseInt(value.replace(/,/g, ""), 10);
      } else if (keyLower === "locations" && value) {
        criteria.locations = value
          .split(",")
          .map((loc) => loc.trim())
          .filter(Boolean);
      } else if (keyLower === "property types" && value) {
        criteria.property_types = value
          .split(",")
          .map((type) => type.trim())
          .filter(Boolean);
      }
    }

    console.log("Parsed search criteria:", criteria);

    // Upsert the search criteria
    const result = await upsertSearchCriteria(criteria);
    console.log("Search criteria upserted successfully:", result);

    // Create notification when search criteria is successfully upserted
    if (result?.id && leadContext?.user_uuid) {
      console.log("Creating search criteria notification");

      try {
        await createNotification({
          lead_id: leadId,
          user_uuid: leadContext.user_uuid,
          type: "search_criteria",
          title: "Search Criteria Updated",
          message:
            "Client search criteria has been updated. Click to view the details.",
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        logger.error("Error creating search criteria notification:", error);
      }
    }

    return result;
  } catch (error) {
    console.error("Error parsing and upserting search criteria:", error);
  }
};

const checkForAppointmentDetails = async (
  leadId: number,
  responseContent: string,
  leadContext: LeadRow
) => {
  // Extract appointment details without modifying the original response
  const appointmentRegex =
    /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
  const appointmentMatch = responseContent.match(appointmentRegex);

  if (!appointmentMatch) {
    return;
  }

  // Extract date and time properly from regex groups
  const dateString = appointmentMatch[1];
  const timeString = appointmentMatch[2];

  const [month, day, year] = dateString.split("/");

  // Parse hour and minute properly
  let [hourMinute, ampm] = timeString.trim().split(/\s+/);
  let [hour, minute] = hourMinute.split(":");

  // Convert to 24-hour format if PM
  let hourNum = parseInt(hour, 10);
  if (ampm && ampm.toUpperCase() === "PM" && hourNum < 12) {
    hourNum += 12;
  } else if (ampm && ampm.toUpperCase() === "AM" && hourNum === 12) {
    hourNum = 0;
  }

  const appointmentDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hourNum,
    parseInt(minute, 10)
  );

  console.log("appointmentDate", appointmentDate);

  let appointment;

  try {
    appointment = await createAppointment({
      lead_id: leadId,
      title: "Autogenerated Appointment",
      description:
        "Appointment autogenerated by Messages - read the messages if this is a call or a property showing",
      status: "scheduled",
      start_time_at: appointmentDate.toISOString(),
      end_time_at: addHours(appointmentDate, 1).toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error creating appointment:", error);
  }

  console.log("appointment successful", appointment);

  if (appointment?.id) {
    console.log("creating notification");

    try {
      await createNotification({
        lead_id: leadId,
        user_uuid: leadContext.user_uuid,
        type: "appointment",
        title: "Client Appointment Detected",
        message:
          "Client has scheduled a call or property showing. Click notification to go to the message thread.",
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error creating notification:", error);
    }
  }
};

// This function is solely responsible for sanitizing the response by removing metadata
const sanitizeResponse = async (responseContent: string) => {
  // Remove appointment details completely without any replacement
  const firstSanitizedResponse = responseContent.replace(
    /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi,
    ""
  );

  const finalSanitizedResponse = firstSanitizedResponse.replace(
    /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i,
    ""
  );

  // Cleanup the final response
  return finalSanitizedResponse
    .trim()
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
};

/**
 * Get additional context for call fallback messages
 */
function getCallFallbackContext(fallbackType: string): string {
  switch (fallbackType) {
    case "voicemail_followup":
      return `
IMPORTANT: This is a follow-up text message after leaving a voicemail. 
- Reference that you just left a voicemail
- Keep it brief and friendly
- Provide your contact info for easy response
- Example: "Hey [Name], just left you a quick voicemail about your [home search/home value/etc.]. Feel free to text me back when you have a moment!"
      `;

    case "missed_call":
      return `
IMPORTANT: This is a follow-up text message after two missed calls (no voicemail left).
- Reference that you tried calling
- Keep it brief and friendly  
- Provide your contact info for easy response
- Example: "Hey [Name], tried calling you a couple times about your [home search/home value/etc.]. No worries if you're busy - feel free to text me back when convenient!"
      `;

    default:
      return "";
  }
}
