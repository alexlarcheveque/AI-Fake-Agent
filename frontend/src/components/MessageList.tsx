import React from "react";
import { Message } from "../api/messageApi";

interface MessageListProps {
  messages: Message[];
  currentLeadId: number;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentLeadId,
}) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === "agent" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[70%] rounded-lg p-3 ${
              message.sender === "agent"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            <p className="text-sm">{message.text}</p>
            <span className="text-xs opacity-75 mt-1 block">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageList;
