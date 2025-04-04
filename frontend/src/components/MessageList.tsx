import React, { useRef, useEffect } from "react";
import { Message } from "../types/message";
import { formatDistanceToNow } from "date-fns";

interface MessageListProps {
  messages: Message[];
}

const getStatusIndicator = (message: Message) => {
  if (message.direction === "inbound") return null;

  type StatusKey = "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | "read";
  
  const statusMap = {
    queued: { icon: "⏳", color: "text-gray-400", text: "Queued" },
    sending: { icon: "⏳", color: "text-blue-400", text: "Sending" },
    sent: { icon: "✓", color: "text-blue-500", text: "Sent" },
    delivered: { icon: "✓✓", color: "text-green-500", text: "Delivered" },
    failed: { icon: "❌", color: "text-red-500", text: "Failed" },
    undelivered: { icon: "❌", color: "text-red-500", text: "Undelivered" },
    read: { icon: "👁️", color: "text-green-600", text: "Read" },
  };

  // Type the status explicitly as a key of statusMap
  const deliveryStatus = message.deliveryStatus || "queued";
  const status = (validStatus(deliveryStatus) ? deliveryStatus : "queued") as StatusKey;
  
  // Ensure the status is valid
  const indicator = statusMap[status];

  return (
    <span
      className={`text-xs ${indicator.color} ml-2`}
      title={message.errorMessage || indicator.text}
    >
      {indicator.icon}
    </span>
  );
};

// Helper function to validate if a status is a valid key
function validStatus(status: string): status is "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | "read" {
  return ["queued", "sending", "sent", "delivered", "failed", "undelivered", "read"].includes(status);
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [previousMessagesLength, setPreviousMessagesLength] = React.useState(0);

  // Improved scroll handling to maintain position or scroll to bottom when appropriate
  React.useEffect(() => {
    // Only consider scrolling if we have messages
    if (messages.length === 0) return;
    
    // Check if we should scroll to bottom by checking if:
    // 1. New messages were added (messages.length > previousMessagesLength)
    // 2. User was already at the bottom before the update
    const container = messagesContainerRef.current;
    if (container) {
      // Calculate if user was at the bottom before new messages
      const wasAtBottom = 
        container.scrollHeight - container.clientHeight <= container.scrollTop + 100; // Within 100px of bottom
      
      // New messages were added and user was already at the bottom
      if (messages.length > previousMessagesLength && wasAtBottom) {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (messages.length === 1) {
        // This is the first message, always scroll to it
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    
    // Update the previous length for next comparison
    setPreviousMessagesLength(messages.length);
  }, [messages, previousMessagesLength]);

  // Helper function to format dates safely
  const formatMessageTime = (dateString: string | Date) => {
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;

      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return ""; // Return empty string for invalid dates
      }

      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  return (
    <div className="p-4 space-y-6" ref={messagesContainerRef}>
      {messages.map((message) => {
        // Get message text - no cleaning needed since we're not handling search criteria
        const displayText = message.text;
        
        return (
          <React.Fragment key={`message-${message.id}`}>
            <div
              className={`flex ${
                message.sender === "lead" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-3/4 px-4 py-3 rounded-2xl shadow-sm ${
                  message.sender === "lead"
                    ? "bg-gray-100 text-gray-800 border border-gray-200"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                }`}
              >
                <div className="whitespace-pre-wrap">{displayText}</div>
                <div className={`text-xs mt-1.5 flex items-center ${
                  message.sender === "lead" ? "text-gray-500" : "text-blue-100"
                }`}>
                  <span className="mr-1">{formatMessageTime(message.createdAt)}</span>
                  {message.sender === "agent" && getStatusIndicator(message)}
                </div>
              </div>
            </div>
            
            {/* Only display appointment details, remove property search section */}
            {message.metadata?.hasAppointment && message.metadata.appointmentDate && message.metadata.appointmentTime && (
              <div className="ml-4 mt-1">
                <div className="bg-green-50 border border-green-100 rounded-md p-2">
                  <h4 className="text-xs font-semibold text-green-700 mb-1">Appointment</h4>
                  <div className="flex items-center text-sm text-green-800">
                    <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{message.metadata.appointmentDate} at {message.metadata.appointmentTime}</span>
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageList;
