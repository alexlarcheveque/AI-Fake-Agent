import logger from "../utils/logger.ts";
import conversationalAI, { ConversationContext } from "./conversationalAI.ts";
import { generateSpeech } from "./elevenlabsService.ts";
import fs from "fs";
import path from "path";

// Store active conversations in memory (in production, use Redis)
const activeConversations = new Map<string, ConversationContext>();

/**
 * Handle conversational voice webhook with speech recognition
 */
export const handleConversationalWebhook = async (
  callId: string,
  leadId: number,
  voiceId?: string
): Promise<string> => {
  try {
    logger.info(
      `Starting conversational call for callId: ${callId}, leadId: ${leadId}`
    );

    // Initialize conversation context
    const context = await conversationalAI.initializeConversation(
      callId,
      leadId
    );
    activeConversations.set(callId, context);

    // Generate opening message
    const openingMessage = `Hi ${context.leadName}, this is ${context.agentName} from ${context.companyName}. How are you doing today?`;

    // Generate audio for opening
    let audioUrl = "";
    try {
      const audioBuffer = await generateSpeech(openingMessage, { voiceId });
      audioUrl = await saveTemporaryAudio(callId, "opening", audioBuffer);
    } catch (audioError) {
      logger.warn(
        "Failed to generate opening audio, using TTS fallback:",
        audioError
      );
    }

    // Create TwiML for conversational flow
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : "https://wanted-husky-scarcely.ngrok-free.app";

    const twiml = audioUrl
      ? `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Play>${audioUrl}</Play>
          <Gather
            input="speech"
            action="${baseUrl}/api/calls/conversation-response?callId=${callId}"
            method="POST"
            timeout="10"
            speechTimeout="auto"
            language="en-US"
          >
            <Say voice="Polly.Joanna-Neural">I'm listening...</Say>
          </Gather>
          <Redirect>${baseUrl}/api/calls/conversation-timeout?callId=${callId}</Redirect>
        </Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna-Neural">${openingMessage}</Say>
          <Gather
            input="speech"
            action="${baseUrl}/api/calls/conversation-response?callId=${callId}"
            method="POST"
            timeout="10"
            speechTimeout="auto"
            language="en-US"
          >
            <Say voice="Polly.Joanna-Neural">I'm listening...</Say>
          </Gather>
          <Redirect>${baseUrl}/api/calls/conversation-timeout?callId=${callId}</Redirect>
        </Response>`;

    logger.info(`Generated conversational TwiML for call ${callId}`);
    return twiml;
  } catch (error) {
    logger.error("Error in conversational webhook:", error);

    // Fallback TwiML
    return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural">Hello, I'm having some technical difficulties. I'll follow up with you via text message. Thank you!</Say>
      <Hangup/>
    </Response>`;
  }
};

/**
 * Handle speech response from lead
 */
export const handleConversationResponse = async (
  callId: string,
  speechResult: string,
  confidence: number = 1.0
): Promise<string> => {
  try {
    logger.info(
      `Processing speech for call ${callId}: "${speechResult}" (confidence: ${confidence})`
    );

    // Get conversation context
    const context = activeConversations.get(callId);
    if (!context) {
      logger.error(`No conversation context found for call ${callId}`);
      return generateErrorTwiML();
    }

    // Process the conversation with AI
    const aiResponse = await conversationalAI.processConversation(
      speechResult,
      context,
      confidence
    );

    // Update stored context
    activeConversations.set(callId, context);

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : "https://wanted-husky-scarcely.ngrok-free.app";

    // Handle different response types
    if (!aiResponse.shouldContinue) {
      // End conversation
      activeConversations.delete(callId);

      return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="Polly.Joanna-Neural">${aiResponse.text}</Say>
        <Hangup/>
      </Response>`;
    }

    // Generate audio for AI response
    let audioUrl = "";
    if (aiResponse.audioBuffer) {
      try {
        audioUrl = await saveTemporaryAudio(
          callId,
          `response-${Date.now()}`,
          aiResponse.audioBuffer
        );
      } catch (audioError) {
        logger.warn("Failed to save AI response audio:", audioError);
      }
    }

    // Continue conversation
    const twiml = audioUrl
      ? `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Play>${audioUrl}</Play>
          <Gather
            input="speech"
            action="${baseUrl}/api/calls/conversation-response?callId=${callId}"
            method="POST"
            timeout="10"
            speechTimeout="auto"
            language="en-US"
          >
            <Say voice="Polly.Joanna-Neural">I'm listening...</Say>
          </Gather>
          <Redirect>${baseUrl}/api/calls/conversation-timeout?callId=${callId}</Redirect>
        </Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="Polly.Joanna-Neural">${aiResponse.text}</Say>
          <Gather
            input="speech"
            action="${baseUrl}/api/calls/conversation-response?callId=${callId}"
            method="POST"
            timeout="10"
            speechTimeout="auto"
            language="en-US"
          >
            <Say voice="Polly.Joanna-Neural">I'm listening...</Say>
          </Gather>
          <Redirect>${baseUrl}/api/calls/conversation-timeout?callId=${callId}</Redirect>
        </Response>`;

    // Handle special actions
    if (aiResponse.nextAction === "schedule_appointment") {
      // Could integrate with calendar API here
      logger.info(`AI suggested scheduling appointment for call ${callId}`);
    } else if (aiResponse.nextAction === "transfer_to_agent") {
      // Could implement call transfer here
      logger.info(
        `AI suggested transferring to human agent for call ${callId}`
      );
    }

    return twiml;
  } catch (error) {
    logger.error("Error processing conversation response:", error);
    return generateErrorTwiML();
  }
};

/**
 * Handle conversation timeout
 */
export const handleConversationTimeout = async (
  callId: string
): Promise<string> => {
  try {
    logger.info(`Conversation timeout for call ${callId}`);

    const context = activeConversations.get(callId);
    if (context) {
      // Generate a polite timeout response
      const timeoutResponse = "I didn't hear anything. Are you still there?";

      return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="Polly.Joanna-Neural">${timeoutResponse}</Say>
        <Gather
          input="speech"
          action="${
            process.env.NODE_ENV === "production"
              ? process.env.BACKEND_URL
              : "https://wanted-husky-scarcely.ngrok-free.app"
          }/api/calls/conversation-response?callId=${callId}"
          method="POST"
          timeout="5"
          speechTimeout="auto"
          language="en-US"
        >
          <Say voice="Polly.Joanna-Neural">Please say something if you're there...</Say>
        </Gather>
        <Say voice="Polly.Joanna-Neural">I'll follow up with you later. Have a great day!</Say>
        <Hangup/>
      </Response>`;
    }

    return generateErrorTwiML();
  } catch (error) {
    logger.error("Error handling conversation timeout:", error);
    return generateErrorTwiML();
  }
};

/**
 * Clean up conversation when call ends
 */
export const cleanupConversation = (callId: string): void => {
  try {
    activeConversations.delete(callId);
    logger.info(`Cleaned up conversation context for call ${callId}`);
  } catch (error) {
    logger.error("Error cleaning up conversation:", error);
  }
};

/**
 * Save temporary audio file and return URL
 */
const saveTemporaryAudio = async (
  callId: string,
  segment: string,
  audioBuffer: Buffer
): Promise<string> => {
  const audioDir = path.join(process.cwd(), "temp", "audio");
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const filename = `${callId}-${segment}-${Date.now()}.mp3`;
  const audioPath = path.join(audioDir, filename);

  fs.writeFileSync(audioPath, audioBuffer);

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.BACKEND_URL
      : "https://wanted-husky-scarcely.ngrok-free.app";

  return `${baseUrl}/api/calls/audio/${filename}`;
};

/**
 * Generate error TwiML
 */
const generateErrorTwiML = (): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say voice="Polly.Joanna-Neural">I'm sorry, I'm experiencing some technical difficulties. I'll follow up with you via text message. Thank you for your time!</Say>
    <Hangup/>
  </Response>`;
};

export default {
  handleConversationalWebhook,
  handleConversationResponse,
  handleConversationTimeout,
  cleanupConversation,
};
