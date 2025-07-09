import React, { useState, useEffect } from "react";
import { LeadRow } from "../../../../backend/models/Lead";
import { MessageRow } from "../../../../backend/models/Message";
import { Call } from "../api/callApi";
import leadApi from "../api/leadApi";
import messageApi from "../api/messageApi";
import callApi from "../api/callApi";
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

interface ActivityEvent {
  id: string;
  leadId: number;
  leadName: string;
  type: "message" | "call";
  scheduledAt: string;
  isPast: boolean;
  status: string;
  count: number; // Number indicating multiple activities for same lead on same day
}

interface DayActivity {
  leadId: number;
  leadName: string;
  activities: ActivityEvent[];
}

const MessageCalendar: React.FC<MessageCalendarProps> = ({ onLeadSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayActivities, setDayActivities] = useState<
    Map<string, DayActivity[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch leads, messages, and calls
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
        console.log(`📊 Calendar: Found ${leads?.length || 0} leads`, leads);

        if (!leads || leads.length === 0) {
          setDayActivities(new Map());
          return;
        }

        // Fetch calls for the current user in the month range
        const calls = await callApi.getCallsForUser(monthStartStr, monthEndStr);
        console.log(
          `📞 Calendar: Found ${
            calls?.length || 0
          } calls for date range ${monthStartStr} to ${monthEndStr}`,
          calls
        );

        // Collect all activities
        const allActivities: ActivityEvent[] = [];

        // Process each lead for messages
        for (const lead of leads) {
          try {
            // Get all messages for this lead
            const messages = await messageApi.getMessagesByLeadIdDescending(
              lead.id
            );
            console.log(
              `💬 Calendar: Lead ${lead.name} (${lead.id}) has ${
                messages?.length || 0
              } messages`,
              messages
            );

            if (messages && messages.length > 0) {
              // Log scheduled messages specifically
              const scheduledMessages = messages.filter(
                (m) => m.delivery_status === "scheduled"
              );
              console.log(
                `⏰ Calendar: Lead ${lead.name} has ${scheduledMessages.length} scheduled messages`,
                scheduledMessages
              );

              // Process messages to create calendar events
              messages.forEach((message) => {
                // Only include messages with scheduled_at date and that are in the current month
                if (message.scheduled_at) {
                  const messageDate = new Date(message.scheduled_at);
                  const isInRange =
                    messageDate >= monthStart && messageDate <= monthEnd;

                  console.log(
                    `📅 Calendar: Message ${message.id} scheduled for ${message.scheduled_at}, isInRange: ${isInRange}, status: ${message.delivery_status}`
                  );

                  if (isInRange) {
                    const isPast = messageDate < new Date();
                    const status = message.delivery_status || "scheduled";

                    // Only include if:
                    // 1. Future activity (regardless of status)
                    // 2. Past activity that was actually completed/failed (not still "scheduled")
                    const shouldInclude =
                      !isPast || (isPast && status !== "scheduled");

                    if (shouldInclude) {
                      allActivities.push({
                        id: `message-${message.id}`,
                        leadId: lead.id,
                        leadName: lead.name,
                        type: "message",
                        scheduledAt: message.scheduled_at,
                        isPast,
                        status,
                        count: 1, // Will be updated later when grouping
                      });
                    }
                  }
                }
              });
            }
          } catch (error) {
            console.error(
              `Error fetching messages for lead ${lead.id}:`,
              error
            );
          }
        }

        // Process calls
        if (calls && calls.length > 0) {
          calls.forEach((call) => {
            if (call.created_at || call.started_at) {
              const callDate = new Date(call.started_at || call.created_at);
              const isInRange = callDate >= monthStart && callDate <= monthEnd;

              if (isInRange) {
                const isPast = callDate < new Date();
                const status = call.status;

                // Only include if:
                // 1. Future activity (regardless of status)
                // 2. Past activity that was actually completed/failed (not incomplete statuses)
                const completedStatuses = [
                  "completed",
                  "failed",
                  "busy",
                  "no-answer",
                  "canceled",
                ];
                const shouldInclude =
                  !isPast || (isPast && completedStatuses.includes(status));

                if (shouldInclude) {
                  allActivities.push({
                    id: `call-${call.id}`,
                    leadId: call.lead_id,
                    leadName: call.leads?.name || "Unknown Lead",
                    type: "call",
                    scheduledAt: call.started_at || call.created_at,
                    isPast,
                    status,
                    count: 1, // Will be updated later when grouping
                  });
                }
              }
            }
          });
        }

        console.log(
          `🎯 Calendar: Total activities collected: ${allActivities.length}`,
          allActivities
        );

        // Group activities by day and lead
        const dayActivityMap = new Map<string, DayActivity[]>();

        allActivities.forEach((activity) => {
          const dayKey = format(new Date(activity.scheduledAt), "yyyy-MM-dd");

          if (!dayActivityMap.has(dayKey)) {
            dayActivityMap.set(dayKey, []);
          }

          const dayActivities = dayActivityMap.get(dayKey)!;
          let leadActivity = dayActivities.find(
            (da) => da.leadId === activity.leadId
          );

          if (!leadActivity) {
            leadActivity = {
              leadId: activity.leadId,
              leadName: activity.leadName,
              activities: [],
            };
            dayActivities.push(leadActivity);
          }

          leadActivity.activities.push(activity);
        });

        // Update count for each activity group
        dayActivityMap.forEach((dayActivitiesList) => {
          dayActivitiesList.forEach((leadActivity) => {
            leadActivity.activities.forEach((activity, index) => {
              activity.count =
                leadActivity.activities.length > 1 ? index + 1 : 0;
            });
            // Sort activities by time within each lead group
            leadActivity.activities.sort((a, b) => {
              const dateA = new Date(a.scheduledAt);
              const dateB = new Date(b.scheduledAt);
              return dateA.getTime() - dateB.getTime();
            });
          });
        });

        console.log(
          `📊 Calendar: Final day activities map:`,
          Array.from(dayActivityMap.entries())
        );

        setDayActivities(dayActivityMap);
      } catch (error) {
        console.error("Error fetching calendar data:", error);
        setDayActivities(new Map());
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

  // Get all activities for a specific day
  const getActivitiesForDay = (day: Date): DayActivity[] => {
    const dayKey = format(day, "yyyy-MM-dd");
    return dayActivities.get(dayKey) || [];
  };

  const formatTimeToLocal = (utcTime: string): string => {
    // Ensure the timestamp is treated as UTC
    let dateString = utcTime;

    // If the timestamp doesn't end with 'Z' and doesn't have timezone info, append 'Z' to treat as UTC
    if (
      !dateString.includes("Z") &&
      !dateString.includes("+") &&
      !dateString.includes("-", 10)
    ) {
      dateString = dateString.replace(/(\.\d{3})?$/, "Z");
    }

    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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
            const dayActivities = getActivitiesForDay(day);
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
                  {dayActivities.map((leadActivity) => {
                    const messageCount = leadActivity.activities.filter(
                      (a) => a.type === "message"
                    ).length;
                    const callCount = leadActivity.activities.filter(
                      (a) => a.type === "call"
                    ).length;
                    const totalActivities = leadActivity.activities.length;

                    // Determine the primary status for the lead's activities
                    const hasSuccessful = leadActivity.activities.some(
                      (a) =>
                        a.status === "sent" ||
                        a.status === "delivered" ||
                        a.status === "completed"
                    );
                    const hasFailed = leadActivity.activities.some(
                      (a) => a.status === "failed"
                    );
                    const hasScheduled = leadActivity.activities.some(
                      (a) => !a.isPast
                    );

                    // Determine card color based on status priority
                    let cardColor = "";
                    if (hasScheduled) {
                      // Future activities - use distinct blue background for scheduled
                      cardColor = "bg-blue-100 border-blue-300 text-blue-800";
                    } else if (hasSuccessful && !hasFailed) {
                      cardColor = "bg-green-50 border-green-200 text-green-700";
                    } else if (hasFailed) {
                      // Failed activities - use distinct red background
                      cardColor = "bg-red-100 border-red-300 text-red-800";
                    } else {
                      cardColor = "bg-gray-50 border-gray-200 text-gray-700";
                    }

                    return (
                      <div
                        key={`lead-${leadActivity.leadId}`}
                        onClick={() =>
                          onLeadSelect && onLeadSelect(leadActivity.leadId)
                        }
                        className={`p-2 rounded border cursor-pointer hover:shadow-sm transition-shadow h-16 flex flex-col ${cardColor}`}
                        title={`${leadActivity.leadName} - ${totalActivities} activities (${messageCount} messages, ${callCount} calls)`}
                      >
                        {/* Lead name */}
                        <div className="font-medium text-sm truncate flex-shrink-0">
                          {leadActivity.leadName}
                        </div>

                        {/* Middle row with activity indicators and status */}
                        <div className="flex items-center justify-between text-xs flex-shrink-0">
                          <div className="flex items-center space-x-2">
                            {messageCount > 0 && (
                              <span className="flex items-center">
                                💬 {messageCount}
                              </span>
                            )}
                            {callCount > 0 && (
                              <span className="flex items-center">
                                📞 {callCount}
                              </span>
                            )}
                          </div>

                          {/* Status indicator */}
                          <div className="flex items-center">
                            {hasScheduled && (
                              <span className="text-blue-600 font-medium">
                                ⏰
                              </span>
                            )}
                            {hasSuccessful && !hasScheduled && (
                              <span className="text-green-600 font-medium">
                                ✓
                              </span>
                            )}
                            {hasFailed && (
                              <span className="text-red-600 font-medium">
                                ✗
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Time range - bottom row */}
                        <div className="text-xs opacity-75 truncate flex-shrink-0 mt-auto">
                          {leadActivity.activities.length === 1
                            ? formatTimeToLocal(
                                leadActivity.activities[0].scheduledAt
                              )
                            : `${formatTimeToLocal(
                                leadActivity.activities[0].scheduledAt
                              )} - ${formatTimeToLocal(
                                leadActivity.activities[
                                  leadActivity.activities.length - 1
                                ].scheduledAt
                              )}`}
                        </div>
                      </div>
                    );
                  })}
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
