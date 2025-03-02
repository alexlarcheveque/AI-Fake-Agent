import React, { useState, useEffect } from "react";
import { Lead } from "../types/lead";
import leadApi from "../api/leadApi";
import messageApi from "../api/messageApi";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isBefore,
} from "date-fns";

interface MessageCalendarProps {
  onLeadSelect?: (leadId: number) => void;
}

interface CalendarLead extends Lead {
  messageType: "first" | "followup";
  messageStatus?: string;
}

interface ScheduledMessage {
  id: number;
  leadId: number;
  scheduledFor: string;
  status: string;
  leadName: string;
  messageType: "first" | "followup";
  messageCount: number;
}

const MessageCalendar: React.FC<MessageCalendarProps> = ({ onLeadSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledLeads, setScheduledLeads] = useState<CalendarLead[]>([]);
  const [pastMessages, setPastMessages] = useState<ScheduledMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch leads with scheduled messages and past messages
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get the month range
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Fetch leads with upcoming scheduled messages
        const response = await leadApi.getLeads(1, 100);

        // Filter leads with scheduled messages in the current month range
        const leadsWithScheduledMessages = response.leads
          .filter((lead) => lead.nextScheduledMessage)
          .map((lead) => {
            const messageDate = new Date(lead.nextScheduledMessage!);
            const isInRange =
              messageDate >= monthStart && messageDate <= monthEnd;

            if (isInRange) {
              return {
                ...lead,
                messageType: lead.messageCount === 0 ? "first" : "followup",
              };
            }
            return null;
          })
          .filter(Boolean) as CalendarLead[];

        setScheduledLeads(leadsWithScheduledMessages);

        try {
          // Fetch past messages for the calendar
          const pastMessagesResponse = await messageApi.getScheduledMessages(
            format(monthStart, "yyyy-MM-dd"),
            format(monthEnd, "yyyy-MM-dd")
          );

          setPastMessages(pastMessagesResponse || []);
        } catch (msgError) {
          console.error("Error fetching past messages:", msgError);
          setPastMessages([]); // Set empty array on error
        }
      } catch (error) {
        console.error("Error fetching calendar data:", error);
        setScheduledLeads([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentMonth]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get all events (scheduled and past) for a specific day
  const getEventsForDay = (day: Date) => {
    const upcomingEvents = scheduledLeads.filter((lead) =>
      isSameDay(new Date(lead.nextScheduledMessage!), day)
    );

    const pastEvents = pastMessages.filter((message) =>
      isSameDay(new Date(message.scheduledFor), day)
    );

    // Combine both types of events
    const allEvents = [
      ...upcomingEvents.map((lead) => ({
        id: lead.id,
        name: lead.name,
        messageType: lead.messageType,
        messageCount: lead.messageCount,
        nextScheduledMessage: lead.nextScheduledMessage,
        isPast: false,
        status: "upcoming",
      })),
      ...pastEvents.map((msg) => ({
        id: msg.leadId,
        name: msg.leadName,
        messageType: msg.messageType,
        messageCount: msg.messageCount,
        nextScheduledMessage: msg.scheduledFor,
        isPast: true,
        status: msg.status,
      })),
    ];

    return allEvents;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Calendar header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {weekdays.map((day) => (
            <div
              key={day}
              className="text-center font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentDay = isToday(day);
            const isPastDay = isBefore(day, new Date()) && !isCurrentDay;

            return (
              <div
                key={day.toString()}
                className={`min-h-[100px] border p-1 ${
                  isCurrentDay
                    ? "bg-blue-50 border-blue-200"
                    : isPastDay
                    ? "bg-gray-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full w-6 h-6 text-center ${
                      isCurrentDay ? "bg-blue-500 text-white" : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div className="mt-1 space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={`${event.id}-${event.messageType}-${event.isPast}`}
                      onClick={() => onLeadSelect && onLeadSelect(event.id)}
                      className={`text-xs p-1 rounded truncate cursor-pointer ${
                        event.isPast
                          ? event.status === "sent" ||
                            event.status === "delivered"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : event.status === "failed"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-gray-50 text-gray-800 border border-gray-200"
                          : event.messageType === "first"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      }`}
                      title={`${event.name} - ${
                        event.isPast
                          ? `${
                              event.messageType === "first"
                                ? "First message"
                                : `Follow-up #${event.messageCount}`
                            } (${event.status})`
                          : event.messageType === "first"
                          ? "First message"
                          : `Follow-up #${event.messageCount}`
                      }`}
                    >
                      <div className="font-medium">{event.name}</div>
                      <div>
                        {format(
                          new Date(event.nextScheduledMessage!),
                          "h:mm a"
                        )}
                        {event.isPast && (
                          <span className="ml-1 text-xs">({event.status})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageCalendar;
