import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  FileText,
  MessageSquare,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CallRecording, Call } from "../api/callApi";

interface CallRecordingPlayerProps {
  recording: CallRecording;
  call?: Call; // Full call object with structured analysis
  callSummary?: string; // Fallback for legacy calls
  sentimentScore?: number;
  showTranscript?: boolean;
  compact?: boolean;
}

// Helper function to get structured call analysis data
const getCallAnalysisData = (call?: Call, fallbackSummary?: string) => {
  // If we have a call object with structured data, use that
  if (call) {
    console.log("📋 Using structured call analysis from database:", {
      summary: call.ai_summary,
      actionItems: call.action_items,
      interestLevel: call.customer_interest_level,
      commitmentDetails: call.commitment_details,
    });

    return {
      summary: call.ai_summary || "",
      actionItems: Array.isArray(call.action_items) ? call.action_items : [],
      interestLevel: call.customer_interest_level || "medium",
      commitmentDetails: call.commitment_details || "",
    };
  }

  // Fallback to parsing the summary text (for legacy calls)
  if (!fallbackSummary) {
    return {
      summary: "",
      actionItems: [],
      interestLevel: "medium" as const,
      commitmentDetails: "",
    };
  }

  console.log("📋 Parsing legacy call summary:", fallbackSummary);

  // Parse text format with emoji headers (legacy support)
  const lines = fallbackSummary.split("\n");
  let currentSection = "summary";
  const result = {
    summary: "",
    actionItems: [] as string[],
    interestLevel: "medium" as const,
    commitmentDetails: "",
  };

  const summaryLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.includes("✅ Action Items")) {
      currentSection = "actionItems";
      continue;
    } else if (trimmed.includes("🎯 Next Steps")) {
      currentSection = "actionItems"; // Combine next steps with action items
      continue;
    } else if (currentSection !== "summary" && trimmed === "") {
      continue;
    }

    if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      const item = trimmed.substring(1).trim();
      if (currentSection === "actionItems") {
        result.actionItems.push(item);
      } else if (currentSection === "summary") {
        summaryLines.push(item);
      }
    } else if (trimmed && currentSection === "summary") {
      summaryLines.push(trimmed);
    }
  }

  // Clean up summary
  if (result.actionItems.length > 0) {
    const summaryText = fallbackSummary.split(
      /\n\n✅ Action Items|🎯 Next Steps/
    )[0];
    result.summary = summaryText.trim();
  } else {
    result.summary = summaryLines.join("\n").trim();
  }

  return result;
};

export const CallRecordingPlayer: React.FC<CallRecordingPlayerProps> = ({
  recording,
  call,
  callSummary,
  sentimentScore,
  showTranscript = true,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration || 0);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [highlights, setHighlights] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get structured call analysis data
  const analysisData = getCallAnalysisData(call, callSummary);

  console.log("📋 Call analysis data:", analysisData);

  // Parse summary if it's a JSON array string
  const parseSummary = (summary: string) => {
    if (!summary) return "";

    // Check if summary is a JSON array string
    try {
      if (summary.startsWith('["') && summary.endsWith('"]')) {
        const parsed = JSON.parse(summary);
        if (Array.isArray(parsed)) {
          return parsed.join("\n");
        }
      }
    } catch (e) {
      // If parsing fails, return the original string
    }

    return summary;
  };

  // Create safe analysis data with parsed summary
  const safeAnalysisData = {
    summary: parseSummary(analysisData?.summary || ""),
    actionItems: Array.isArray(analysisData?.actionItems)
      ? analysisData.actionItems
      : [],
    interestLevel: analysisData?.interestLevel || "medium",
    commitmentDetails: analysisData?.commitmentDetails || "",
  };

  useEffect(() => {
    // Parse highlights from transcript if available
    if (recording.transcription) {
      // In a real implementation, you might parse structured data
      // For now, we'll extract some basic highlights
      const extractedHighlights = extractHighlightsFromTranscript(
        recording.transcription
      );
      setHighlights(extractedHighlights);
    }
  }, [recording.transcription]);

  const extractHighlightsFromTranscript = (transcript: string) => {
    // Simple highlight extraction - in practice, this would use AI analysis
    const highlights = [];

    if (transcript.includes("interested") || transcript.includes("yes")) {
      highlights.push({
        type: "commitment",
        title: "Interest Expressed",
        content: "Customer showed positive interest",
        importance: "high",
      });
    }

    if (
      transcript.includes("concern") ||
      transcript.includes("but") ||
      transcript.includes("however")
    ) {
      highlights.push({
        type: "objection",
        title: "Concerns Raised",
        content: "Customer expressed concerns or objections",
        importance: "medium",
      });
    }

    if (transcript.includes("call back") || transcript.includes("follow up")) {
      highlights.push({
        type: "next_step",
        title: "Follow-up Scheduled",
        content: "Next steps discussed",
        importance: "high",
      });
    }

    return highlights;
  };

  const handlePlayPause = () => {
    if (!recording.recording_url || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSentimentColor = (score?: number): string => {
    if (!score) return "text-gray-500";
    if (score > 0.7) return "text-green-600";
    if (score > 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentLabel = (score?: number): string => {
    if (!score) return "Unknown";
    if (score > 0.7) return "Positive";
    if (score > 0.4) return "Neutral";
    return "Poor";
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case "commitment":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "objection":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "next_step":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
        {recording.recording_url && (
          <>
            <button
              onClick={handlePlayPause}
              className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              disabled={!recording.recording_url}
            >
              {isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>
            <audio
              ref={audioRef}
              src={recording.recording_url}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          </>
        )}
        <Clock className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-600">{formatTime(duration)}</span>
        {sentimentScore && (
          <span className={`text-xs ${getSentimentColor(sentimentScore)}`}>
            {getSentimentLabel(sentimentScore)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-5 w-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Call Recording</h3>
          <span className="text-sm text-gray-500">{formatTime(duration)}</span>
        </div>
        <div className="flex items-center space-x-4">
          {sentimentScore !== undefined && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sentiment:</span>
              <span
                className={`text-sm font-medium ${getSentimentColor(
                  sentimentScore
                )}`}
              >
                {getSentimentLabel(sentimentScore)} (
                {Math.round(sentimentScore * 100)}%)
              </span>
            </div>
          )}
          {safeAnalysisData.interestLevel && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Interest:</span>
              <span
                className={`text-sm font-medium ${
                  safeAnalysisData.interestLevel === "high"
                    ? "text-green-600"
                    : safeAnalysisData.interestLevel === "medium"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {safeAnalysisData.interestLevel.charAt(0).toUpperCase() +
                  safeAnalysisData.interestLevel.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {recording.recording_url && (
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                  style={{
                    width: `${
                      duration > 0 ? (currentTime / duration) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={recording.recording_url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}

      {/* Call Summary */}
      {safeAnalysisData.summary && (
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-2">Call Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            {safeAnalysisData.summary
              .split("\n")
              .map((line: string, index: number) => {
                // Handle bullet points
                if (line.trim().startsWith("•")) {
                  return (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{line.trim().substring(1).trim()}</span>
                    </div>
                  );
                }
                // Handle regular text
                if (line.trim()) {
                  return <p key={index}>{line.trim()}</p>;
                }
                return null;
              })}
          </div>
        </div>
      )}

      {/* Action Items */}
      {analysisData.actionItems && analysisData.actionItems.length > 0 && (
        <div className="bg-green-50 rounded-lg p-3">
          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Action Items
          </h4>
          <div className="space-y-1">
            {safeAnalysisData.actionItems.map((item: string, index: number) => (
              <div
                key={index}
                className="flex items-start space-x-2 text-sm text-green-800"
              >
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commitments Made */}
      {safeAnalysisData.commitmentDetails && (
        <div className="bg-purple-50 rounded-lg p-3">
          <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-purple-600" />
            Commitments Made
          </h4>
          <div className="flex items-start space-x-2 text-sm text-purple-800">
            <span className="text-purple-600 mt-0.5">🤝</span>
            <span>{safeAnalysisData.commitmentDetails}</span>
          </div>
        </div>
      )}

      {/* Transcript */}
      {showTranscript && recording.transcription && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcript
            </h4>
            <button
              onClick={() => setShowFullTranscript(!showFullTranscript)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showFullTranscript ? "Show Less" : "Show Full"}
              {showFullTranscript ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          <div
            className={`text-sm text-gray-700 bg-gray-50 rounded p-3 ${
              showFullTranscript ? "max-h-none" : "max-h-20 overflow-hidden"
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans">
              {recording.transcription}
            </pre>
          </div>
        </div>
      )}

      {/* No Recording Available */}
      {!recording.recording_url && (
        <div className="text-center py-4 text-gray-500">
          <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Recording not available</p>
          {recording.transcription && (
            <p className="text-xs">Transcript available below</p>
          )}
        </div>
      )}
    </div>
  );
};
