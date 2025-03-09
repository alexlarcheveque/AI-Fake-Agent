import React, { useState, useEffect } from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import { Message } from "../types/message";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import FollowUpIndicator from "./FollowUpIndicator";
import { useSocket } from "../contexts/SocketContext";

interface MessageThreadProps {
  leadId: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  leadSource?: string;
  nextScheduledMessage?: string;
  messageCount?: number;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  leadSource,
  nextScheduledMessage,
  messageCount,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { socket } = useSocket();

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

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.leadId === leadId) {
        setMessages((prevMessages) => [...prevMessages, data.message]);

        // Play a notification sound
        const audio = new Audio("/notification.mp3");
        audio.play();
      }
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, leadId]);

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
    if (text.trim() === "" || !leadId) return;

    try {
      console.log("Sending message with data:", {
        leadId,
        text,
        leadIdType: typeof leadId,
      });

      setIsSending(true);
      const numericLeadId =
        typeof leadId === "string" ? parseInt(leadId, 10) : leadId;
      await messageApi.sendMessage(numericLeadId, text);
      setIsSending(false);

      // Refresh messages
      const updatedMessages = await messageApi.getMessages(
        numericLeadId.toString()
      );
      setMessages(updatedMessages);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
    }
  };

  useEffect(() => {
    console.log("MessageThread mounted with leadId:", leadId);

    return () => {
      console.log("MessageThread unmounted with leadId:", leadId);
    };
  }, []); // Empty dependency array means this runs once on mount and once on unmount

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-800">{leadName}</h2>
          <div className="flex items-center space-x-4">
            {nextScheduledMessage && (
              <div className="text-sm text-gray-600">
                <FollowUpIndicator
                  nextScheduledMessage={nextScheduledMessage}
                  messageCount={messageCount || 0}
                  className="text-blue-600"
                />
              </div>
            )}
            <button
              onClick={handleToggleAiAssistant}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                aiAssistantEnabled
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {aiAssistantEnabled ? "Auto-Response: ON" : "Auto-Response: OFF"}
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
          {messageCount && (
            <div>
              <span className="font-medium">Message Count:</span> {messageCount}
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
          leadId={leadId}
          onSendMessage={handleSendMessage}
          isLoading={isSending}
          isDisabled={aiAssistantEnabled}
          placeholder={
            aiAssistantEnabled
              ? "Send a message (AI will also respond automatically)"
              : "Type your message..."
          }
        />
      </div>
    </div>
  );
};

export default MessageThread;
