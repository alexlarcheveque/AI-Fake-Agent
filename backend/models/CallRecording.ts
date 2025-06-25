import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the CallRecording row type from the database types
export type CallRecordingRow = Tables<"call_recordings">;
export type CallRecordingInsert = TablesInsert<"call_recordings">;
export type CallRecordingUpdate = TablesUpdate<"call_recordings">;

// Helper functions
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 B";

  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

export function formatRecordingDuration(duration: number | null): string {
  if (!duration) return "0:00";

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function generateStoragePath(callId: number, userId: string): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `call-recordings/${userId}/${timestamp}/call-${callId}.mp3`;
}

export function isRecordingAvailable(recording: CallRecordingRow): boolean {
  return !!(recording.recording_url || recording.storage_path);
}

export function getRecordingUrl(recording: CallRecordingRow): string | null {
  return recording.recording_url || null;
}
