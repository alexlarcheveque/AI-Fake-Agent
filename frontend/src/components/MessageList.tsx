import React from "react";
import { Message } from "../types/message";

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);

  console.log("messages", messages);

  React.useEffect(() => {
    // Only scroll if there are messages
    if (messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === "agent" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[75%] rounded-lg px-4 py-2 ${
              message.sender === "agent"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            <p className="text-sm">{message.text}</p>
            <div className="flex justify-between items-center mt-1 text-xs opacity-75">
              <span>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={`ml-2 ${
                  message.sender === "agent" ? "text-blue-100" : "text-gray-600"
                }`}
              >
                {message.sender === "lead"
                  ? "Lead"
                  : message.sender === "agent"
                  ? "AI Assistant"
                  : "Manual"}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageList;
