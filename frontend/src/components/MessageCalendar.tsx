import React, { useState, useEffect } from "react";
import { Lead } from "../types/lead";
import leadApi from "../api/leadApi";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";

interface MessageCalendarProps {
  onLeadSelect?: (leadId: number) => void;
}

interface CalendarLead extends Lead {
  messageType: "first" | "followup";
}

const MessageCalendar: React.FC<MessageCalendarProps> = ({ onLeadSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledLeads, setScheduledLeads] = useState<CalendarLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch leads with scheduled messages
  useEffect(() => {
    const fetchScheduledLeads = async () => {
      setIsLoading(true);
      try {
        const response = await leadApi.getLeads(1, 100);

        // Filter leads with scheduled messages in the current month range
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

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
      } catch (error) {
        console.error("Error fetching scheduled leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledLeads();
  }, [currentMonth]);

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Get all days in the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Group leads by date
  const getLeadsForDay = (day: Date) => {
    return scheduledLeads.filter((lead) => {
      const messageDate = new Date(lead.nextScheduledMessage!);
      return isSameDay(messageDate, day);
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Scheduled Messages
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-lg font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const dayLeads = getLeadsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`min-h-[100px] border p-1 ${
                  isCurrentDay
                    ? "bg-blue-50 border-blue-200"
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
                  {dayLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => onLeadSelect && onLeadSelect(lead.id)}
                      className={`text-xs p-1 rounded truncate cursor-pointer ${
                        lead.messageType === "first"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      }`}
                      title={`${lead.name} - ${
                        lead.messageType === "first"
                          ? "First message"
                          : `Follow-up #${lead.messageCount}`
                      }`}
                    >
                      <div className="font-medium">{lead.name}</div>
                      <div>
                        {format(new Date(lead.nextScheduledMessage!), "h:mm a")}
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
