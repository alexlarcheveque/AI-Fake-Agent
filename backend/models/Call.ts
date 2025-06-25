import { Tables, TablesInsert, TablesUpdate } from "../database.types.ts";

// Get the Call row type from the database types
export type CallRow = Tables<"calls">;
export type CallInsert = TablesInsert<"calls">;
export type CallUpdate = TablesUpdate<"calls">;

// Call status types
export type CallStatus = 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
export type CallDirection = 'inbound' | 'outbound';
export type CallType = 'new_lead' | 'follow_up' | 'reactivation';

// Helper functions
export function formatCallDuration(duration: number | null): string {
  if (!duration) return "0:00";
  
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatCallDateTime(startedAt: string | null): string {
  if (!startedAt) return "";
  
  const date = new Date(startedAt);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getCallStatusColor(status: CallStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'in-progress':
    case 'ringing':
      return 'text-blue-600 bg-blue-100';
    case 'failed':
    case 'busy':
      return 'text-red-600 bg-red-100';
    case 'no-answer':
      return 'text-yellow-600 bg-yellow-100';
    case 'queued':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getCallTypeLabel(callType: CallType): string {
  switch (callType) {
    case 'new_lead':
      return 'New Lead';
    case 'follow_up':
      return 'Follow Up';
    case 'reactivation':
      return 'Reactivation';
    default:
      return 'Unknown';
  }
}

export function getSentimentLabel(sentimentScore: number | null): string {
  if (sentimentScore === null) return 'Unknown';
  
  if (sentimentScore >= 0.3) return 'Positive';
  if (sentimentScore <= -0.3) return 'Negative';
  return 'Neutral';
}

export function getSentimentColor(sentimentScore: number | null): string {
  if (sentimentScore === null) return 'text-gray-600 bg-gray-100';
  
  if (sentimentScore >= 0.3) return 'text-green-600 bg-green-100';
  if (sentimentScore <= -0.3) return 'text-red-600 bg-red-100';
  return 'text-yellow-600 bg-yellow-100';
} 