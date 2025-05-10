import React, { useRef, useEffect } from "react";
import { Message } from "../types/message";
import {
  format,
  isToday,
  isYesterday,
  isSameDay,
  isSameWeek,
  startOfDay,
} from "date-fns";

interface MessageListProps {
  messages: Message[];
}

const getStatusIndicator = (message: Message) => {
  if (message.sender === "lead") return null;

  type StatusKey = "scheduled" | "sent" | "delivered" | "failed";

  const statusMap = {
    scheduled: { icon: "●", color: "text-blue-200", text: "Scheduled" },
    sent: { icon: "✓", color: "text-blue-100", text: "Sent" },
    delivered: { icon: "✓✓", color: "text-white", text: "Delivered" },
    failed: { icon: "✕", color: "text-red-300", text: "Failed" },
  };

  const delivery_status = message.delivery_status || "scheduled";

  const status = (
    validStatus(delivery_status) ? delivery_status : "scheduled"
  ) as StatusKey;

  const indicator = statusMap[status];

  return (
    <span
      className={`${indicator.color} text-xs opacity-70`}
      title={indicator.text}
    >
      {indicator.icon} {indicator.text}
    </span>
  );
};

function validStatus(
  status: string
): status is "scheduled" | "sent" | "delivered" | "failed" {
  return ["scheduled", "sent", "delivered", "failed"].includes(status);
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [previousMessagesLength, setPreviousMessagesLength] = React.useState(0);

  React.useEffect(() => {
    if (messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (container) {
      const wasAtBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 100; // Within 100px of bottom

      if (messages.length > previousMessagesLength && wasAtBottom) {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (messages.length === 1) {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }

    setPreviousMessagesLength(messages.length);
  }, [messages, previousMessagesLength]);

  const getMessageGroups = () => {
    const groups: { date: Date; displayDate: Date; messages: Message[] }[] = [];

    console.log("messages", messages);

    messages.forEach((message) => {
      if (!message?.created_at || message?.delivery_status === "scheduled") {
        console.warn("Message missing created_at:", message);
        return;
      }

      const messageDate =
        typeof message?.created_at === "string"
          ? new Date(message?.created_at)
          : message?.created_at;

      if (isNaN(messageDate.getTime())) {
        console.warn("Invalid date for message:", message);
        return;
      }

      const messageDateStart = startOfDay(messageDate);

      const existingGroup = groups.find((group) =>
        isSameDay(group.date, messageDateStart)
      );

      if (existingGroup) {
        existingGroup.messages.push(message);
        if (messageDate > existingGroup.displayDate) {
          existingGroup.displayDate = messageDate;
        }
      } else {
        groups.push({
          date: messageDateStart,
          displayDate: messageDate,
          messages: [message],
        });
      }
    });

    return groups;
  };

  const formatDateHeader = (date: Date) => {
    const timeFormat = format(date, "h:mm a");

    if (isToday(date)) {
      return `Today ${timeFormat}`;
    } else if (isYesterday(date)) {
      return `Yesterday ${timeFormat}`;
    } else if (isSameWeek(date, new Date(), { weekStartsOn: 1 })) {
      return `${format(date, "EEEE")} ${timeFormat}`;
    } else {
      return `${format(date, "MMMM d, yyyy")} ${timeFormat}`;
    }
  };

  const messageGroups = getMessageGroups();

  return (
    <div className="px-3 py-2 space-y-3" ref={messagesContainerRef}>
      {messageGroups.map((group, groupIndex) => (
        <div key={`date-group-${groupIndex}`} className="space-y-2">
          <div className="flex justify-center mb-2">
            <div className="bg-gray-100 text-gray-600 text-xs font-medium rounded-full px-3 py-1">
              {formatDateHeader(group.displayDate)}
            </div>
          </div>

          {group.messages.map((message) => {
            const displayText = message.text;

            return (
              <div
                key={`message-${message.id}`}
                className={`flex items-end ${
                  message.sender === "lead" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`relative max-w-3/4 px-4 py-2 rounded-2xl shadow-sm ${
                    message.sender === "lead"
                      ? "bg-gray-100 text-gray-800 border border-gray-200"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{displayText}</div>
                  {message.sender === "agent" && (
                    <div className="text-right mt-1 text-xs">
                      {getStatusIndicator(message)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {/* Invisible element for scrolling with no space */}
      <div ref={messageEndRef} style={{ height: 0, padding: 0, margin: 0 }} />
    </div>
  );
};

export default MessageList;
