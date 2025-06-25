import { Request, Response } from "express";
import logger from "../utils/logger.ts";
import conversationalVoiceService from "../services/conversationalVoiceService.ts";
import conversationalAI from "../services/conversationalAI.ts";
import supabase from "../config/supabase.ts";

/**
 * Handle conversational voice webhook (replaces simple voice webhook for AI conversations)
 */
export const conversationalVoiceWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    const { callId, leadId, voiceId } = req.query;

    if (!callId || !leadId) {
      return res.status(400).send("Missing required parameters");
    }

    // Enable conversation mode for this call
    await supabase
      .from("calls")
      .update({ conversation_enabled: true })
      .eq("id", callId);

    const twiml = await conversationalVoiceService.handleConversationalWebhook(
      callId as string,
      parseInt(leadId as string),
      voiceId as string
    );

    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } catch (error) {
    logger.error("Error in conversational voice webhook:", error);

    // Send fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural" language="en-US">Hello, I'm having some technical difficulties. I'll follow up with you via text message. Thank you!</Say>
      <Hangup/>
    </Response>`;

    res.set("Content-Type", "text/xml");
    res.send(fallbackTwiml);
  }
};

/**
 * Handle speech recognition response from Twilio
 */
export const conversationResponse = async (req: Request, res: Response) => {
  try {
    const { callId } = req.query;
    const { SpeechResult, Confidence } = req.body;

    logger.info(
      `Conversation response for call ${callId}: "${SpeechResult}" (confidence: ${Confidence})`
    );

    if (!callId) {
      return res.status(400).send("Missing call ID");
    }

    if (!SpeechResult) {
      // No speech detected, handle timeout
      const twiml = await conversationalVoiceService.handleConversationTimeout(
        callId as string
      );
      res.set("Content-Type", "text/xml");
      res.send(twiml);
      return;
    }

    const confidence = parseFloat(Confidence) || 1.0;
    const twiml = await conversationalVoiceService.handleConversationResponse(
      callId as string,
      SpeechResult,
      confidence
    );

    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } catch (error) {
    logger.error("Error in conversation response:", error);

    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural">I'm sorry, I didn't catch that. Could you please repeat?</Say>
      <Hangup/>
    </Response>`;

    res.set("Content-Type", "text/xml");
    res.send(fallbackTwiml);
  }
};

/**
 * Handle conversation timeout
 */
export const conversationTimeout = async (req: Request, res: Response) => {
  try {
    const { callId } = req.query;

    if (!callId) {
      return res.status(400).send("Missing call ID");
    }

    const twiml = await conversationalVoiceService.handleConversationTimeout(
      callId as string
    );
    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } catch (error) {
    logger.error("Error in conversation timeout:", error);

    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Joanna-Neural">I'll follow up with you later. Have a great day!</Say>
      <Hangup/>
    </Response>`;

    res.set("Content-Type", "text/xml");
    res.send(fallbackTwiml);
  }
};

/**
 * Get conversation messages for a call
 */
export const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    if (!callId) {
      return res.status(400).json({ error: "Call ID is required" });
    }

    const { data: messages, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("call_id", parseInt(callId))
      .order("timestamp", { ascending: true });

    if (error) {
      throw error;
    }

    res.status(200).json(messages || []);
  } catch (error) {
    logger.error("Error getting conversation messages:", error);
    res.status(500).json({ error: "Failed to get conversation messages" });
  }
};

/**
 * Get conversation analytics
 */
export const getConversationAnalytics = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    if (!leadId) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    const { data: analytics, error } = await supabase
      .from("conversation_analytics")
      .select("*")
      .eq("lead_id", leadId)
      .order("conversation_start", { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate summary statistics
    const summary = {
      totalConversations: analytics?.length || 0,
      averageConversationDuration:
        analytics?.reduce(
          (acc, conv) => acc + (conv.conversation_duration_seconds || 0),
          0
        ) / (analytics?.length || 1),
      averageMessageCount:
        analytics?.reduce((acc, conv) => acc + (conv.message_count || 0), 0) /
        (analytics?.length || 1),
      averageConfidence:
        analytics?.reduce((acc, conv) => acc + (conv.avg_confidence || 0), 0) /
        (analytics?.length || 1),
      interestLevelDistribution: {
        high:
          analytics?.filter((c) => c.lead_interest_level === "high").length ||
          0,
        medium:
          analytics?.filter((c) => c.lead_interest_level === "medium").length ||
          0,
        low:
          analytics?.filter((c) => c.lead_interest_level === "low").length || 0,
        unknown:
          analytics?.filter((c) => c.lead_interest_level === "unknown")
            .length || 0,
      },
    };

    res.status(200).json({
      conversations: analytics || [],
      summary,
    });
  } catch (error) {
    logger.error("Error getting conversation analytics:", error);
    res.status(500).json({ error: "Failed to get conversation analytics" });
  }
};

/**
 * Enhanced status callback that cleans up conversations
 */
export const conversationalStatusCallback = async (
  req: Request,
  res: Response
) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    if (!CallSid || !CallStatus) {
      return res.status(400).send("Missing required parameters");
    }

    // Get call ID from Twilio SID
    const { data: call } = await supabase
      .from("calls")
      .select("id")
      .eq("twilio_call_sid", CallSid)
      .single();

    if (call) {
      // Clean up conversation context when call ends
      if (
        CallStatus === "completed" ||
        CallStatus === "failed" ||
        CallStatus === "no-answer"
      ) {
        conversationalVoiceService.cleanupConversation(call.id.toString());
      }

      // Update call status
      const updateData: any = {
        status: CallStatus,
        updated_at: new Date().toISOString(),
      };

      if (CallStatus === "completed" && CallDuration) {
        updateData.duration = parseInt(CallDuration);
        updateData.ended_at = new Date().toISOString();
      }

      await supabase
        .from("calls")
        .update(updateData)
        .eq("twilio_call_sid", CallSid);
    }

    res.status(200).send("OK");
  } catch (error) {
    logger.error("Error in conversational status callback:", error);
    res.status(500).send("Internal server error");
  }
};

export default {
  conversationalVoiceWebhook,
  conversationResponse,
  conversationTimeout,
  getConversationMessages,
  getConversationAnalytics,
  conversationalStatusCallback,
};
