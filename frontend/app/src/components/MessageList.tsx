import React, { useRef, useEffect } from "react";
import {
  format,
  isToday,
  isYesterday,
  isSameDay,
  isSameWeek,
  startOfDay,
} from "date-fns";
import appointmentApi from "../api/appointmentApi";
import { MessageRow } from "../../../../backend/models/Message.ts";
import { AppointmentRow } from "../../../../backend/models/Appointment.ts";

const getStatusIndicator = (message: MessageRow) => {
  if (message.sender === "lead") return null;

  // Customize colors for the blue bubble background with more modern icons
  const statusMap: Record<
    string,
    { icon: string; color: string; text: string }
  > = {
    scheduled: { icon: "⏳", color: "text-blue-200", text: "Scheduled" },
    queued: { icon: "●", color: "text-blue-200", text: "Queued" },
    sending: { icon: "●", color: "text-blue-200", text: "Sending" },
    sent: { icon: "✓", color: "text-blue-100", text: "Sent" },
    delivered: { icon: "✓✓", color: "text-white", text: "Delivered" },
    failed: { icon: "✕", color: "text-red-300", text: "Failed" },
    undelivered: { icon: "✕", color: "text-red-300", text: "Undelivered" },
    read: { icon: "✓✓", color: "text-white", text: "Read" },
  };

  // Get the delivery status or default to "queued"
  const deliveryStatus = message.delivery_status || "queued";

  // Check if the status exists in our map, otherwise use a default
  const indicator = statusMap[deliveryStatus] || statusMap.queued;

  return (
    <span
      className={`${indicator.color} text-xs opacity-70`}
      title={indicator.text}
    >
      {indicator.icon} {indicator.text}
    </span>
  );
};

const MessageList: React.FC<{ messages: MessageRow[] }> = ({ messages }) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [previousMessagesLength, setPreviousMessagesLength] = React.useState(0);
  const [appointments, setAppointments] = React.useState<AppointmentRow[]>([]);
  const [leadId, setLeadId] = React.useState<number | null>(null);

  // Fetch appointments if we have a leadId
  React.useEffect(() => {
    // Get leadId from first message
    if (messages.length > 0 && messages[0].lead_id) {
      const messageLeadId = messages[0].lead_id;

      // Only fetch if leadId changed
      if (messageLeadId !== leadId) {
        setLeadId(messageLeadId);

        // Fetch appointments for this lead
        const fetchAppointments = async () => {
          try {
            const appointmentsData =
              await appointmentApi.getAppointmentsByLeadId(messageLeadId);
            setAppointments(appointmentsData);
          } catch (error) {
            console.error("Error fetching appointments:", error);
          }
        };

        fetchAppointments();
      }
    }
  }, [messages, leadId]);

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
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 100; // Within 100px of bottom

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
    const groups: {
      date: Date;
      displayDate: Date;
      messages: MessageRow[];
      shownAppointments: Set<number>;
    }[] = [];
    const now = new Date();

    messages.forEach((message: MessageRow) => {
      // Handle missing created_at with a fallback date
      if (!message.created_at) {
        console.warn(
          "Message missing created_at, using current date:",
          message
        );
        message.created_at = now.toISOString();
      }

      // Parse the date safely
      let messageDate: Date;
      try {
        messageDate = new Date(message.created_at);
        // Check if the date is valid
        if (isNaN(messageDate.getTime())) {
          console.warn(
            "Invalid date for message, using current date:",
            message
          );
          messageDate = now;
        }
      } catch (error) {
        console.warn("Error parsing date, using current date:", message);
        messageDate = now;
      }

      // Use the start of day for grouping
      const messageDateStart = startOfDay(messageDate);

      // Check if we already have a group for this date
      const existingGroup = groups.find((group) =>
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
          messages: [message],
          shownAppointments: new Set<number>(), // Track which appointments we've shown
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
      {messageGroups.map((group, groupIndex) => {
        // Clear shown appointments for this group
        group.shownAppointments = new Set<number>();

        return (
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
                    {/* Add delivery status at the bottom of outbound messages */}
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
        );
      })}
      {/* Invisible element for scrolling with no space */}
      <div ref={messageEndRef} style={{ height: 0, padding: 0, margin: 0 }} />
    </div>
  );
};

export default MessageList;
