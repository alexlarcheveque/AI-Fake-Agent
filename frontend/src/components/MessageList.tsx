import React, { useRef, useEffect } from "react";
import { Message } from "../types/message";
import { 
  format, 
  isToday, 
  isYesterday, 
  isSameDay,
  isSameWeek, 
  startOfDay
} from "date-fns";

interface MessageListProps {
  messages: Message[];
}

const getStatusIndicator = (message: Message) => {
  if (message.direction === "inbound") return null;

  type StatusKey = "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | "read";
  
  // Customize colors for the blue bubble background with more modern icons
  const statusMap = {
    queued: { icon: "●", color: "text-blue-200", text: "Queued" },
    sending: { icon: "◌", color: "text-blue-200", text: "Sending" },
    sent: { icon: "✓", color: "text-blue-100", text: "Sent" },
    delivered: { icon: "✓✓", color: "text-white", text: "Delivered" },
    failed: { icon: "✕", color: "text-red-300", text: "Failed" },
    undelivered: { icon: "✕", color: "text-red-300", text: "Undelivered" },
    read: { icon: "✓✓", color: "text-white", text: "Read" },
  };

  // Type the status explicitly as a key of statusMap
  const deliveryStatus = message.deliveryStatus || "queued";
  const status = (validStatus(deliveryStatus) ? deliveryStatus : "queued") as StatusKey;
  
  // Ensure the status is valid
  const indicator = statusMap[status];

  return (
    <span className={`${indicator.color} text-xs opacity-70`} title={indicator.text}>
      {indicator.icon} {indicator.text}
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

  // Group messages by date for date separators
  const getMessageGroups = () => {
    const groups: { date: Date; displayDate: Date; messages: Message[] }[] = [];
    
    messages.forEach(message => {
      const messageDate = typeof message.createdAt === "string" 
        ? new Date(message.createdAt) 
        : message.createdAt;
      
      // Skip invalid dates
      if (isNaN(messageDate.getTime())) {
        return;
      }

      // Use the start of day for grouping
      const messageDateStart = startOfDay(messageDate);
      
      // Check if we already have a group for this date
      const existingGroup = groups.find(group => 
        isSameDay(group.date, messageDateStart)
      );

      if (existingGroup) {
        existingGroup.messages.push(message);
        // Update the display date to the latest message in the group
        if (messageDate > existingGroup.displayDate) {
          existingGroup.displayDate = messageDate;
        }
      } else {
        groups.push({
          date: messageDateStart, // For grouping
          displayDate: messageDate, // For display with correct time
          messages: [message]
        });
      }
    });

    return groups;
  };

  // Format date for date separator headers with time included
  const formatDateHeader = (date: Date) => {
    const timeFormat = format(date, "h:mm a"); // e.g., "2:30 PM"
    
    if (isToday(date)) {
      return `Today ${timeFormat}`;
    } else if (isYesterday(date)) {
      return `Yesterday ${timeFormat}`;
    } else if (isSameWeek(date, new Date(), { weekStartsOn: 1 })) {
      return `${format(date, "EEEE")} ${timeFormat}`; // e.g., "Monday 2:30 PM"
    } else {
      return `${format(date, "MMMM d, yyyy")} ${timeFormat}`; // e.g., "April 3, 2023 2:30 PM"
    }
  };

  const messageGroups = getMessageGroups();

  return (
    <div className="px-3 py-2 space-y-3" ref={messagesContainerRef}>
      {messageGroups.map((group, groupIndex) => (
        <div key={`date-group-${groupIndex}`} className="space-y-2">
          {/* Date + Time separator */}
          <div className="flex justify-center mb-2">
            <div className="bg-gray-100 text-gray-600 text-xs font-medium rounded-full px-3 py-1">
              {formatDateHeader(group.displayDate)}
            </div>
          </div>
          
          {/* Messages for this date */}
          {group.messages.map((message) => {
            const displayText = message.text;
            
            return (
              <div key={`message-${message.id}`} className={`flex items-end ${
                message.sender === "lead" ? "justify-start" : "justify-end"
              }`}>
                <div className={`relative max-w-3/4 px-4 py-2 rounded-2xl shadow-sm ${
                  message.sender === "lead"
                    ? "bg-gray-100 text-gray-800 border border-gray-200"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                }`}>
                  <div className="whitespace-pre-wrap">{displayText}</div>
                  {/* Add delivery status at the bottom of outbound messages */}
                  {message.sender === "agent" && (
                    <div className="text-right mt-1 text-xs">
                      {getStatusIndicator(message)}
                    </div>
                  )}
                </div>
                
                {/* Appointment details are displayed in a separate div below the message */}
                {message.metadata?.hasAppointment && 
                 message.metadata.appointmentDate && 
                 message.metadata.appointmentTime && (
                  <div className={`mt-1 ${message.sender === "lead" ? "ml-4" : "mr-4"}`}>
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
              </div>
            );
          })}
        </div>
      ))}
      {/* Invisible element for scrolling with no space */}
      <div ref={messageEndRef} style={{height: 0, padding: 0, margin: 0}} />
    </div>
  );
};

export default MessageList;
