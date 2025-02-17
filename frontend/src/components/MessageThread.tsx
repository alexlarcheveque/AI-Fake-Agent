import React, { useState, useEffect } from "react";
import messageApi, { Message } from "../api/messageApi";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface MessageThreadProps {
  leadId: number;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadSource?: string;
  createdAt?: string;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  leadSource,
  createdAt,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalTesting, setIsLocalTesting] = useState(false);

  // Fetch messages on component mount and when leadId changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setError(null);
        const fetchedMessages = await messageApi.getMessages(leadId);
        setMessages(fetchedMessages);
      } catch (err) {
        setError("Failed to load messages");
        console.error("Error fetching messages:", err);
      }
    };

    if (leadId) {
      fetchMessages();
    }
  }, [leadId]);

  // Handle sending a new message
  const handleSendMessage = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (isLocalTesting) {
        // Local testing mode
        const response = await messageApi.sendLocalMessage(text);
        setMessages((prev) => [
          ...prev,
          response.userMessage,
          response.aiMessage,
        ]);
      } else {
        // Production mode
        const newMessage = await messageApi.sendMessage(leadId, text);
        setMessages((prev) => [...prev, newMessage]);
      }
    } catch (err) {
      setError("Failed to send message");
      console.error("Error sending message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-semibold">
            {leadName || `Lead #${leadId}`}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Local Testing:</span>
            <button
              onClick={() => setIsLocalTesting(!isLocalTesting)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isLocalTesting
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {isLocalTesting ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 flex flex-wrap gap-x-4">
          {leadEmail && (
            <div>
              <span className="font-medium">Email:</span> {leadEmail}
            </div>
          )}
          {leadPhone && (
            <div>
              <span className="font-medium">Phone:</span> {leadPhone}
            </div>
          )}
          {leadSource && (
            <div>
              <span className="font-medium">Source:</span> {leadSource}
            </div>
          )}
          {createdAt && (
            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date(createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-100 text-red-700 text-sm">{error}</div>
      )}

      {/* Messages */}
      <MessageList messages={messages} currentLeadId={leadId} />

      {/* Input */}
      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default MessageThread;
