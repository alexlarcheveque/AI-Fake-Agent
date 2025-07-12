import { Request, Response } from "express";
import twilio from "twilio";
import { realtimeVoiceService } from "../services/realtimeVoiceService.ts";
import { calculateLeadScores } from "../services/leadScoringService.ts";
import { createClient } from "@supabase/supabase-js";
import { handleCallCompletion } from "../services/callService.ts";
import { normalizePhoneToNumeric } from "../utils/phoneUtils.js";
import fs from "fs";
import path from "path";
const { VoiceResponse } = twilio.twiml;

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

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
    // For true outbound calls, we should have leadId or mode parameters from our system
    // For inbound calls, To will be our Twilio number and From will be the caller
    const isOutbound =
      !!(leadId || mode) && To !== process.env.TWILIO_PHONE_NUMBER;
    const direction = isOutbound ? "outbound" : "inbound";
    const fromNumber = isOutbound ? process.env.TWILIO_PHONE_NUMBER : From;
    const toNumber = isOutbound ? To : To;

    let call: any = null;
    let foundLeadId = leadId ? parseInt(leadId) : null;

    // For inbound calls, try to find the lead by phone number
    if (To === process.env.TWILIO_PHONE_NUMBER && From && !foundLeadId) {
      console.log(`🔍 Looking up lead for inbound call from ${From}`);
      try {
        // Normalize phone number to numeric format for lookup
        const normalizedPhone = normalizePhoneToNumeric(From);
        console.log(`📞 Normalized phone ${From} to ${normalizedPhone}`);

        // Try to find a lead with the normalized phone number
        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select("*")
          .eq("phone_number", normalizedPhone)
          .single();

        if (!leadError && leadData) {
          foundLeadId = leadData.id;
          console.log(
            `✅ Found lead ${foundLeadId} (${leadData.name}) for inbound call from ${From} (normalized: ${normalizedPhone})`
          );
        } else {
          console.log(
            `⚠️ No lead found for inbound call from ${From} (normalized: ${normalizedPhone})`
          );
        }
      } catch (error) {
        console.error(`❌ Error looking up lead for ${From}:`, error);
      }
    }

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
        lead_id: foundLeadId,
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
  const toNumber = req.body.To || req.query.To;
  const mode = req.body.mode || req.query.mode; // Get the call mode (ai, manual, first-call, voicemail)
  const leadId = req.body.leadId || req.query.leadId;
  const fromNumber = req.body.From || req.query.From; // For inbound calls
  const answeredBy = req.body.AnsweredBy || req.query.AnsweredBy; // Twilio's machine detection result

  // Determine if this is truly an outbound call
  // Inbound: someone calls our Twilio number (To = our number)
  // Outbound: we call someone (To = their number)
  const isOutbound = toNumber !== process.env.TWILIO_PHONE_NUMBER;

  console.log(
    `🔧 Generating TwiML - Mode: ${mode}, To: ${toNumber}, From: ${fromNumber}, CallId: ${callId}, LeadId: ${leadId}, AnsweredBy: ${answeredBy}, IsOutbound: ${isOutbound}`
  );

  // Use ngrok URL for WebSocket connection so Twilio can reach it
  const ngrokUrl =
    process.env.NGROK_URL || "https://wanted-husky-scarcely.ngrok-free.app";
  const websocketUrl =
    ngrokUrl.replace("https://", "wss://") + "/twilio-websocket";

  console.log(`🔗 WEBSOCKET URL DEBUG: ${websocketUrl}`);

  if (isOutbound) {
    // Outbound call
    if (mode === "manual") {
      // For manual calls, dial the lead directly and connect the WebRTC user
      console.log(`📞 Manual call: Dialing ${toNumber} directly`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}" record="true" recordingStatusCallback="${ngrokUrl}/api/recordings/callback" recordingStatusCallbackMethod="POST">
    <Number>${toNumber}</Number>
  </Dial>
</Response>`;
    } else if (
      answeredBy &&
      (answeredBy.includes("machine") || answeredBy === "fax")
    ) {
      // POSSIBLE VOICEMAIL DETECTED: Silent listen for human speech first
      // If human speaks within 3 seconds, connect to AI. Otherwise hang up silently.
      console.log(
        `🤖 Possible voicemail detected (${answeredBy}): Starting silent detection for human speech`
      );
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather timeout="5" speechTimeout="1" action="${ngrokUrl}/api/calls/voicemail-detection?callId=${callId}&amp;leadId=${leadId}">
  </Gather>
  <Hangup/>
</Response>`;
    } else {
      // For AI calls with human answer, connect to AI WebSocket stream
      console.log(
        `🤖 AI call: Connecting to AI stream for ${toNumber} (mode: ${mode}, answeredBy: ${answeredBy})`
      );
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId || "unknown"}" />
      <Parameter name="leadPhone" value="${toNumber}" />
      <Parameter name="leadId" value="${leadId || "unknown"}" />
      <Parameter name="isOutbound" value="true" />
      <Parameter name="mode" value="${mode}" />
    </Stream>
  </Connect>
</Response>`;
    }
  } else {
    // Inbound call - connect directly to AI stream with proactive greeting
    console.log(`📞 Inbound call: Connecting to AI stream from ${fromNumber}`);
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId || "unknown"}" />
      <Parameter name="leadPhone" value="${fromNumber}" />
      <Parameter name="leadId" value="${leadId || "unknown"}" />
      <Parameter name="isOutbound" value="false" />
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
  let callMode: string = "ai";

  // Handle WebSocket messages
  ws.on("message", async (message: string) => {
    try {
      const data = JSON.parse(message);

      // Extract call parameters from Twilio stream start event
      if (data.event === "start") {
        console.log(
          `🔍 WEBSOCKET DEBUG: Received start event:`,
          JSON.stringify(data.start, null, 2)
        );

        const parameters = data.start.customParameters || {};
        callId = parameters.callId || "unknown";
        leadId = parseInt(parameters.leadId) || 0;
        callMode = parameters.mode || "ai";
        const possibleVoicemail = parameters.possibleVoicemail === "true";
        const humanDetected = parameters.humanDetected === "true";

        console.log(
          `🚀 WEBSOCKET: Stream started for call ${callId} with mode: ${callMode}, leadId: ${leadId}${
            possibleVoicemail ? ", possibleVoicemail: true" : ""
          }${humanDetected ? ", humanDetected: true" : ""}`
        );

        // Look up call record to get lead information
        if (callId !== "unknown") {
          const { data: call, error } = await supabase
            .from("calls")
            .select("id, lead_id, from_number")
            .eq("id", callId)
            .single();

          if (!error && call) {
            leadId = call.lead_id || leadId;

            // If no lead_id, try to find lead by phone number
            if (!leadId && call.from_number) {
              const { data: lead } = await supabase
                .from("leads")
                .select("id, name, phone_number")
                .eq("phone_number", call.from_number)
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
                .select("id, name, phone_number, email")
                .eq("id", leadId)
                .single();

              if (lead) {
                leadData = lead;
              }
            }
          }
        }

        // Also try to find lead by leadPhone parameter (for inbound calls)
        if (!leadId && parameters.leadPhone) {
          console.log(`🔍 Looking up lead by phone: ${parameters.leadPhone}`);

          // Normalize phone number to numeric format for lookup
          const normalizedPhone = normalizePhoneToNumeric(parameters.leadPhone);
          console.log(
            `📞 Normalized phone ${parameters.leadPhone} to ${normalizedPhone}`
          );

          const { data: lead } = await supabase
            .from("leads")
            .select("id, name, phone_number, email, lead_type, context")
            .eq("phone_number", normalizedPhone)
            .single();

          if (lead) {
            leadId = lead.id;
            leadData = lead;
            console.log(
              `✅ Found lead ${leadId} (${lead.name}) for phone ${parameters.leadPhone} (normalized: ${normalizedPhone})`
            );
          } else {
            console.log(
              `⚠️ No lead found for phone ${parameters.leadPhone} (normalized: ${normalizedPhone})`
            );
          }
        }

        console.log(
          `Starting Realtime voice call for lead ${leadId} (${
            leadData?.name || "Unknown"
          }) with mode: ${callMode}${
            possibleVoicemail ? ", possible voicemail detected" : ""
          }${humanDetected ? ", human speech detected" : ""}`
        );

        // Start the Realtime voice service with stream info
        await realtimeVoiceService.handleWebSocketConnection(ws, {
          callId,
          leadId,
          leadName: leadData?.name,
          leadPhone: leadData?.phone_number,
          streamSid: data.start.streamSid,
          initialStreamData: data.start,
          callMode: callMode, // Pass the call mode
          possibleVoicemail: possibleVoicemail, // Pass the possible voicemail flag
          humanDetected: humanDetected, // Pass the human detected flag
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
 * Initiate an AI-powered call to a lead
 */
export const initiateAICall = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      const message = "Lead ID is required";
      console.error(`❌ ${message}`);
      if (res) return res.status(400).json({ error: message });
      return;
    }

    console.log(`📞 Initiating AI call for lead ${leadId}`);

    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      const message = `Lead ${leadId} not found`;
      console.error(`❌ ${message}:`, leadError);
      if (res) return res.status(404).json({ error: message });
      return;
    }

    if (!lead.phone_number) {
      const message = `Lead ${leadId} has no phone number`;
      console.error(`❌ ${message}`);
      if (res) return res.status(400).json({ error: message });
      return;
    }

    if (!lead.is_ai_enabled) {
      const message = `Lead ${leadId} does not have AI calling enabled`;
      console.error(`❌ ${message}`);
      if (res) return res.status(400).json({ error: message });
      return;
    }

    // Create a new call record for this AI call
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

    console.log("Creating new AI call with data:", callData);

    // Create call record
    const { data: callRecord, error: callError } = await supabase
      .from("calls")
      .insert(callData)
      .select()
      .single();

    if (callError || !callRecord) {
      const message = `Failed to create call record for lead ${leadId}`;
      console.error(`❌ ${message}:`, callError);
      if (res) return res.status(500).json({ error: message });
      return;
    }

    console.log(
      `✅ Created call record ${callRecord.id} for AI call to lead ${leadId}`
    );

    const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL;

    if (!baseUrl) {
      const message =
        "NGROK_URL or BACKEND_URL environment variable is required";
      console.error(`❌ ${message}`);
      if (res) return res.status(500).json({ error: message });
      return;
    }

    // Update call status to 'ringing'
    await supabase
      .from("calls")
      .update({ status: "ringing", started_at: new Date().toISOString() })
      .eq("id", callRecord.id);

    // Create the call using Twilio API with machine detection
    const call = await twilioClient.calls.create({
      to: lead.phone_number.toString(),
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${baseUrl}/api/voice/incoming?leadId=${leadId}&mode=ai`,
      method: "POST",
      statusCallback: `${baseUrl}/api/voice/status-callback`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      machineDetection: "Enable",
      record: true,
      recordingStatusCallback: `${baseUrl}/api/recordings/callback`,
      recordingStatusCallbackMethod: "POST",
    });

    // Update call record with Twilio SID
    await supabase
      .from("calls")
      .update({ twilio_call_sid: call.sid })
      .eq("id", callRecord.id);

    console.log(
      `✅ Call initiated successfully for lead ${leadId}: ${call.sid}`
    );

    if (res) {
      return res.status(200).json({
        success: true,
        message: `Call initiated for lead ${leadId}`,
        callSid: call.sid,
      });
    }
  } catch (error) {
    const message = `Failed to initiate call: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${message}`, error);

    if (res) {
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
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
 * Get all calls for the current user
 */
export const getCallsForUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // First, get all leads for this user
    const { data: userLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, user_uuid")
      .eq("user_uuid", userId);

    if (leadsError) {
      console.error("Error fetching user leads:", leadsError);
      return res.status(500).json({ error: "Failed to fetch user leads" });
    }

    if (!userLeads || userLeads.length === 0) {
      return res.json([]);
    }

    const leadIds = userLeads.map((lead) => lead.id);

    // Now get calls for those leads
    let query = supabase
      .from("calls")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    // Add date filtering if provided
    if (startDate && endDate) {
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error("Error fetching calls for user:", error);
      return res.status(500).json({ error: "Failed to fetch calls" });
    }

    // Add lead information to each call
    const callsWithLeads =
      calls?.map((call) => ({
        ...call,
        leads: userLeads.find((lead) => lead.id === call.lead_id),
      })) || [];

    res.json(callsWithLeads);
  } catch (error) {
    console.error("Error in getCallsForUser:", error);
    res.status(500).json({ error: "Internal server error" });
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
      AnsweredBy, // Twilio can detect if answered by human or machine
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
      return res.status(404).send("Call not found");
    }

    console.log(`📞 Found call record ${call.id} for SID ${CallSid}`);

    // Update call record with current status
    const updates: any = {
      status: CallStatus,
      updated_at: new Date().toISOString(),
    };

    // Add duration if call completed
    if (CallDuration) {
      updates.duration = parseInt(CallDuration);
    }

    // Set start/end times based on status
    if (CallStatus === "in-progress" && !call.started_at) {
      updates.started_at = new Date().toISOString();
    } else if (
      ["completed", "failed", "no-answer", "busy", "canceled"].includes(
        CallStatus
      )
    ) {
      if (!call.ended_at) {
        updates.ended_at = new Date().toISOString();
      }

      // Handle call completion logic for new lead calls
      if (call.call_type === "new_lead") {
        const isVoicemail = detectVoicemail(
          CallStatus,
          CallDuration,
          AnsweredBy
        );

        console.log(
          `📞 Call ${call.id} completed with status: ${CallStatus}, duration: ${CallDuration}, answeredBy: ${AnsweredBy}, isVoicemail: ${isVoicemail}`
        );

        // Trigger our call completion handler which manages the fallback logic
        await handleCallCompletion(
          call.id,
          CallStatus === "completed" ? "completed" : CallStatus,
          isVoicemail
        );
      }
    }

    // Update the call record
    const { error: updateError } = await supabase
      .from("calls")
      .update(updates)
      .eq("id", call.id);

    if (updateError) {
      console.error(`❌ Error updating call ${call.id}:`, updateError);
      return res.status(500).send("Error updating call");
    }

    console.log(`✅ Updated call ${call.id} with status ${CallStatus}`);

    // Dispatch call completion event for frontend updates
    if (["completed", "failed", "no-answer", "busy"].includes(CallStatus)) {
      console.log(`📢 Call ${call.id} completed with status: ${CallStatus}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error in call status callback:", error);
    res.status(500).send("Internal server error");
  }
};

/**
 * Detect if a call went to voicemail based on multiple factors
 */
function detectVoicemail(
  callStatus: string,
  callDuration: string | undefined,
  answeredBy: string | undefined
): boolean {
  // If Twilio explicitly detected machine/voicemail or fax
  if (
    answeredBy === "machine_start" ||
    answeredBy === "machine_end_beep" ||
    answeredBy === "machine_end_silence" ||
    answeredBy === "machine_end_other" ||
    answeredBy === "fax"
  ) {
    console.log(`🤖 Twilio detected voicemail/machine: ${answeredBy}`);
    return true;
  }

  // If call was answered but very short duration (likely voicemail)
  if (callStatus === "completed" && callDuration) {
    const duration = parseInt(callDuration);

    // Very short calls (less than 8 seconds) are usually voicemail greetings
    if (duration < 8) {
      console.log(`📞 Short call duration (${duration}s) suggests voicemail`);
      return true;
    }

    // Calls between 8-20 seconds could be voicemail if no human interaction detected
    // This is a heuristic - you might want to adjust based on your experience
    if (duration < 20 && !answeredBy) {
      console.log(
        `📞 Medium-short call duration (${duration}s) with no answeredBy suggests voicemail`
      );
      return true;
    }
  }

  // If explicitly human-answered, definitely not voicemail
  if (answeredBy === "human") {
    console.log(`👤 Twilio detected human answered`);
    return false;
  }

  // Default: if call completed but we're not sure, assume human answered
  // Better to err on the side of not making a second call
  return false;
}

/**
 * Handle voicemail detection response - if human speech detected, connect to AI
 */
export const handleVoicemailDetection = async (req: Request, res: Response) => {
  try {
    const { callId, leadId } = req.query;
    const speechResult = req.body.SpeechResult || "";
    const digits = req.body.Digits || "";

    console.log(
      `🎙️ Voicemail detection result for call ${callId}: speechResult="${speechResult}", digits="${digits}"`
    );

    // If we detected speech or digits, it's likely a human - connect to AI
    if (speechResult.trim().length > 0 || digits.length > 0) {
      console.log(
        `✅ Human speech detected - connecting to AI for call ${callId}`
      );

      const ngrokUrl =
        process.env.NGROK_URL || "https://wanted-husky-scarcely.ngrok-free.app";
      const websocketUrl = `wss://${ngrokUrl.replace(
        "https://",
        ""
      )}/twilio-websocket`;

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId || "unknown"}" />
      <Parameter name="leadId" value="${leadId || "unknown"}" />
      <Parameter name="isOutbound" value="true" />
      <Parameter name="mode" value="ai" />
      <Parameter name="humanDetected" value="true" />
    </Stream>
  </Connect>
</Response>`;

      res.type("text/xml");
      return res.send(twiml);
    } else {
      // No speech detected - likely actual voicemail, hang up silently
      console.log(
        `🤖 No speech detected - hanging up (likely actual voicemail) for call ${callId}`
      );

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

      res.type("text/xml");
      return res.send(twiml);
    }
  } catch (error) {
    console.error("Error handling voicemail detection:", error);

    // On error, hang up safely
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

    res.type("text/xml");
    return res.send(twiml);
  }
};

/**
 * Get call statistics for the current user
 */
export const getCallStats = async (req: Request, res: Response) => {
  try {
    // TODO: Add proper user authentication and filtering
    // For now, get stats for all calls

    const { data: calls, error } = await supabase
      .from("calls")
      .select("status")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching call stats:", error);
      throw error;
    }

    const totalCalls = calls?.length || 0;
    const successfulCalls =
      calls?.filter((call) => call.status === "completed").length || 0;
    const failedCalls =
      calls?.filter((call) =>
        ["failed", "busy", "no-answer", "canceled"].includes(call.status)
      ).length || 0;
    const successRate =
      totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    const stats = {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate,
    };

    console.log("📊 Call stats generated:", stats);
    res.json(stats);
  } catch (error) {
    console.error("Error getting call stats:", error);
    res.status(500).json({
      error: "Failed to get call statistics",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get available voices for voice calling
 */
export const getAvailableVoices = async (req: Request, res: Response) => {
  try {
    // Since we're using OpenAI Realtime API with hardcoded "alloy" voice,
    // we'll return a simple list with just the alloy option
    const voices = [
      {
        id: "alloy",
        name: "Alloy (OpenAI)",
        gender: "neutral",
      },
    ];

    console.log("🎤 Available voices returned:", voices);
    res.json(voices);
  } catch (error) {
    console.error("Error getting available voices:", error);
    res.status(500).json({
      error: "Failed to get available voices",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Test a voice by playing a sample
 */
export const testVoice = async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.body;

    if (!voiceId) {
      return res.status(400).json({
        error: "Voice ID is required",
      });
    }

    // Since we only support "alloy" voice, validate it
    if (voiceId !== "alloy") {
      return res.status(400).json({
        error: "Only 'alloy' voice is currently supported",
      });
    }

    // For now, return a success message without actually playing audio
    // In a real implementation, this might trigger a test call or audio preview
    const result = {
      success: true,
      message: `Voice test successful for ${voiceId}. This voice will be used for AI calls.`,
    };

    console.log(`🎤 Voice test completed for: ${voiceId}`);
    res.json(result);
  } catch (error) {
    console.error("Error testing voice:", error);
    res.status(500).json({
      error: "Failed to test voice",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Removed handleVoicemailCall function - no longer leaving voicemails
