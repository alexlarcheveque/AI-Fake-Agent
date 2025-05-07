import OpenAI from "openai";
import logger from "../utils/logger.ts";
import { format, addDays } from "date-fns";
import generateBuyerLeadPrompt from "./prompts/buyerPrompt.ts";
import { getMessagesByLeadId, updateMessage } from "./messageService.ts";
import { getLeadById } from "./leadService.ts";

const apiKey = process.env.OPENAI_API_KEY || "your_api_key_here";

const openai = new OpenAI({ apiKey });

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const generateResponse = async (leadId: number): Promise<string> => {
  try {
    // get current date and tomorrow's date
    const currentDate = new Date();
    const formattedCurrentDate = format(currentDate, "MMMM d, yyyy");
    const currentDayName = format(currentDate, "EEEE");
    const tomorrow = addDays(currentDate, 1);
    const tomorrowFormatted = format(tomorrow, "MM/dd/yyyy");

    // Convert previous messages to OpenAI format
    const messageHistory: OpenAIMessage[] = (
      await getMessagesByLeadId(leadId)
    ).map((msg) => ({
      role: msg.sender === "lead" ? "user" : "assistant",
      content: msg.text || "",
    }));

    const leadContext = await getLeadById(leadId);

    const systemPrompt = generateBuyerLeadPrompt(
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
      ],
      max_tokens: 1000,
      temperature: 1,
      frequency_penalty: 0.81,
      presence_penalty: 0.85,
    });

    const responseContent = completion.choices[0].message.content || "";

    await checkForNewSearchCriteria(responseContent);
    await checkForAppointmentDetails(responseContent);
    const sanitizedResponse = await sanitizeResponse(responseContent);

    return sanitizedResponse;
  } catch (error) {
    logger.error("Error generating OpenAI response:", error);
    throw error;
  }
};

const checkForNewSearchCriteria = async (responseContent: string) => {
  const searchCriteriaRegex = /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i;
  const searchCriteriaMatch = responseContent.match(searchCriteriaRegex);

  console.log("searchCriteriaMatch", searchCriteriaMatch);
};

const checkForAppointmentDetails = async (responseContent: string) => {
  const appointmentRegex =
    /NEW APPOINTMENT SET:\s*(\d{1,2}\/\d{1,2}\/\d{4}|\w+\/\w+\/\w+)\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
  const appointmentMatch = responseContent.match(appointmentRegex);

  console.log("appointmentMatch", appointmentMatch);
};

const sanitizeResponse = async (responseContent: string) => {
  const sanitizedResponse = responseContent.replace(
    /NEW SEARCH CRITERIA:.*?(?:\n|$|\|)/i,
    ""
  );
  return sanitizedResponse;
};
