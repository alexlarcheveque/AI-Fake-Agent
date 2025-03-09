import React from "react";
import { Message } from "../types/message";

interface MessageListProps {
  messages: Message[];
}

const getStatusIndicator = (message: Message) => {
  if (message.direction === "inbound") return null;

  const statusMap = {
    queued: { icon: "⏳", color: "text-gray-400", text: "Queued" },
    sending: { icon: "⏳", color: "text-blue-400", text: "Sending" },
    sent: { icon: "✓", color: "text-blue-500", text: "Sent" },
    delivered: { icon: "✓✓", color: "text-green-500", text: "Delivered" },
    failed: { icon: "❌", color: "text-red-500", text: "Failed" },
    undelivered: { icon: "❌", color: "text-red-500", text: "Undelivered" },
    read: { icon: "👁️", color: "text-green-600", text: "Read" },
  };

  const status = message.deliveryStatus || "queued";
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

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);

  console.log("messages", messages);

  React.useEffect(() => {
    // Only scroll if there are messages
    if (messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  React.useEffect(() => {
    if (messages.length > 0) {
      console.log("Message structure:", messages[0]);
    }
  }, [messages]);

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
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === "lead" ? "justify-start" : "justify-end"
          }`}
        >
          <div
            className={`max-w-3/4 p-3 rounded-lg ${
              message.sender === "lead"
                ? "bg-gray-100 text-gray-800"
                : "bg-blue-500 text-white"
            }`}
          >
            {message.text}
            <div className="text-xs mt-1 opacity-70">
              {new Date(message.createdAt).toLocaleTimeString()}
              {message.sender === "agent" && getStatusIndicator(message)}
            </div>
          </div>
        </div>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageList;
