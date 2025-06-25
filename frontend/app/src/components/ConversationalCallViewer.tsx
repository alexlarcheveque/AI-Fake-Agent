import React, { useState, useEffect } from "react";
import { callApi } from "../api/callApi";

interface ConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  confidence?: number;
  intent?: string;
}

interface ConversationAnalytics {
  totalConversations: number;
  averageConversationDuration: number;
  averageMessageCount: number;
  averageConfidence: number;
  interestLevelDistribution: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

interface ConversationalCallViewerProps {
  callId?: string;
  leadId: number;
  onClose: () => void;
}

export const ConversationalCallViewer: React.FC<
  ConversationalCallViewerProps
> = ({ callId, leadId, onClose }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"conversation" | "analytics">(
    "conversation"
  );

  useEffect(() => {
    if (callId) {
      loadConversationMessages();
    }
    loadAnalytics();
  }, [callId, leadId]);

  const loadConversationMessages = async () => {
    if (!callId) return;

    try {
      const response = await fetch(
        `/api/calls/conversations/${callId}/messages`
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to load conversation messages:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/calls/conversations/analytics/${leadId}`
      );
      const data = await response.json();
      setAnalytics(data.summary);
    } catch (error) {
      console.error("Failed to load conversation analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Loading conversation...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            🤖 AI Conversation {callId ? `#${callId}` : "Analytics"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("conversation")}
            className={`px-6 py-3 font-medium ${
              activeTab === "conversation"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            disabled={!callId}
          >
            💬 Conversation
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-6 py-3 font-medium ${
              activeTab === "analytics"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Analytics
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === "conversation" && callId && (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">🤖</div>
                  <p>No conversation messages yet.</p>
                  <p className="text-sm">
                    Start a conversational call to see AI interactions here.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "assistant"
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === "assistant"
                          ? "bg-blue-100 text-blue-900"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium">
                          {message.role === "assistant"
                            ? "🤖 AI Agent"
                            : "👤 Lead"}
                        </span>
                        {message.confidence && (
                          <span className="ml-2 text-xs text-gray-500">
                            {Math.round(message.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        {message.intent && (
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {message.intent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "analytics" && analytics && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.totalConversations}
                  </div>
                  <div className="text-sm text-blue-800">
                    Total Conversations
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(analytics.averageConversationDuration)}
                  </div>
                  <div className="text-sm text-green-800">Avg Duration</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(analytics.averageMessageCount)}
                  </div>
                  <div className="text-sm text-purple-800">Avg Messages</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(analytics.averageConfidence * 100)}%
                  </div>
                  <div className="text-sm text-orange-800">Avg Confidence</div>
                </div>
              </div>

              {/* Interest Level Distribution */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">
                  Lead Interest Levels
                </h3>
                <div className="space-y-2">
                  {Object.entries(analytics.interestLevelDistribution).map(
                    ([level, count]) => {
                      const total = Object.values(
                        analytics.interestLevelDistribution
                      ).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;

                      return (
                        <div key={level} className="flex items-center">
                          <div className="w-20 text-sm capitalize">
                            {level}:
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                level === "high"
                                  ? "bg-green-500"
                                  : level === "medium"
                                  ? "bg-yellow-500"
                                  : level === "low"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-sm font-medium w-12">
                            {count}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {analytics.totalConversations === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No conversation data yet.</p>
                  <p className="text-sm">
                    Analytics will appear after you make conversational calls.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "conversation" && !callId && (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">💬</div>
              <p>No specific call selected.</p>
              <p className="text-sm">
                Select a conversational call to view the messages.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          {callId && (
            <button
              onClick={loadConversationMessages}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationalCallViewer;
