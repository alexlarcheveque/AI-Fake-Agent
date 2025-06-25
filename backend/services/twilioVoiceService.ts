import twilio from "twilio";
import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";
import { generateSpeech } from "./elevenlabsService.ts";
import { CallRow, CallInsert, CallUpdate } from "../models/Call.ts";
import { CallRecordingInsert } from "../models/CallRecording.ts";
import { LeadRow } from "../models/Lead.ts";
import fs from "fs";
import path from "path";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export interface CallOptions {
  leadId: number;
  callType: "new_lead" | "follow_up" | "reactivation";
  attemptNumber?: number;
  voiceId?: string;
  conversational?: boolean;
}

export interface CallScript {
  introduction: string;
  mainContent: string;
  voicemailMessage: string;
}

/**
 * Generate call script based on lead type and call type
 */
export const generateCallScript = async (
  lead: LeadRow,
  callType: string,
  userSettings: any
): Promise<CallScript> => {
  const agentName = userSettings.agent_name || "your agent";
  const companyName = userSettings.company_name || "our company";
  const leadName = lead.name;
  const leadType = lead.lead_type || "buyer";

  let script: CallScript;

  if (callType === "new_lead") {
    if (leadType === "buyer") {
      script = {
        introduction: `Hi ${leadName}, this is ${agentName} from ${companyName}. I hope you're having a great day. I'm calling because I see you're interested in buying a home in the area.`,
        mainContent: `I'd love to help you find the perfect property. I have access to some exclusive listings that aren't on the market yet, and I can help you navigate the current market conditions. Do you have a few minutes to chat about what you're looking for?`,
        voicemailMessage: `Hi ${leadName}, this is ${agentName} from ${companyName}. I'm calling because I see you're interested in buying a home. I have some great properties that might interest you. Please give me a call back at your earliest convenience. I look forward to helping you find your dream home. Have a great day!`,
      };
    } else {
      script = {
        introduction: `Hi ${leadName}, this is ${agentName} from ${companyName}. I hope you're doing well. I'm calling because I understand you're considering selling your home.`,
        mainContent: `I'd love to help you get the best value for your property. The market is really strong right now, and I have proven strategies to help you sell quickly and for top dollar. Do you have a few minutes to discuss your selling goals?`,
        voicemailMessage: `Hi ${leadName}, this is ${agentName} from ${companyName}. I'm calling about selling your home. The market conditions are excellent right now for sellers. I'd love to discuss how I can help you get maximum value for your property. Please call me back when you get a chance. Looking forward to hearing from you!`,
      };
    }
  } else if (callType === "reactivation") {
    script = {
      introduction: `Hi ${leadName}, this is ${agentName} from ${companyName}. I hope you remember me - we spoke a while back about your real estate goals.`,
      mainContent: `I wanted to reach out because the market has changed significantly, and there are some new opportunities that might interest you. Whether you're buying or selling, now might be the perfect time to make a move. Would you like to hear about what's new in the market?`,
      voicemailMessage: `Hi ${leadName}, this is ${agentName} from ${companyName}. I'm following up on our previous conversation about your real estate needs. The market has some exciting new opportunities that I think you'd be interested in. Please give me a call back when you have a moment. Thanks!`,
    };
  } else {
    // follow_up
    script = {
      introduction: `Hi ${leadName}, this is ${agentName} from ${companyName}. I wanted to follow up on our previous conversation.`,
      mainContent: `I've been thinking about what we discussed, and I have some new information that might be helpful for your situation. Do you have a few minutes to chat?`,
      voicemailMessage: `Hi ${leadName}, this is ${agentName} from ${companyName}. I'm following up on our conversation. I have some updates that I think you'll find interesting. Please call me back when you get a chance. Thanks!`,
    };
  }

  return script;
};

/**
 * Initiate an outbound call with AI voice
 */
export const initiateCall = async (options: CallOptions): Promise<CallRow> => {
  try {
    logger.info(
      `Initiating call for lead ${options.leadId}, type: ${options.callType}`
    );

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", options.leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Get user settings
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("uuid", lead.user_uuid)
      .single();

    if (settingsError || !userSettings) {
      throw new Error(`User settings not found: ${settingsError?.message}`);
    }

    // Generate call script
    const script = await generateCallScript(
      lead,
      options.callType,
      userSettings
    );

    // Create call record
    const callData: CallInsert = {
      lead_id: options.leadId,
      direction: "outbound",
      status: "queued",
      from_number: twilioPhoneNumber,
      to_number: lead.phone_number.toString(),
      call_type: options.callType,
      attempt_number: options.attemptNumber || 1,
      started_at: new Date().toISOString(),
    };

    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert(callData)
      .select()
      .single();

    if (callError || !call) {
      throw new Error(`Failed to create call record: ${callError?.message}`);
    }

    // Generate TwiML for the call
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.BACKEND_URL
        : "https://wanted-husky-scarcely.ngrok-free.app";

    // Use conversational webhook if enabled
    const webhookUrl = options.conversational
      ? `${baseUrl}/api/calls/conversational-voice-webhook`
      : `${baseUrl}/api/calls/voice-webhook`;

    const statusCallbackUrl = options.conversational
      ? `${baseUrl}/api/calls/conversational-status-callback`
      : `${baseUrl}/api/calls/status-callback`;

    // Build webhook URL with parameters
    const webhookParams = options.conversational
      ? `?callId=${call.id}&leadId=${
          options.leadId
        }&voiceId=${encodeURIComponent(options.voiceId || "")}`
      : `?callId=${call.id}&script=${encodeURIComponent(
          JSON.stringify(script)
        )}`;

    // Make the call with Twilio
    const twilioCall = await client.calls.create({
      from: twilioPhoneNumber,
      to: lead.phone_number.toString(),
      url: `${webhookUrl}${webhookParams}`,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      record: true,
      recordingStatusCallback: `${baseUrl}/api/calls/recording-callback`,
    });

    // Update call with Twilio SID
    const { data: updatedCall, error: updateError } = await supabase
      .from("calls")
      .update({
        twilio_call_sid: twilioCall.sid,
        status: "queued",
      })
      .eq("id", call.id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating call with Twilio SID:", updateError);
    }

    // Update lead's last call attempt
    await supabase
      .from("leads")
      .update({ last_call_attempt: new Date().toISOString() })
      .eq("id", options.leadId);

    logger.info(
      `Call initiated successfully. Call ID: ${call.id}, Twilio SID: ${twilioCall.sid}`
    );

    return updatedCall || call;
  } catch (error) {
    logger.error("Error initiating call:", error);
    throw error;
  }
};

/**
 * Handle Twilio voice webhook - generates TwiML response with ElevenLabs AI voice
 */
export const handleVoiceWebhook = async (
  callId: string,
  script: CallScript,
  voiceId?: string
): Promise<string> => {
  try {
    logger.info(
      `Handling voice webhook for call ${callId} with ElevenLabs voice`
    );

    // Use ElevenLabs for high-quality AI voice generation
    const useElevenLabs = process.env.ELEVENLABS_API_KEY && voiceId;

    if (useElevenLabs) {
      // Generate audio segments with ElevenLabs
      const introText = script.introduction + " " + script.mainContent;
      const gatherPrompt =
        "If you're interested in learning more, please press 1. Otherwise, I'll follow up with a text message. Thank you for your time!";
      const finalMessage =
        "Thank you! I'll send you a text message with more information. Have a great day!";

      try {
        // Generate audio files
        const introAudio = await generateSpeech(introText, { voiceId });
        const gatherAudio = await generateSpeech(gatherPrompt, { voiceId });
        const finalAudio = await generateSpeech(finalMessage, { voiceId });

        // Save audio files temporarily
        const audioDir = path.join(process.cwd(), "temp", "audio");
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }

        const introPath = path.join(audioDir, `intro-${callId}.mp3`);
        const gatherPath = path.join(audioDir, `gather-${callId}.mp3`);
        const finalPath = path.join(audioDir, `final-${callId}.mp3`);

        fs.writeFileSync(introPath, introAudio);
        fs.writeFileSync(gatherPath, gatherAudio);
        fs.writeFileSync(finalPath, finalAudio);

        // Generate TwiML with ElevenLabs audio
        const baseUrl =
          process.env.NODE_ENV === "production"
            ? process.env.BACKEND_URL
            : "https://wanted-husky-scarcely.ngrok-free.app";

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Play>${baseUrl}/api/calls/audio/intro-${callId}.mp3</Play>
          <Pause length="2"/>
          <Play>${baseUrl}/api/calls/audio/gather-${callId}.mp3</Play>
          <Gather numDigits="1" timeout="15" action="${baseUrl}/api/calls/gather-response?callId=${callId}">
            <Say voice="Polly.Joanna-Neural" language="en-US">Press 1 if you'd like to continue this conversation, or hang up and I'll send you a text message.</Say>
          </Gather>
          <Play>${baseUrl}/api/calls/audio/final-${callId}.mp3</Play>
          <Hangup/>
        </Response>`;

        logger.info(`Generated TwiML with ElevenLabs audio for call ${callId}`);
        return twiml;
      } catch (voiceError) {
        logger.error(
          "Error generating ElevenLabs audio, falling back to Polly:",
          voiceError
        );
        // Fall through to Polly backup
      }
    }

    // Fallback to enhanced Polly neural voices
    const introText = script.introduction + " " + script.mainContent;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Matthew-Neural" language="en-US" rate="medium" pitch="medium">${introText}</Say>
      <Pause length="2"/>
      <Say voice="Polly.Matthew-Neural" language="en-US" rate="medium">If you're interested in learning more, please press 1. Otherwise, I'll follow up with a text message. Thank you for your time!</Say>
      <Gather numDigits="1" timeout="15" action="/api/calls/gather-response?callId=${callId}">
        <Say voice="Polly.Matthew-Neural" language="en-US" rate="slow">Press 1 if you'd like to continue this conversation, or hang up and I'll send you a text message.</Say>
      </Gather>
      <Say voice="Polly.Matthew-Neural" language="en-US">Thank you! I'll send you a text message with more information. Have a great day!</Say>
      <Hangup/>
    </Response>`;

    logger.info(`Generated TwiML with Polly Neural voice for call ${callId}`);
    return twiml;
  } catch (error) {
    logger.error("Error handling voice webhook:", error);

    // Emergency fallback TwiML
    return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Matthew-Neural" language="en-US">Hello, this is a call from your real estate agent. I'll follow up with a text message shortly. Thank you!</Say>
      <Hangup/>
    </Response>`;
  }
};

/**
 * Handle call status updates from Twilio
 */
export const handleStatusCallback = async (
  twilioSid: string,
  status: string,
  duration?: string
): Promise<boolean> => {
  try {
    logger.info(`Updating call status for Twilio SID ${twilioSid}: ${status}`);

    const updateData: CallUpdate = {
      status: status as any,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed" && duration) {
      updateData.duration = parseInt(duration);
      updateData.ended_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("calls")
      .update(updateData)
      .eq("twilio_call_sid", twilioSid)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating call status for SID ${twilioSid}:`, error);
      return false;
    }

    // If call failed or no answer, potentially schedule retry or send SMS
    if (status === "no-answer" || status === "failed" || status === "busy") {
      await handleFailedCall(data);
    }

    return true;
  } catch (error) {
    logger.error(`Error handling status callback for SID ${twilioSid}:`, error);
    return false;
  }
};

/**
 * Handle failed calls - retry logic or send SMS
 */
const handleFailedCall = async (call: CallRow): Promise<void> => {
  try {
    // Get user settings for retry attempts
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", call.lead_id)
      .single();

    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("uuid", lead?.user_uuid)
      .single();

    const maxRetries = userSettings?.call_retry_attempts || 2;

    if (call.attempt_number < maxRetries) {
      // Schedule a retry call
      logger.info(
        `Scheduling retry call for lead ${call.lead_id}, attempt ${
          call.attempt_number + 1
        }`
      );

      // Wait 5 minutes before retry
      setTimeout(async () => {
        await initiateCall({
          leadId: call.lead_id!,
          callType: call.call_type as any,
          attemptNumber: call.attempt_number! + 1,
        });
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      // Send fallback SMS
      logger.info(
        `Max retries reached for lead ${call.lead_id}, sending fallback SMS`
      );

      // Import and use existing SMS service
      const { sendMessage } = await import("./twilioService.ts");

      const fallbackMessage = `Hi ${lead?.name}, I tried calling you earlier but wasn't able to reach you. I'd love to help you with your real estate needs. Please reply to this message or call me back when you have a moment. Thanks!`;

      await sendMessage(lead?.phone_number!, fallbackMessage);
    }
  } catch (error) {
    logger.error("Error handling failed call:", error);
  }
};

/**
 * Handle recording callback from Twilio
 */
export const handleRecordingCallback = async (
  callSid: string,
  recordingSid: string,
  recordingUrl: string,
  duration: string
): Promise<boolean> => {
  try {
    logger.info(
      `Recording callback for call ${callSid}, recording ${recordingSid}`
    );

    // Find the call
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("*")
      .eq("twilio_call_sid", callSid)
      .single();

    if (callError || !call) {
      logger.error(`Call not found for SID ${callSid}`);
      return false;
    }

    // Create recording record
    const recordingData: CallRecordingInsert = {
      call_id: call.id,
      recording_sid: recordingSid,
      recording_url: recordingUrl,
      duration: parseInt(duration),
    };

    const { error: recordingError } = await supabase
      .from("call_recordings")
      .insert(recordingData);

    if (recordingError) {
      logger.error("Error saving recording data:", recordingError);
      return false;
    }

    logger.info(`Recording saved for call ${call.id}`);
    return true;
  } catch (error) {
    logger.error("Error handling recording callback:", error);
    return false;
  }
};

/**
 * Get calls for a lead
 */
export const getCallsForLead = async (leadId: number): Promise<CallRow[]> => {
  try {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error fetching calls: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    logger.error(`Error getting calls for lead ${leadId}:`, error);
    throw error;
  }
};

export default {
  initiateCall,
  handleVoiceWebhook,
  handleStatusCallback,
  handleRecordingCallback,
  getCallsForLead,
  generateCallScript,
};
