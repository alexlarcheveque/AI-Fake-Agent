import jwt from "jsonwebtoken";
import twilio from "twilio";
import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!;
const twilioApiKey = process.env.TWILIO_API_KEY!;
const twilioApiSecret = process.env.TWILIO_API_SECRET!;
const twilioAppSid = process.env.TWILIO_APP_SID!;

const client = twilio(twilioAccountSid, process.env.TWILIO_AUTH_TOKEN);

/**
 * Generate access token for Twilio Voice SDK (WebRTC)
 */
export const generateAccessToken = (identity: string): string => {
  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token
    const accessToken = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity }
    );

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twilioAppSid,
      incomingAllow: true, // Allow incoming calls
    });

    accessToken.addGrant(voiceGrant);

    const token = accessToken.toJwt();
    logger.info(`Generated access token for identity: ${identity}`);

    return token;
  } catch (error) {
    logger.error("Error generating access token:", error);
    throw error;
  }
};

/**
 * Make outbound call via WebRTC
 */
export const makeWebRTCCall = async (
  fromIdentity: string,
  toPhoneNumber: string,
  callId: number,
  useRealtimeAI: boolean = false
): Promise<{
  success: boolean;
  callSid?: string;
  error?: string;
}> => {
  try {
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : "https://wanted-husky-scarcely.ngrok-free.app";

    // Determine webhook URL based on AI mode
    const webhookUrl = useRealtimeAI
      ? `${baseUrl}/api/webrtc/realtime-twiml?callId=${callId}`
      : `${baseUrl}/api/webrtc/voice-twiml?callId=${callId}`;

    // Create call via Twilio API
    const call = await client.calls.create({
      to: toPhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: webhookUrl,
      method: "POST",
      statusCallback: `${baseUrl}/api/webrtc/status-callback`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      record: true,
      recordingStatusCallback: `${baseUrl}/api/webrtc/recording-callback`,
      recordingStatusCallbackMethod: "POST",
    });

    // Update call record with Twilio SID
    await supabase
      .from("calls")
      .update({
        twilio_call_sid: call.sid,
        status: "queued",
      })
      .eq("id", callId);

    logger.info(`WebRTC call initiated: ${call.sid} for call ID: ${callId}`);

    return {
      success: true,
      callSid: call.sid,
    };
  } catch (error) {
    logger.error("Error making WebRTC call:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Handle incoming calls - route to available agents
 */
export const handleIncomingCall = async (
  fromNumber: string,
  toNumber: string
): Promise<string> => {
  try {
    logger.info(`Incoming call from ${fromNumber} to ${toNumber}`);

    // For now, automatically answer with AI
    // In the future, you could route to specific agents based on availability

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : "https://wanted-husky-scarcely.ngrok-free.app";

    // Create TwiML to connect caller with AI
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural" language="en-US">
        Hi! Thank you for calling. You've reached our AI assistant. 
        Please hold while I connect you with our real estate expert.
      </Say>
      <Dial>
        <Client>realtime-ai-agent</Client>
      </Dial>
      <Say voice="Polly.Joanna-Neural" language="en-US">
        I'm sorry, our agent is currently unavailable. 
        Please leave a message and we'll get back to you shortly.
      </Say>
      <Record 
        action="${baseUrl}/api/webrtc/voicemail-callback"
        transcribe="true"
        maxLength="120"
      />
    </Response>`;

    return twiml;
  } catch (error) {
    logger.error("Error handling incoming call:", error);

    // Fallback TwiML
    return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural" language="en-US">
        Thank you for calling. Please leave a message and we'll get back to you.
      </Say>
      <Record maxLength="120" />
    </Response>`;
  }
};

/**
 * Generate TwiML for regular voice calls
 */
export const generateVoiceTwiML = async (callId: number): Promise<string> => {
  try {
    // Get call and lead info
    const { data: call } = await supabase
      .from("calls")
      .select(
        `
        *,
        leads (*)
      `
      )
      .eq("id", callId)
      .single();

    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }

    const lead = call.leads;

    // Generate appropriate script based on lead type and call history
    const script = await generateCallScript(lead, call.call_type);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Matthew-Neural" language="en-US" rate="medium">
        ${script.introduction} ${script.mainContent}
      </Say>
      <Pause length="2"/>
      <Gather numDigits="1" timeout="15" action="${
        process.env.NODE_ENV === "production"
          ? process.env.BACKEND_URL
          : "https://wanted-husky-scarcely.ngrok-free.app"
      }/api/webrtc/gather-response?callId=${callId}">
        <Say voice="Polly.Matthew-Neural" language="en-US">
          If you're interested in learning more, please press 1. 
          To speak with our AI assistant, press 2.
          Otherwise, I'll follow up with a text message. Thank you!
        </Say>
      </Gather>
      <Say voice="Polly.Matthew-Neural" language="en-US">
        Thank you! I'll send you more information via text. Have a great day!
      </Say>
      <Hangup/>
    </Response>`;

    return twiml;
  } catch (error) {
    logger.error(`Error generating voice TwiML for call ${callId}:`, error);

    return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Matthew-Neural" language="en-US">
        Hello, this is a call from your real estate agent. 
        I'll follow up with more information shortly. Thank you!
      </Say>
      <Hangup/>
    </Response>`;
  }
};

/**
 * Generate TwiML for Realtime AI calls
 */
export const generateRealtimeTwiML = async (
  callId: number
): Promise<string> => {
  try {
    // Get the lead ID from the call record
    const { data: call } = await supabase
      .from("calls")
      .select("lead_id")
      .eq("id", callId)
      .single();

    const leadId = call?.lead_id || 0;

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : "https://wanted-husky-scarcely.ngrok-free.app";

    // For WebRTC + Realtime AI, connect directly to Media Streams without intro
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://${baseUrl.replace(
          "https://",
          ""
        )}/api/realtime/media-stream">
          <Parameter name="callId" value="${callId}" />
          <Parameter name="leadId" value="${leadId}" />
        </Stream>
      </Connect>
    </Response>`;

    return twiml;
  } catch (error) {
    logger.error(`Error generating realtime TwiML for call ${callId}:`, error);

    return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural" language="en-US">
        I'm sorry, there was a technical issue. Please try again later.
      </Say>
      <Hangup/>
    </Response>`;
  }
};

// Helper function to generate call scripts
const generateCallScript = async (lead: any, callType: string) => {
  // This is a simplified version - you can expand this based on your needs
  const scripts = {
    new_lead: {
      introduction: `Hi ${lead.name}, this is calling from your real estate inquiry.`,
      mainContent:
        "I wanted to reach out about your interest in buying a home in the area. Do you have a quick moment to chat about what you're looking for?",
    },
    follow_up: {
      introduction: `Hi ${lead.name}, following up on our previous conversation.`,
      mainContent:
        "I wanted to check in and see if you have any questions about the properties we discussed, or if your timeline has changed at all.",
    },
    reactivation: {
      introduction: `Hi ${lead.name}, it's been a while since we last spoke.`,
      mainContent:
        "I wanted to reach out to see if you're still interested in buying or selling real estate. The market has some interesting opportunities right now.",
    },
  };

  return scripts[callType as keyof typeof scripts] || scripts.follow_up;
};

export default {
  generateAccessToken,
  makeWebRTCCall,
  handleIncomingCall,
  generateVoiceTwiML,
  generateRealtimeTwiML,
};
