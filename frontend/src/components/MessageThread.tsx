import React, { useState, useEffect } from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import { Message } from "../types/message";
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
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);

  // Fetch messages and lead settings on component mount and when leadId changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [fetchedMessages, lead] = await Promise.all([
          messageApi.getMessages(leadId.toString()),
          leadApi.getLead(leadId),
        ]);
        setMessages(fetchedMessages);
        setAiAssistantEnabled(lead.aiAssistantEnabled);
      } catch (err) {
        setError("Failed to load messages");
        console.error("Error fetching data:", err);
      }
    };

    if (leadId) {
      fetchData();
    }
  }, [leadId]);

  // Toggle AI Assistant
  const handleToggleAiAssistant = async () => {
    try {
      const updatedLead = await leadApi.updateLead(leadId, {
        aiAssistantEnabled: !aiAssistantEnabled,
      });
      setAiAssistantEnabled(updatedLead.aiAssistantEnabled);
    } catch (err) {
      setError("Failed to update AI Assistant setting");
      console.error("Error updating lead:", err);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await messageApi.sendMessage(leadId.toString(), text);

      // Update messages with both the sent message and AI response if present
      setMessages((prev) => [
        ...prev,
        response.message,
        ...(response.aiMessage ? [response.aiMessage] : []),
      ]);
    } catch (err) {
      setError("Failed to send message");
      console.error("Error sending message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-semibold">
            {leadName || `Lead #${leadId}`}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">AI Assistant:</span>
            <button
              onClick={handleToggleAiAssistant}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                aiAssistantEnabled
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {aiAssistantEnabled ? "Enabled" : "Disabled"}
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
        <div className="p-2 bg-red-100 text-red-700 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isDisabled={aiAssistantEnabled}
          placeholder={
            aiAssistantEnabled
              ? "AI will be responding, toggle AI Assistant off if you want to send manual messages"
              : "Type your message..."
          }
        />
      </div>
    </div>
  );
};

export default MessageThread;
