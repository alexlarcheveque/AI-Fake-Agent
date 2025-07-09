import React, { useState, useEffect } from "react";
import { MessageRow } from "../../../../backend/models/Message";
import { Call, CallRecording, getCallRecording } from "../api/callApi";
import { CallRecordingPlayer } from "./CallRecordingPlayer";
import { User, Bot } from "lucide-react";

interface CommunicationItem {
  id: string;
  type: "message" | "call";
  timestamp: string;
  data: MessageRow | Call;
}

interface CommunicationListProps {
  items: CommunicationItem[];
}

// Helper functions for call display
const formatCallDuration = (duration: number | null, call?: Call): string => {
  if (!duration) {
    // For completed calls without duration, show a placeholder
    if (call && call.status === "completed") {
      return "Connected";
    }
    return "0:00";
  }

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatCallDateTime = (
  startedAt: string | null,
  recording?: CallRecording | null
): string => {
  // Try to extract actual call time from transcript and use correct date from database
  if (recording?.transcription && startedAt) {
    const timestampMatch = recording.transcription.match(
      /\[(\d{1,2}:\d{2}:\d{2}\s*[AP]M)\]/
    );
    if (timestampMatch) {
      const timeStr = timestampMatch[1];
      // Parse the UTC date from database and convert to local
      const dbDate = new Date(startedAt + (startedAt.includes("Z") ? "" : "Z")); // Ensure UTC parsing
      const [time, period] = timeStr.split(/\s+/);
      const [hours, minutes, seconds] = time.split(":").map(Number);

      // Convert to 24-hour format
      let hour24 = hours;
      if (period === "PM" && hours !== 12) hour24 += 12;
      if (period === "AM" && hours === 12) hour24 = 0;

      // Create local date with database date but transcript time (in local timezone)
      const correctedDate = new Date(
        dbDate.getFullYear(),
        dbDate.getMonth(),
        dbDate.getDate(),
        hour24,
        minutes,
        seconds
      );

      return correctedDate.toLocaleString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    }
  }

  // Fallback to database timestamp - properly convert from UTC
  if (!startedAt) return "";

  // Ensure we're parsing as UTC and converting to local time
  const utcDate = new Date(startedAt + (startedAt.includes("Z") ? "" : "Z"));
  return utcDate.toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
};

const getCallStatusColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-100";
    case "in-progress":
    case "ringing":
      return "text-blue-600 bg-blue-100";
    case "failed":
    case "busy":
      return "text-red-600 bg-red-100";
    case "no-answer":
      return "text-yellow-600 bg-yellow-100";
    case "queued":
      return "text-gray-600 bg-gray-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const getCallTypeLabel = (callType: string): string => {
  switch (callType) {
    case "new_lead":
      return "New Lead";
    case "follow_up":
      return "Follow Up";
    case "reactivation":
      return "Reactivation";
    default:
      return "Unknown";
  }
};

const getSentimentLabel = (sentimentScore: number | null): string => {
  if (sentimentScore === null) return "Unknown";

  if (sentimentScore >= 0.3) return "Positive";
  if (sentimentScore <= -0.3) return "Negative";
  return "Neutral";
};

const getSentimentColor = (sentimentScore: number | null): string => {
  if (sentimentScore === null) return "text-gray-600 bg-gray-100";

  if (sentimentScore >= 0.3) return "text-green-600 bg-green-100";
  if (sentimentScore <= -0.3) return "text-red-600 bg-red-100";
  return "text-yellow-600 bg-yellow-100";
};

// Call Item Component
const CallItem: React.FC<{ call: Call }> = ({ call }) => {
  const [recording, setRecording] = useState<CallRecording | null>(null);
  const [loadingRecording, setLoadingRecording] = useState(false);

  useEffect(() => {
    // Try to load recording data for this call
    const fetchRecording = async () => {
      if (call.status === "completed" && !recording && !loadingRecording) {
        setLoadingRecording(true);
        try {
          console.log(`🔍 Fetching recording for call ${call.id}...`);
          const callRecording = await getCallRecording(call.id);
          console.log(
            `📝 Recording result for call ${call.id}:`,
            callRecording
          );
          if (callRecording) {
            setRecording(callRecording);
          }
        } catch (error) {
          console.error(
            `❌ Error fetching recording for call ${call.id}:`,
            error
          );
        } finally {
          setLoadingRecording(false);
        }
      }
    };

    fetchRecording();
  }, [call.id, call.status]);

  // Remove old recording logic - now handled by state

  return (
    <div className="flex items-start space-x-3 p-4 hover:bg-gray-50">
      {/* Call Icon */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        </div>
      </div>

      {/* Call Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900">
              {call.direction === "outbound" ? "Outbound Call" : "Inbound Call"}
            </h4>
            {/* Call Mode Indicator */}
            {call.call_mode && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-100">
                {call.call_mode === "manual" ? (
                  <>
                    <User className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">
                      Manual
                    </span>
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">
                      AI
                    </span>
                  </>
                )}
              </div>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCallStatusColor(
                call.status!
              )}`}
            >
              {call.status === "completed" ? "✅ Completed" : call.status}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {formatCallDateTime(call.started_at, recording)}
          </span>
        </div>

        {/* Call Status Details */}
        {(call.status === "no-answer" || call.status === "busy") && (
          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
            {call.status === "no-answer" && (
              <span className="text-orange-600">No Answer</span>
            )}
            {call.status === "busy" && (
              <span className="text-orange-600">Busy</span>
            )}
          </div>
        )}

        {/* Recording and Highlights - Show for completed calls */}
        {call.status === "completed" && (
          <div className="mt-3 space-y-2">
            {/* Full Recording Player - Show if we have recording OR transcript */}
            {(recording?.recording_url || recording?.transcription) && (
              <div className="mt-2">
                <CallRecordingPlayer
                  recording={recording}
                  call={call}
                  callSummary={
                    call.ai_summary ||
                    "Recording analysis could not be processed."
                  }
                  sentimentScore={call.sentiment_score || undefined}
                  showTranscript={true}
                />
              </div>
            )}

            {/* Loading State */}
            {loadingRecording && (
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Loading recording...</p>
              </div>
            )}

            {/* No Recording Available */}
            {!recording && !loadingRecording && (
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">
                  No recording or transcript available for this call.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Message Item Component
const MessageItem: React.FC<{ message: MessageRow }> = ({ message }) => {
  const isFromAgent = message.sender === "agent";
  const isFromLead = message.sender === "lead";
  const isScheduled = message.delivery_status === "scheduled";
  const isAiGenerated = message.is_ai_generated;
  const isFailed =
    message.delivery_status === "failed" ||
    message.delivery_status === "undelivered";

  return (
    <div
      className={`flex ${isFromAgent ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isFromAgent
            ? isScheduled
              ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
              : isFailed
              ? "bg-red-100 text-red-800 border border-red-200"
              : isAiGenerated
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <p className="text-sm">{message.text}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs opacity-75">
            {message.created_at &&
              new Date(message.created_at).toLocaleString("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
          </p>
          {isScheduled && (
            <span className="text-xs font-medium">Scheduled</span>
          )}
          {isFailed && (
            <span className="text-xs font-medium text-red-600">
              Message failed
            </span>
          )}
          {isAiGenerated && !isFailed && !isScheduled && (
            <span className="text-xs font-medium">AI</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Communication List Component
const CommunicationList: React.FC<CommunicationListProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="mt-2 text-sm">No messages or calls yet</p>
          <p className="text-xs text-gray-400">
            Start a conversation or make a call!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1">
      {items.map((item) => (
        <div key={item.id}>
          {item.type === "call" ? (
            <CallItem call={item.data as Call} />
          ) : (
            <MessageItem message={item.data as MessageRow} />
          )}
        </div>
      ))}
    </div>
  );
};

export default CommunicationList;
