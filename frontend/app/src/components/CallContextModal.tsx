import React from "react";
import {
  X,
  Bot,
  PhoneCall,
  MessageSquare,
  Clock,
  Target,
  Lightbulb,
  Heart,
} from "lucide-react";
import { CallMode } from "../services/webrtcVoiceService";

interface CallContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadContext: {
    leadData: {
      name: string;
      phone: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    followUps: string[];
    talkingPoints: string[];
    valueProps: string[];
    lastContact?: string;
    sentiment?: "positive" | "neutral" | "negative";
    previousMessages: any[];
    callHistory: any[];
  };
  callMode: CallMode;
  isLoading?: boolean;
}

export const CallContextModal: React.FC<CallContextModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadContext,
  callMode,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const {
    leadData,
    followUps,
    talkingPoints,
    valueProps,
    lastContact,
    sentiment,
    previousMessages,
    callHistory,
  } = leadContext;

  const leadName =
    `${leadData.first_name || ""} ${leadData.last_name || ""}`.trim() ||
    leadData.name;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 bg-green-50";
      case "negative":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "😊";
      case "negative":
        return "😟";
      default:
        return "😐";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                callMode === "ai" ? "bg-blue-100" : "bg-green-100"
              }`}
            >
              {callMode === "ai" ? (
                <Bot className="h-5 w-5 text-blue-600" />
              ) : (
                <PhoneCall className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {callMode === "ai" ? "AI Call" : "Manual Call"} with {leadName}
              </h2>
              <p className="text-sm text-gray-500">{leadData.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Summary */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Lead Summary
                </h3>

                <div className="space-y-3">
                  {sentiment && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Sentiment:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(
                          sentiment
                        )}`}
                      >
                        {getSentimentIcon(sentiment)}{" "}
                        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                      </span>
                    </div>
                  )}

                  {lastContact && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Last contact:{" "}
                        {new Date(lastContact).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{previousMessages.length} messages</span>
                    <span>{callHistory.length} previous calls</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {previousMessages.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Recent Messages
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {previousMessages.slice(0, 3).map((message, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-medium ${
                              message.sender_type === "user"
                                ? "text-blue-600"
                                : "text-green-600"
                            }`}
                          >
                            {message.sender_type === "user" ? "You" : leadName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        <p className="text-gray-700 line-clamp-2">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Call Strategy */}
            <div className="space-y-4">
              {/* Follow-ups */}
              {followUps.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-yellow-600" />
                    Follow-up Questions
                  </h4>
                  <ul className="space-y-2">
                    {followUps.map((followUp, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{followUp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Talking Points */}
              {talkingPoints.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-green-600" />
                    Talking Points
                  </h4>
                  <ul className="space-y-2">
                    {talkingPoints.map((point, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="text-green-600 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Value Propositions */}
              {valueProps.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-purple-600" />
                    Value Propositions
                  </h4>
                  <ul className="space-y-2">
                    {valueProps.map((value, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Call Mode Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              {callMode === "ai"
                ? "AI Call Information"
                : "Manual Call Information"}
            </h4>
            <p className="text-sm text-gray-600">
              {callMode === "ai"
                ? "The AI will handle this call automatically using the context above. The conversation will be recorded and transcribed."
                : "You will speak directly with the lead. Use the talking points and follow-ups above to guide your conversation. The call will be recorded and transcribed."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all
              ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : callMode === "ai"
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-green-500 hover:bg-green-600"
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Connecting...
              </>
            ) : (
              <>
                {callMode === "ai" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                Start {callMode === "ai" ? "AI" : "Manual"} Call
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
