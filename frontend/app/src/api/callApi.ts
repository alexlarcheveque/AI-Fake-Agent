import apiClient from "./apiClient";

export interface Call {
  id: number;
  lead_id: number;
  twilio_call_sid: string | null;
  direction: "inbound" | "outbound";
  status:
    | "queued"
    | "ringing"
    | "in-progress"
    | "initiated"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"
    | "canceled";
  duration: number | null;
  from_number: string | null;
  to_number: string | null;
  started_at: string | null;
  ended_at: string | null;
  ai_summary: string | null;
  sentiment_score: number | null;
  call_type: string | null;
  call_mode?: "manual" | "ai" | null;
  attempt_number: number | null;
  is_voicemail: boolean;
  created_at: string;
  updated_at: string | null;
  lead_interest_level: string | null;
  recording_url?: string | null;
  recordings?: CallRecording[];
  // New structured analysis fields
  action_items?: string[] | null;
  customer_interest_level?: "high" | "medium" | "low" | null;
  commitment_details?: string | null;
}

export interface CallRecording {
  id: number;
  call_id: number;
  recording_url: string | null;
  recording_sid: string | null;
  duration: number | null;
  file_size: number | null;
  storage_path: string | null;
  transcription: string | null;
  created_at: string;
  updated_at: string | null;
}

// All calls now use WebRTC + OpenAI Realtime AI

/**
 * Initiate a direct AI call to a lead (no WebRTC, AI talks directly to lead)
 */
export const initiateAICall = async (leadId: number) => {
  try {
    console.log(`CallAPI: Initiating AI call for lead ${leadId}`);
    const response = await apiClient.post("/voice/initiate-ai", { leadId });
    console.log(`CallAPI: Received AI call response:`, response);
    return response;
  } catch (error: any) {
    console.error(`CallAPI: Error initiating AI call:`, error);

    // If it's an API error with response data, return that
    if (error.response && error.response.data) {
      console.log(
        `CallAPI: Returning error response data:`,
        error.response.data
      );
      return error.response.data;
    }

    // For network errors or other issues, throw the error
    console.log(`CallAPI: Throwing error:`, error.message);
    throw error;
  }
};

/**
 * Initiate a manual call to a lead using WebRTC
 */
export const initiateCall = async (leadId: number) => {
  try {
    console.log(`CallAPI: Initiating manual call for lead ${leadId}`);
    const response = await apiClient.post("/voice/initiate", { leadId });
    console.log(`CallAPI: Received manual call response:`, response);
    return response;
  } catch (error: any) {
    console.error(`CallAPI: Error initiating manual call:`, error);

    // If it's an API error with response data, return that
    if (error.response && error.response.data) {
      console.log(
        `CallAPI: Returning error response data:`,
        error.response.data
      );
      return error.response.data;
    }

    // For network errors or other issues, throw the error
    console.log(`CallAPI: Throwing error:`, error.message);
    throw error;
  }
};

/**
 * Get calls for a specific lead
 */
export const getCallsForLead = async (leadId: number): Promise<Call[]> => {
  try {
    console.log(`🔥 CallAPI: Making request to /voice/lead/${leadId}`);
    const data = await apiClient.get(`/voice/lead/${leadId}`);

    console.log(`🔥 CallAPI: Raw response data:`, data);
    console.log(`🔥 CallAPI: Response data type:`, typeof data);
    console.log(
      `🔥 CallAPI: Response data length:`,
      Array.isArray(data) ? data.length : "not an array"
    );

    if (Array.isArray(data)) {
      console.log(`🔥 CallAPI: First call item:`, data[0]);
      console.log(
        `🔥 CallAPI: Sample call fields:`,
        data[0] ? Object.keys(data[0]) : "no data"
      );
    }

    return data;
  } catch (error: any) {
    console.error(`🔥 CallAPI: Error in getCallsForLead:`, error);
    console.error(`🔥 CallAPI: Error response:`, error.response);
    console.error(`🔥 CallAPI: Error response data:`, error.response?.data);
    throw error;
  }
};

/**
 * Get call recording for a specific call
 */
export const getCallRecording = async (
  callId: number
): Promise<CallRecording | null> => {
  try {
    const data = await apiClient.get(`/recordings/call/${callId}`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // No recording found
    }
    throw error;
  }
};

/**
 * Get all recordings for a lead
 */
export const getLeadRecordings = async (
  leadId: number
): Promise<CallRecording[]> => {
  const data = await apiClient.get(`/recordings/lead/${leadId}`);
  return data;
};

/**
 * Get real-time transcript for an active call
 */
export const getCallTranscript = async (
  callId: number
): Promise<{ callId: string; transcript: string }> => {
  const data = await apiClient.get(`/recordings/transcript/${callId}`);
  return data;
};

export default {
  initiateCall,
  getCallsForLead,
  getCallRecording,
  getLeadRecordings,
  getCallTranscript,
};
