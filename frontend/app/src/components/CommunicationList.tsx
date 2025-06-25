import React, { useState } from "react";
import { MessageRow } from "../../../../backend/models/Message";
import { Call, CallRecording } from "../api/callApi";

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
const formatCallDuration = (duration: number | null): string => {
  if (!duration) return "0:00";

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatCallDateTime = (startedAt: string | null): string => {
  if (!startedAt) return "";

  const date = new Date(startedAt);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );

  const handlePlayRecording = (recordingUrl: string) => {
    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(recordingUrl);
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);

    setAudioElement(audio);
    audio.play();
  };

  const hasRecording = call.recordings && call.recordings.length > 0;
  const recording = hasRecording ? call.recordings![0] : null;

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
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCallStatusColor(
                call.status!
              )}`}
            >
              {call.status}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getCallTypeLabel(call.call_type)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {formatCallDateTime(call.started_at)}
          </span>
        </div>

        {/* Call Details */}
        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
          <span>Duration: {formatCallDuration(call.duration)}</span>
          {call.attempt_number > 1 && (
            <span>Attempt #{call.attempt_number}</span>
          )}
          {call.is_voicemail && (
            <span className="text-orange-600">Voicemail</span>
          )}
        </div>

        {/* AI Summary */}
        {call.ai_summary && (
          <div className="mt-2 p-2 bg-blue-50 rounded-md">
            <p className="text-sm text-gray-700">{call.ai_summary}</p>
          </div>
        )}

        {/* Sentiment Score */}
        {call.sentiment_score !== null && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-xs text-gray-500">Sentiment:</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSentimentColor(
                call.sentiment_score
              )}`}
            >
              {getSentimentLabel(call.sentiment_score)}
            </span>
          </div>
        )}

        {/* Recording Playback */}
        {hasRecording && recording?.recording_url && (
          <div className="mt-3 flex items-center space-x-2">
            <button
              onClick={() => handlePlayRecording(recording.recording_url!)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isPlaying ? (
                <>
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Play Recording
                </>
              )}
            </button>
            <span className="text-xs text-gray-500">
              Duration: {formatCallDuration(recording.duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Message Item Component
const MessageItem: React.FC<{ message: MessageRow }> = ({ message }) => {
  const isFromUser = message.sender === "user";
  const isScheduled = message.delivery_status === "scheduled";
  const isAiGenerated = message.is_ai_generated;

  return (
    <div
      className={`flex ${isFromUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isFromUser
            ? "bg-blue-500 text-white"
            : isScheduled
            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
            : isAiGenerated
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <p className="text-sm">{message.text}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs opacity-75">
            {message.created_at &&
              new Date(message.created_at).toLocaleString()}
          </p>
          {isScheduled && (
            <span className="text-xs font-medium">Scheduled</span>
          )}
          {isAiGenerated && <span className="text-xs font-medium">AI</span>}
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
