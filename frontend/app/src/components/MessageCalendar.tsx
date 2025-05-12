import React, { useState, useEffect } from "react";
import { LeadRow } from "../../../../backend/models/Lead";
import { MessageRow } from "../../../../backend/models/Message";
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

interface CalendarEvent {
  id: number;
  leadId: number;
  name: string;
  messageType: "first" | "followup";
  messageCount: number;
  scheduledAt: string;
  isPast: boolean;
  status: string;
}

const MessageCalendar: React.FC<MessageCalendarProps> = ({ onLeadSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch leads and their messages
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get the month range
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const monthStartStr = format(monthStart, "yyyy-MM-dd");
        const monthEndStr = format(monthEnd, "yyyy-MM-dd");

        // Fetch all leads owned by the user
        const leads = await leadApi.getLeadsByUserId();

        if (!leads || leads.length === 0) {
          setCalendarEvents([]);
          return;
        }

        // Collect all messages for all leads
        const allEvents: CalendarEvent[] = [];

        // Process each lead
        for (const lead of leads) {
          try {
            // Get all messages for this lead
            const messages = await messageApi.getMessagesByLeadIdDescending(
              lead.id
            );

            if (!messages || messages.length === 0) continue;

            // Process messages to create calendar events
            messages.forEach((message, index) => {
              // Only include messages with scheduled_at date and that are in the current month
              if (message.scheduled_at) {
                const messageDate = new Date(message.scheduled_at);
                const isInRange =
                  messageDate >= monthStart && messageDate <= monthEnd;

                if (isInRange) {
                  // Determine if this is a first message or followup
                  const messageType = index === 0 ? "first" : "followup";

                  allEvents.push({
                    id: message.id,
                    leadId: lead.id,
                    name: lead.name,
                    messageType: messageType,
                    messageCount: messages.length - index, // Count from the end
                    scheduledAt: message.scheduled_at,
                    isPast:
                      new Date(message.scheduled_at) < new Date() &&
                      message.delivery_status !== "scheduled",
                    status: message.delivery_status || "scheduled",
                  });
                }
              }
            });
          } catch (error) {
            console.error(
              `Error fetching messages for lead ${lead.id}:`,
              error
            );
          }
        }

        // Sort all events by timestamp (ascending)
        allEvents.sort((a, b) => {
          const dateA = new Date(a.scheduledAt || 0);
          const dateB = new Date(b.scheduledAt || 0);
          return dateA.getTime() - dateB.getTime();
        });

        setCalendarEvents(allEvents);
      } catch (error) {
        console.error("Error fetching calendar data:", error);
        setCalendarEvents([]);
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

  // Get all events for a specific day
  const getEventsForDay = (day: Date) => {
    // Filter events for this day
    const events = calendarEvents.filter((event) => {
      if (!event.scheduledAt) return false;
      const eventDate = new Date(event.scheduledAt);
      return isSameDay(eventDate, day);
    });

    // Sort events by time (ascending)
    return events.sort((a, b) => {
      const dateA = new Date(a.scheduledAt || 0);
      const dateB = new Date(b.scheduledAt || 0);
      return dateA.getTime() - dateB.getTime();
    });
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
                      key={`${event.id}-${event.messageType}`}
                      onClick={() => onLeadSelect && onLeadSelect(event.leadId)}
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
                        event.messageType === "first"
                          ? "First message"
                          : `Follow-up #${event.messageCount}`
                      } (${event.status})`}
                    >
                      <div className="font-medium">{event.name}</div>
                      <div>
                        {format(new Date(event.scheduledAt), "h:mm a")}
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
