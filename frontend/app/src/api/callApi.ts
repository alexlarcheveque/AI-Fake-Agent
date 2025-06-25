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
  call_type: "new_lead" | "follow_up" | "reactivation";
  attempt_number: number;
  is_voicemail: boolean | null;
  created_at: string;
  updated_at: string | null;
  recordings?: CallRecording[];
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

export interface CallingStats {
  quarterTotal: number;
  quarterCompleted: number;
  todayTotal: number;
  todayCompleted: number;
  callTypes: {
    new_lead: number;
    follow_up: number;
    reactivation: number;
  };
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
  };
}

// Initiate a manual call to a lead
export const initiateCall = async (
  leadId: number
): Promise<{ message: string; callId: number }> => {
  const data = await apiClient.post(`/calls/leads/${leadId}/call`);
  return data;
};

// Get all calls for a specific lead
export const getCallsForLead = async (leadId: number): Promise<Call[]> => {
  const response = await apiClient.get(`/calls/leads/${leadId}`);
  return response.data;
};

// Get calling statistics for the current user
export const getCallingStats = async (): Promise<CallingStats> => {
  const response = await apiClient.get("/calls/stats");
  return response.data;
};

// Get available ElevenLabs voices
export const getAvailableVoices = async (): Promise<Voice[]> => {
  const response = await apiClient.get("/calls/voices");
  return response.data;
};

// Test a voice with sample text
export const testVoice = async (
  voiceId: string,
  sampleText?: string
): Promise<{ success: boolean; error?: string }> => {
  const response = await apiClient.post("/calls/voices/test", {
    voiceId,
    sampleText:
      sampleText || "Hello, this is a test of the voice calling system.",
  });
  return response.data;
};

// Get a specific call recording
export const getCallRecording = async (
  recordingId: number
): Promise<CallRecording> => {
  const response = await apiClient.get(`/calls/recordings/${recordingId}`);
  return response.data;
};

export default {
  initiateCall,
  getCallsForLead,
  getCallingStats,
  getAvailableVoices,
  testVoice,
  getCallRecording,
};
