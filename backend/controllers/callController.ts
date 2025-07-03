import { Request, Response } from "express";
import twilio from "twilio";
import { realtimeVoiceService } from "../services/realtimeVoiceService.ts";
import { createClient } from "@supabase/supabase-js";

const { AccessToken } = twilio.jwt;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

console.log(
  `Using Twilio config: SID=${process.env.TWILIO_ACCOUNT_SID?.slice(
    0,
    7
  )}..., Phone=${process.env.TWILIO_PHONE_NUMBER}`
);

/**
 * Handle incoming voice calls - ALL calls now use WebRTC + Realtime AI
 */
export const handleIncomingCall = async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, leadId, mode, leadName } = req.body;
    const outboundTo = req.body.To; // The number we want to call (for outbound)

    console.log(`Call request: ${CallSid} from ${From} to ${To}`, {
      leadId,
      mode,
      leadName,
      outboundTo,
    });

    // Determine call direction and numbers
    const isOutbound = !!outboundTo;
    const direction = isOutbound ? "outbound" : "inbound";
    const fromNumber = isOutbound ? process.env.TWILIO_PHONE_NUMBER : From;
    const toNumber = isOutbound ? outboundTo : To;

    let call: any = null;

    // First, check if a call with this Twilio SID already exists
    const { data: existingCallBySid, error: sidError } = await supabase
      .from("calls")
      .select("*")
      .eq("twilio_call_sid", CallSid)
      .single();

    if (!sidError && existingCallBySid) {
      console.log(
        `Call with Twilio SID ${CallSid} already exists (ID: ${existingCallBySid.id})`
      );
      call = existingCallBySid;
    } else if (isOutbound && toNumber) {
      // For outbound calls, check if there's an existing call for this lead/number
      const { data: existingCalls, error: findError } = await supabase
        .from("calls")
        .select("*")
        .eq("to_number", toNumber)
        .in("status", ["queued", "initiated"])
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!findError && existingCalls && existingCalls.length > 0) {
        const existingCall = existingCalls[0];
        console.log(
          `Found existing call ${existingCall.id}, updating with Twilio SID`
        );

        // Update the existing call with Twilio SID and status
        const { data: updatedCall, error: updateError } = await supabase
          .from("calls")
          .update({
            twilio_call_sid: CallSid,
            status: "initiated",
            started_at: new Date().toISOString(),
          })
          .eq("id", existingCall.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating existing call:", updateError);
        } else {
          call = updatedCall;
          console.log(
            `✅ Updated existing call ${call.id} with Twilio SID ${CallSid}`
          );
        }
      }
    }

    // If no existing call found, create a new one
    if (!call) {
      const callData = {
        twilio_call_sid: CallSid,
        direction,
        status: "initiated",
        from_number: fromNumber,
        to_number: toNumber,
        started_at: new Date().toISOString(),
        lead_id: leadId ? parseInt(leadId) : null,
        call_type: "follow_up", // Use valid call_type value
        call_mode: mode === "manual" ? "manual" : "ai", // Track whether it's manual or AI
      };

      console.log("Creating new call record:", callData);

      const { data: newCall, error } = await supabase
        .from("calls")
        .insert(callData)
        .select()
        .single();

      if (error) {
        console.error("Error creating call record:", error);
      } else {
        call = newCall;
      }
    }

    // Generate TwiML for Realtime WebSocket connection
    const twiml = generateRealtimeTwiML(req, call?.id);

    res.type("text/xml");
    res.send(twiml);
  } catch (error) {
    console.error("Error handling incoming call:", error);
    res.status(500).send("Internal server error");
  }
};

/**
 * Generate TwiML for Realtime voice calls
 */
function generateRealtimeTwiML(req: Request, callId?: number): string {
  // Check if this is an outbound call (has To parameter)
  const toNumber = req.body.To || req.query.To;
  const mode = req.body.mode || req.query.mode; // Get the call mode (ai or manual)

  console.log(
    `🔧 Generating TwiML - Mode: ${mode}, To: ${toNumber}, CallId: ${callId}`
  );

  // Use ngrok URL for WebSocket connection so Twilio can reach it
  const ngrokUrl =
    process.env.NGROK_URL || "wanted-husky-scarcely.ngrok-free.app";
  const websocketUrl = `wss://${ngrokUrl}/api/voice/realtime`;

  if (toNumber) {
    // Outbound call
    if (mode === "manual") {
      // For manual calls, dial the lead directly and connect the WebRTC user
      console.log(`📞 Manual call: Dialing ${toNumber} directly`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}" record="true" recordingStatusCallback="https://${ngrokUrl}/api/recordings/callback" recordingStatusCallbackMethod="POST">
    <Number>${toNumber}</Number>
  </Dial>
</Response>`;
    } else {
      // For AI calls, connect to AI WebSocket stream
      console.log(`🤖 AI call: Connecting to AI stream for ${toNumber}`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId || "unknown"}" />
      <Parameter name="leadPhone" value="${toNumber}" />
      <Parameter name="isOutbound" value="true" />
      <Parameter name="mode" value="ai" />
    </Stream>
  </Connect>
</Response>`;
    }
  } else {
    // Inbound call - always connect to AI stream
    console.log(`📞 Inbound call: Connecting to AI stream`);
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hi! I'm your AI real estate assistant. Let me connect you now.</Say>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId || "unknown"}" />
      <Parameter name="mode" value="ai" />
    </Stream>
  </Connect>
</Response>`;
  }
}

/**
 * Handle WebSocket connections for Realtime voice calls
 */
export const handleRealtimeWebSocket = async (ws: any, req: any) => {
  console.log("New WebSocket connection for Realtime voice call");

  let callId: string = "unknown";
  let leadId: number = 0;
  let leadData: any = null;

  // Handle WebSocket messages
  ws.on("message", async (message: string) => {
    try {
      const data = JSON.parse(message);

      // Extract call parameters from Twilio stream start event
      if (data.event === "start") {
        const parameters = data.start.customParameters || {};
        callId = parameters.callId || "unknown";

        console.log(`WebSocket stream started for call ${callId}`);

        // Look up call record to get lead information
        if (callId !== "unknown") {
          const { data: call, error } = await supabase
            .from("calls")
            .select("id, lead_id, from_number")
            .eq("id", callId)
            .single();

          if (!error && call) {
            leadId = call.lead_id;

            // If no lead_id, try to find lead by phone number
            if (!leadId && call.from_number) {
              const { data: lead } = await supabase
                .from("leads")
                .select("id, first_name, last_name, phone")
                .eq("phone", call.from_number)
                .single();

              if (lead) {
                leadId = lead.id;
                leadData = lead;

                // Update call record with lead_id
                await supabase
                  .from("calls")
                  .update({ lead_id: leadId })
                  .eq("id", callId);
              }
            } else if (leadId) {
              // Get lead data
              const { data: lead } = await supabase
                .from("leads")
                .select("id, first_name, last_name, phone, email")
                .eq("id", leadId)
                .single();

              if (lead) {
                leadData = lead;
              }
            }
          }
        }

        console.log(
          `Starting Realtime voice call for lead ${leadId} (${
            leadData?.first_name || "Unknown"
          })`
        );

        // Start the Realtime voice service with stream info
        await realtimeVoiceService.handleWebSocketConnection(ws, {
          callId,
          leadId,
          leadName: leadData
            ? `${leadData.first_name} ${leadData.last_name}`
            : undefined,
          leadPhone: leadData?.phone,
          streamSid: data.start.streamSid,
          initialStreamData: data.start,
        });
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    console.log(`WebSocket connection closed for call ${callId}`);
  });

  ws.on("error", (error: any) => {
    console.error(`WebSocket error for call ${callId}:`, error);
  });
};

/**
 * Initiate a direct AI call to a lead (no WebRTC)
 */
export const initiateAICall = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, phone_number, email")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res
        .status(404)
        .json({ error: "Lead not found", details: leadError });
    }

    if (!lead.phone_number) {
      return res.status(400).json({ error: "Lead has no phone number" });
    }

    const callData = {
      lead_id: leadId,
      direction: "outbound",
      status: "queued",
      to_number: lead.phone_number.toString(),
      from_number: process.env.TWILIO_PHONE_NUMBER!,
      call_type: "follow_up",
      call_mode: "ai", // AI calls
      attempt_number: 1,
      is_voicemail: false,
    };

    // Create call record
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert(callData)
      .select()
      .single();

    if (callError) {
      console.error("Error creating call record:", callError);
      return res
        .status(500)
        .json({ error: "Failed to create call record", details: callError });
    }

    // Make direct outbound call using Twilio REST API (no WebRTC)
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const ngrokUrl =
      process.env.NGROK_URL || "wanted-husky-scarcely.ngrok-free.app";
    const webhookUrl = `https://${ngrokUrl}/api/voice/incoming?callId=${call.id}`;

    const twilioCall = await twilioClient.calls.create({
      to: lead.phone_number,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: webhookUrl,
      method: "POST",
      record: true,
      recordingStatusCallback: `https://${ngrokUrl}/api/recordings/callback`,
      recordingStatusCallbackMethod: "POST",
      statusCallback: `https://${ngrokUrl}/api/voice/status-callback`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: [
        "initiated",
        "ringing",
        "answered",
        "completed",
        "busy",
        "failed",
        "no-answer",
        "canceled",
      ],
    });

    // Update call record with Twilio SID
    await supabase
      .from("calls")
      .update({
        twilio_call_sid: twilioCall.sid,
        status: "initiated",
      })
      .eq("id", call.id);

    console.log(
      `Created AI call ${call.id} with Twilio SID ${twilioCall.sid} for lead ${leadId}`
    );

    res.json({
      success: true,
      callId: call.id,
      twilioCallSid: twilioCall.sid,
      leadName: lead.name,
      phoneNumber: lead.phone_number,
    });
  } catch (error) {
    console.error("Error initiating AI call:", error);
    res.status(500).json({
      error: "Failed to initiate AI call",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Initiate an outbound call to a lead using WebRTC (for manual calls)
 */
export const initiateCall = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, phone_number, email")
      .eq("id", leadId)
      .single();

    console.log(`Lead lookup for ID ${leadId}:`, { lead, error: leadError });

    if (leadError || !lead) {
      return res
        .status(404)
        .json({ error: "Lead not found", details: leadError });
    }

    if (!lead.phone_number) {
      return res.status(400).json({ error: "Lead has no phone number" });
    }

    const callData = {
      lead_id: leadId,
      direction: "outbound",
      status: "queued",
      to_number: lead.phone_number.toString(),
      from_number: process.env.TWILIO_PHONE_NUMBER!,
      call_type: "follow_up",
      call_mode: "manual", // Manual calls via WebRTC
      attempt_number: 1,
      is_voicemail: false,
    };

    console.log("Attempting to create call with data:", callData);

    // Create call record
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert(callData)
      .select()
      .single();

    console.log("Call creation result:", { call, error: callError });

    if (callError) {
      console.error("Error creating call record:", callError);
      return res
        .status(500)
        .json({ error: "Failed to create call record", details: callError });
    }

    // For WebRTC calls, we don't initiate via REST API
    // The call will be handled by the TwiML App when device.connect() is called
    // The Twilio call SID will be updated when the call actually connects

    console.log(
      `Created call record ${call.id} for lead ${leadId} (${lead.name})`
    );

    res.json({
      success: true,
      callId: call.id,
      twilioCallSid: null, // Will be set when call connects
      leadName: lead.name,
      phoneNumber: lead.phone_number,
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    res.status(500).json({
      error: "Failed to initiate call",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get calls for a specific lead
 */
export const getCallsForLead = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching calls:", error);
      return res.status(500).json({ error: "Failed to fetch calls" });
    }

    res.json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    res.status(500).json({ error: "Failed to fetch calls" });
  }
};

/**
 * Debug endpoint to check and fix call statuses for a lead
 */
export const debugAndFixCalls = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    // Get all calls for this lead
    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching calls for debug:", error);
      return res.status(500).json({ error: "Failed to fetch calls" });
    }

    console.log(`🔍 Debug: Found ${calls.length} calls for lead ${leadId}`);

    // Analyze call statuses
    const statusBreakdown = calls.reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`📊 Status breakdown:`, statusBreakdown);

    // Find stuck calls (in-progress for more than 30 minutes)
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const stuckCalls = calls.filter((call) => {
      if (call.status !== "in-progress") return false;

      const callTime = new Date(call.started_at || call.created_at);
      return callTime < thirtyMinutesAgo;
    });

    console.log(`🔧 Found ${stuckCalls.length} stuck calls`);

    // Fix stuck calls
    const fixedCalls = [];
    for (const stuckCall of stuckCalls) {
      console.log(`🔧 Fixing stuck call ${stuckCall.id}`);

      const { error: updateError } = await supabase
        .from("calls")
        .update({
          status: "failed",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", stuckCall.id);

      if (updateError) {
        console.error(`❌ Error fixing call ${stuckCall.id}:`, updateError);
      } else {
        console.log(`✅ Fixed call ${stuckCall.id}`);
        fixedCalls.push(stuckCall.id);
      }
    }

    // Get updated calls
    const { data: updatedCalls, error: updatedError } = await supabase
      .from("calls")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (updatedError) {
      console.error("Error fetching updated calls:", updatedError);
    }

    res.json({
      originalCalls: calls.length,
      statusBreakdown,
      stuckCallsFound: stuckCalls.length,
      stuckCallsFixed: fixedCalls.length,
      fixedCallIds: fixedCalls,
      updatedCalls: updatedCalls || calls,
    });
  } catch (error) {
    console.error("Error in debug and fix calls:", error);
    res.status(500).json({ error: "Failed to debug and fix calls" });
  }
};

/**
 * Test endpoint to check if a lead exists
 */
export const testLeadLookup = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, name, phone_number, email")
      .eq("id", leadId)
      .single();

    res.json({ leadId, lead, error, exists: !!lead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test endpoint to create a call record
 */
export const testCallInsert = async (req: Request, res: Response) => {
  try {
    const callData = {
      lead_id: 55,
      direction: "outbound",
      status: "queued",
      to_number: "9095697757",
      from_number: "+12134152761",
      call_type: "follow_up",
      attempt_number: 1,
      is_voicemail: false,
    };

    console.log("Test call insert with data:", callData);

    const { data: call, error } = await supabase
      .from("calls")
      .insert(callData)
      .select()
      .single();

    console.log("Test call result:", { call, error });

    res.json({ callData, result: call, error, success: !!call });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate Twilio access token for WebRTC calling
 */
/**
 * Generate lead context for pre-call preparation
 */
export const generateLeadContext = async (req: Request, res: Response) => {
  try {
    const { leadId, mode, messages = [], calls = [] } = req.body;

    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Simple context generation (would use AI in production)
    const context = {
      followUps: [
        "Ask about their timeline for buying/selling",
        "Confirm their budget range",
        "Understand their preferred neighborhoods",
      ],
      talkingPoints: [
        "Current market conditions in their area",
        "Recent sales in their price range",
        "Financing options available",
      ],
      valueProps: [
        "Expert local market knowledge",
        "Proven track record with similar clients",
        "End-to-end support throughout the process",
      ],
      lastContact: messages.length > 0 ? messages[0]?.created_at : null,
      sentiment: "neutral", // Would analyze messages in production
    };

    res.json(context);
  } catch (error) {
    console.error("Error generating lead context:", error);
    res.status(500).json({ error: "Failed to generate lead context" });
  }
};

export const generateAccessToken = async (req: Request, res: Response) => {
  try {
    // For now, we'll use a simple identity. In production, you'd want to use
    // the actual user ID from authentication
    const identity = `user_${Date.now()}`;

    // Create an access token
    const accessToken = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY!,
      process.env.TWILIO_API_SECRET!,
      { identity }
    );

    // Create a Voice grant
    const voiceGrant = new AccessToken.VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_APP_SID!,
      incomingAllow: true,
    });

    // Add the grant to the token
    accessToken.addGrant(voiceGrant);

    console.log(`Generated access token for identity: ${identity}`);

    res.json({
      token: accessToken.toJwt(),
      identity: identity,
    });
  } catch (error) {
    console.error("Error generating access token:", error);
    res.status(500).json({
      error: "Failed to generate access token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Handle Twilio call status callbacks
 */
export const handleCallStatusCallback = async (req: Request, res: Response) => {
  try {
    console.log("📞 Call status callback received:", req.body);

    const {
      CallSid,
      CallStatus,
      Direction,
      From,
      To,
      CallDuration,
      Timestamp,
    } = req.body;

    if (!CallSid) {
      console.error("❌ No CallSid provided in status callback");
      return res.status(400).send("CallSid is required");
    }

    console.log(`📞 Call ${CallSid} status update: ${CallStatus}`);

    // Find the call record by Twilio call SID
    const { data: calls, error: callError } = await supabase
      .from("calls")
      .select("*")
      .eq("twilio_call_sid", CallSid)
      .order("created_at", { ascending: false })
      .limit(1);

    const call = calls && calls.length > 0 ? calls[0] : null;

    if (callError || !call) {
      console.error(`❌ Call not found for SID ${CallSid}:`, callError);

      // If call not found by Twilio SID, try to find by phone number and recent timestamp
      // This handles cases where the call was created but Twilio SID wasn't saved yet
      const { data: recentCalls, error: recentError } = await supabase
        .from("calls")
        .select("*")
        .eq("to_number", req.body.To)
        .eq("status", "queued")
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes
        .order("created_at", { ascending: false })
        .limit(1);

      if (!recentError && recentCalls && recentCalls.length > 0) {
        console.log(
          `📞 Found recent queued call ${recentCalls[0].id} for number ${req.body.To}, updating with SID ${CallSid}`
        );

        // Update the call with the Twilio SID
        const { error: updateError } = await supabase
          .from("calls")
          .update({
            twilio_call_sid: CallSid,
            status: CallStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recentCalls[0].id);

        if (updateError) {
          console.error(
            `❌ Error updating call ${recentCalls[0].id}:`,
            updateError
          );
        } else {
          console.log(
            `✅ Updated call ${recentCalls[0].id} with Twilio SID ${CallSid} and status ${CallStatus}`
          );
        }

        return res.status(200).send("OK");
      }

      // Still return 200 to Twilio to avoid retries
      return res.status(200).send("OK");
    }

    // Prepare update data
    const updateData: any = {
      status: CallStatus,
      updated_at: new Date().toISOString(),
    };

    // Set started_at when call begins
    if (CallStatus === "in-progress" && !call.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    // Set ended_at and duration when call completes
    if (
      ["completed", "busy", "failed", "no-answer", "canceled"].includes(
        CallStatus
      )
    ) {
      updateData.ended_at = new Date().toISOString();

      // Set duration if provided by Twilio
      if (CallDuration) {
        updateData.duration = parseInt(CallDuration);
      }
    }

    // Update call record
    const { error: updateError } = await supabase
      .from("calls")
      .update(updateData)
      .eq("id", call.id);

    if (updateError) {
      console.error(`❌ Error updating call ${call.id}:`, updateError);
    } else {
      console.log(`✅ Call ${call.id} updated with status: ${CallStatus}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error handling call status callback:", error);
    res.status(500).send("Internal server error");
  }
};
