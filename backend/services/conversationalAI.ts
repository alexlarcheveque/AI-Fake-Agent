import OpenAI from "openai";
import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";
import { generateSpeech } from "./elevenlabsService.ts";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ConversationContext {
  callId: string;
  leadId: number;
  leadName: string;
  leadType: "buyer" | "seller";
  agentName: string;
  companyName: string;
  conversationHistory: ConversationMessage[];
  leadPreferences?: any;
  propertyDetails?: any;
}

export interface ConversationMessage {
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  confidence?: number; // STT confidence score
}

export interface AIResponse {
  text: string;
  intent: string;
  shouldContinue: boolean;
  nextAction?:
    | "gather_info"
    | "schedule_appointment"
    | "transfer_to_agent"
    | "end_call";
  audioBuffer?: Buffer;
}

/**
 * Generate real estate conversation system prompt
 */
const generateSystemPrompt = (context: ConversationContext): string => {
  const { leadName, leadType, agentName, companyName } = context;

  return `You are ${agentName}, a professional real estate agent from ${companyName}. You are having a phone conversation with ${leadName}, who is a potential ${leadType}.

CONVERSATION GUIDELINES:
- Be conversational, warm, and professional
- Keep responses under 30 words for natural phone flow
- Ask ONE question at a time
- Listen actively and respond to what they say
- Build rapport before diving into business
- Use natural speech patterns (contractions, casual phrases)

YOUR GOALS:
${
  leadType === "buyer"
    ? `
- Understand their buying timeline and budget
- Learn about their preferred neighborhoods and property types
- Identify their motivation for buying
- Qualify them as a serious buyer
- Offer to schedule a showing or consultation
`
    : `
- Understand their selling timeline and motivation
- Learn about their property details and condition
- Discuss current market conditions
- Estimate property value if appropriate
- Offer to schedule a listing consultation
`
}

CONVERSATION FLOW:
1. Warm greeting and rapport building
2. Ask about their current situation
3. Understand their needs and timeline
4. Provide value and insights
5. Suggest next steps (appointment, consultation, etc.)

IMPORTANT:
- If they seem uninterested, politely offer to follow up later
- If they have specific questions, answer knowledgeably
- If they want to end the call, respect that gracefully
- Always end with a clear next step or follow-up plan

Remember: This is a real phone conversation. Be natural, conversational, and helpful.`;
};

/**
 * Process speech input and generate AI response
 */
export const processConversation = async (
  speechText: string,
  context: ConversationContext,
  confidence: number = 1.0
): Promise<AIResponse> => {
  try {
    logger.info(
      `Processing conversation for call ${context.callId}: "${speechText}"`
    );

    // Add user message to conversation history
    const userMessage: ConversationMessage = {
      role: "user",
      content: speechText,
      timestamp: new Date(),
      confidence,
    };

    context.conversationHistory.push(userMessage);

    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system" as const,
        content: generateSystemPrompt(context),
      },
      ...context.conversationHistory.map((msg) => ({
        role: msg.role as "assistant" | "user",
        content: msg.content,
      })),
    ];

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      max_tokens: 150,
      temperature: 0.7,
      functions: [
        {
          name: "determine_next_action",
          description:
            "Determine the next action based on conversation context",
          parameters: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: [
                  "greeting",
                  "qualifying",
                  "objection_handling",
                  "value_proposition",
                  "closing",
                  "scheduling",
                ],
                description: "The current conversation intent",
              },
              shouldContinue: {
                type: "boolean",
                description: "Whether the conversation should continue",
              },
              nextAction: {
                type: "string",
                enum: [
                  "gather_info",
                  "schedule_appointment",
                  "transfer_to_agent",
                  "end_call",
                ],
                description: "The recommended next action",
              },
            },
            required: ["intent", "shouldContinue"],
          },
        },
      ],
      function_call: "auto",
    });

    const aiMessage = completion.choices[0].message;
    let responseText = aiMessage.content || "";
    let intent = "conversation";
    let shouldContinue = true;
    let nextAction: AIResponse["nextAction"] = undefined;

    // Parse function call if present
    if (aiMessage.function_call) {
      try {
        const functionArgs = JSON.parse(aiMessage.function_call.arguments);
        intent = functionArgs.intent || "conversation";
        shouldContinue = functionArgs.shouldContinue !== false;
        nextAction = functionArgs.nextAction;
      } catch (e) {
        logger.warn("Failed to parse function call arguments:", e);
      }
    }

    // Add AI response to conversation history
    const assistantMessage: ConversationMessage = {
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    };

    context.conversationHistory.push(assistantMessage);

    // Save conversation to database
    await saveConversationMessage(context.callId, userMessage);
    await saveConversationMessage(context.callId, assistantMessage);

    // Generate audio if continuing conversation
    let audioBuffer: Buffer | undefined;
    if (shouldContinue && responseText) {
      try {
        // Get user's voice preference
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("elevenlabs_voice_id")
          .eq("uuid", await getLeadUserUuid(context.leadId))
          .single();

        audioBuffer = await generateSpeech(responseText, {
          voiceId: userSettings?.elevenlabs_voice_id,
        });
      } catch (audioError) {
        logger.error("Failed to generate audio for AI response:", audioError);
      }
    }

    logger.info(
      `AI Response for call ${context.callId}: "${responseText}" (intent: ${intent})`
    );

    return {
      text: responseText,
      intent,
      shouldContinue,
      nextAction,
      audioBuffer,
    };
  } catch (error) {
    logger.error("Error processing conversation:", error);

    // Fallback response
    return {
      text: "I apologize, I didn't catch that. Could you please repeat what you said?",
      intent: "error_recovery",
      shouldContinue: true,
    };
  }
};

/**
 * Initialize conversation context for a new call
 */
export const initializeConversation = async (
  callId: string,
  leadId: number
): Promise<ConversationContext> => {
  try {
    // Get lead details
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    // Get user settings
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("uuid", lead.user_uuid)
      .single();

    const context: ConversationContext = {
      callId,
      leadId,
      leadName: lead.name,
      leadType: lead.type || "buyer",
      agentName: userSettings.agent_name,
      companyName: userSettings.company_name,
      conversationHistory: [],
      leadPreferences: lead.preferences,
      propertyDetails: lead.property_details,
    };

    logger.info(`Initialized conversation context for call ${callId}`);
    return context;
  } catch (error) {
    logger.error("Error initializing conversation:", error);
    throw error;
  }
};

/**
 * Save conversation message to database
 */
const saveConversationMessage = async (
  callId: string,
  message: ConversationMessage
): Promise<void> => {
  try {
    await supabase.from("conversation_messages").insert({
      call_id: parseInt(callId),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      confidence: message.confidence,
    });
  } catch (error) {
    logger.error("Error saving conversation message:", error);
  }
};

/**
 * Get lead's user UUID
 */
const getLeadUserUuid = async (leadId: number): Promise<string> => {
  const { data: lead } = await supabase
    .from("leads")
    .select("user_uuid")
    .eq("id", leadId)
    .single();

  return lead?.user_uuid;
};

export default {
  processConversation,
  initializeConversation,
};
