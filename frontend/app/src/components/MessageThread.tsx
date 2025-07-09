import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import callApi, { Call } from "../api/callApi";
import { MessageRow } from "../../../../backend/models/Message";
import MessageInput from "./MessageInput";
import CommunicationList from "./CommunicationList";
import { VoiceCallButton } from "./VoiceCallButton";
import { VoiceCallModal } from "./VoiceCallModal";
import { CallMode } from "../services/webrtcVoiceService";
import "../styles/MessageThread.css";
import AppointmentModal from "./AppointmentModal";
import SearchCriteriaModal from "./SearchCriteriaModal";
import appointmentApi from "../api/appointmentApi";

// Communication item interface for unified timeline
interface CommunicationItem {
  id: string;
  type: "message" | "call";
  timestamp: string;
  data: MessageRow | Call;
}

// Custom hook for communication fetching (messages + calls)
const useCommunicationFetching = (leadId: number) => {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunications = useCallback(async () => {
    if (!leadId) return;

    setError(null);

    try {
      console.log(`🔍 Fetching communications for lead ${leadId}...`);

      // Fetch messages
      const fetchedMessages = await messageApi.getMessagesByLeadIdDescending(
        leadId
      );
      console.log(`📧 Fetched ${fetchedMessages?.length || 0} messages`);

      // Fetch calls for this lead
      console.log(`📞 Fetching calls for lead ${leadId}...`);
      const fetchedCalls = await callApi.getCallsForLead(leadId);
      console.log(
        `📞 Fetched ${fetchedCalls?.length || 0} calls:`,
        fetchedCalls
      );

      // Debug: log call statuses
      if (fetchedCalls && fetchedCalls.length > 0) {
        const statusCounts = fetchedCalls.reduce((acc, call) => {
          acc[call.status] = (acc[call.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log(`📊 Call status breakdown:`, statusCounts);
      }

      setMessages(fetchedMessages || []);
      // Filter out stuck "in-progress" calls older than 30 minutes
      const filteredCalls = (fetchedCalls || []).filter((call) => {
        if (call.status !== "in-progress") return true;

        const callTime = new Date(call.started_at || call.created_at);
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Keep recent in-progress calls, filter out old stuck ones
        return callTime > thirtyMinutesAgo;
      });

      setCalls(filteredCalls);
    } catch (err) {
      console.error("❌ Error fetching communications:", err);
      setError("Failed to load communications");
    }
  }, [leadId]);

  // Create unified timeline
  const communicationItems: CommunicationItem[] = useMemo(() => {
    console.log(`🔍 Creating timeline for lead ${leadId}:`, {
      messagesCount: messages.length,
      callsCount: calls.length,
      completedCalls: calls.filter((c) => c.status === "completed").length,
      leadIdType: typeof leadId,
      actualLeadId: leadId,
    });

    // Filter out scheduled messages from the timeline - they should only appear in the "Next message" section
    const deliveredMessages = messages.filter(
      (msg) => msg.delivery_status !== "scheduled"
    );

    console.log(`📋 Filtered messages:`, {
      totalMessages: messages.length,
      deliveredMessages: deliveredMessages.length,
      scheduledMessages: messages.length - deliveredMessages.length,
    });

    const items = [
      ...deliveredMessages.map((msg) => ({
        id: `msg-${msg.id}`,
        type: "message" as const,
        timestamp: msg.created_at || new Date().toISOString(),
        data: msg,
      })),
      ...calls.map((call) => ({
        id: `call-${call.id}`,
        type: "call" as const,
        timestamp: call.created_at,
        data: call,
      })),
    ].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log(`📋 Timeline created:`, {
      totalItems: items.length,
      callItems: items.filter((i) => i.type === "call").length,
      messageItems: items.filter((i) => i.type === "message").length,
    });

    return items;
  }, [messages, calls, leadId]);

  // Initial fetch
  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  // Set up periodic refresh
  useEffect(() => {
    const intervalId = setInterval(fetchCommunications, 30000);
    return () => clearInterval(intervalId);
  }, [fetchCommunications]);

  return {
    messages,
    setMessages,
    calls,
    communicationItems,
    error,
    refreshCommunications: fetchCommunications,
  } as const;
};

interface MessageThreadProps {
  leadId: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  leadType?: string;
  leadSource?: string;
  nextScheduledMessage?: string;
  messageCount?: number;
  onClose: () => void;
  onLeadUpdate: (leadId: number, nextScheduledMessage: string | null) => void;
  onAppointmentCreated: (appointment: any) => void;
  onAppointmentUpdated: (appointment: any) => void;
  onAppointmentDeleted: (appointmentId: number) => void;
  initialMessages?: MessageRow[];
  isOpen?: boolean;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  leadType,
  nextScheduledMessage: propNextScheduledMessage,
  initialMessages = [],
}) => {
  const {
    messages,
    setMessages,
    calls,
    communicationItems,
    refreshCommunications,
  } = useCommunicationFetching(leadId);

  const [error, setError] = useState<string | null>(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState<boolean | null>(
    null
  );
  const [isSending, setIsSending] = useState(false);
  const [nextScheduledMessage, setNextScheduledMessage] = useState<
    string | undefined
  >("Tomorrow at 10:00 AM");
  const [nextScheduledCall, setNextScheduledCall] = useState<
    string | undefined
  >(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSearchCriteriaModal, setShowSearchCriteriaModal] = useState(false);

  const [showAiDisableConfirmation, setShowAiDisableConfirmation] =
    useState(false);
  const [scheduledMessageCount, setScheduledMessageCount] = useState(0);

  // Voice calling state
  const [showVoiceCallModal, setShowVoiceCallModal] = useState(false);
  const [selectedCallMode, setSelectedCallMode] = useState<CallMode | null>(
    null
  );

  // Update local state when prop changes
  useEffect(() => {
    setNextScheduledMessage(propNextScheduledMessage);
  }, [propNextScheduledMessage]);

  // Listen for message-sent events and cleanup intervals
  useEffect(() => {
    const handleMessageSent = (event: CustomEvent<{ leadId: number }>) => {
      // Only refresh if this event is for the current lead
      if (event.detail.leadId === leadId) {
        // Force a full refresh of the communications
        setTimeout(() => {
          refreshCommunications();

          // Scroll to bottom after refresh
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
          }, 300);
        }, 500);
      }
    };

    // Add event listener
    window.addEventListener("message-sent", handleMessageSent as EventListener);

    // Clean up
    return () => {
      window.removeEventListener(
        "message-sent",
        handleMessageSent as EventListener
      );
    };
  }, [leadId, refreshCommunications]);

  // Reset AI Assistant state when leadId changes and fetch lead data
  useEffect(() => {
    // Reset AI assistant state when lead changes
    setAiAssistantEnabled(null);

    const fetchLeadData = async () => {
      try {
        setError(null);
        const lead = await leadApi.getLead(leadId);

        setAiAssistantEnabled(lead.is_ai_enabled);
      } catch (err) {
        setError("Failed to load lead data");
        console.error("Error fetching lead data:", err);
      }
    };

    if (leadId) {
      fetchLeadData();
      fetchUpcomingActivities();
    }
  }, [leadId]);

  // Toggle AI Assistant
  const handleToggleAiAssistant = async () => {
    // If turning on, just do it directly
    if (!aiAssistantEnabled) {
      await updateAiAssistantState(true);
      await leadApi.scheduleNextFollowUp(leadId);
      fetchUpcomingActivities(); // Refresh to show new scheduled message
      return;
    }

    // If turning off, first check for scheduled messages
    try {
      const allMessages = await messageApi.getMessagesByLeadIdDescending(
        leadId
      );
      const scheduledMessages = allMessages.filter(
        (message) => message.delivery_status === "scheduled"
      );

      setScheduledMessageCount(scheduledMessages.length);

      if (scheduledMessages.length > 0) {
        // Show confirmation modal
        setShowAiDisableConfirmation(true);
      } else {
        // No scheduled messages, proceed with disabling
        await updateAiAssistantState(false);
      }
    } catch (error) {
      console.error("Error checking for scheduled messages:", error);
      setError("Failed to check for scheduled messages. Please try again.");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Handle actual state update after confirmation
  const updateAiAssistantState = async (newAiState: boolean) => {
    setAiAssistantEnabled(newAiState);

    try {
      await leadApi.updateLead(leadId, {
        id: leadId,
        is_ai_enabled: newAiState,
      } as any);

      // If turning off AI Assistant, delete any scheduled messages
      if (!newAiState) {
        try {
          // Find any scheduled messages for this lead
          const allMessages = await messageApi.getMessagesByLeadIdDescending(
            leadId
          );
          const scheduledMessages = allMessages.filter(
            (message) => message.delivery_status === "scheduled"
          );

          if (scheduledMessages.length > 0) {
            console.log(
              `Deleting ${scheduledMessages.length} scheduled messages for lead ${leadId}`
            );

            // Delete each scheduled message
            for (const msg of scheduledMessages) {
              await messageApi.deleteMessage(String(msg.id));
            }

            // Clear the next scheduled message display
            setNextScheduledMessage(undefined);

            // Refresh messages to update the UI
            refreshCommunications();
            fetchUpcomingActivities();

            // Dispatch an event to update any parent components
            window.dispatchEvent(
              new CustomEvent("lead-updated", {
                detail: {
                  leadId: leadId,
                  nextScheduledMessage: null,
                },
              })
            );
          }
        } catch (deleteError) {
          console.error("Error deleting scheduled messages:", deleteError);
          // Don't revert AI status, just log the error
        }
      }
    } catch (error) {
      console.error("Error updating lead with AI Assistant status:", error);
      setError("Failed to update AI Assistant setting. Please try again.");

      // Revert UI state back if the API call fails
      setAiAssistantEnabled(!newAiState);

      // Clear error message after a few seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (text: string) => {
    if (text.trim() === "" || !leadId) return;

    try {
      console.log("Sending message with data:", {
        leadId,
        text,
        leadIdType: typeof leadId,
      });

      setIsSending(true);
      const numericLeadId =
        typeof leadId === "string" ? parseInt(leadId, 10) : leadId;

      if (isNaN(numericLeadId)) {
        throw new Error("Invalid lead ID");
      }

      const messageData = {
        lead_id: numericLeadId,
        message_text: text,
        direction: "outbound" as const,
        delivery_status: "sent" as const,
      };

      const sentMessage = await messageApi.sendMessage(messageData);

      // Update local state immediately
      setMessages((prevMessages) => [sentMessage, ...prevMessages]);

      // Scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);

      // Refresh upcoming activities after sending message
      fetchUpcomingActivities();

      // Dispatch a custom event so other components can react
      window.dispatchEvent(
        new CustomEvent("message-sent", {
          detail: { leadId: numericLeadId },
        })
      );
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Failed to send message. Please try again."
      );

      // Clear error message after a few seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsSending(false);
    }
  };

  // Voice calling handlers
  const handleCallStarted = (mode: CallMode) => {
    console.log(`Call started with mode: ${mode}`);
    setSelectedCallMode(mode);
    setShowVoiceCallModal(true);

    // Refresh communications to show the new call
    setTimeout(() => {
      refreshCommunications();
    }, 1000);
  };

  const handleCallEnded = () => {
    console.log("Call ended");
    setShowVoiceCallModal(false);
    setSelectedCallMode(null);

    // Refresh communications immediately and then again after a delay to pick up completed status
    refreshCommunications();

    // Force another refresh after 3 seconds to ensure status updates are captured
    setTimeout(() => {
      console.log("🔄 Refreshing communications after call ended");
      refreshCommunications();
    }, 3000);

    // Dispatch call completion event for global listeners (like LeadManagement)
    console.log("📢 Dispatching call-completed event from MessageThread");
    window.dispatchEvent(new CustomEvent("call-completed"));
  };

  // Format scheduled date for display
  const formatScheduledDate = (dateString?: string) => {
    if (!dateString) return "No messages scheduled";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = date.toDateString() === now.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      if (isToday) {
        return `Today at ${date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })}`;
      } else if (isTomorrow) {
        return `Tomorrow at ${date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })}`;
      } else {
        return date.toLocaleString("en-US", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        });
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Listen for lead updates from other components
  useEffect(() => {
    const handleLeadUpdated = (
      event: CustomEvent<{
        leadId: number;
        nextScheduledMessage: string | null;
      }>
    ) => {
      // Only update if this event is for the current lead
      if (event.detail.leadId === leadId) {
        setNextScheduledMessage(event.detail.nextScheduledMessage || undefined);
      }
    };

    // Add event listener
    window.addEventListener("lead-updated", handleLeadUpdated as EventListener);

    // Clean up
    return () => {
      window.removeEventListener(
        "lead-updated",
        handleLeadUpdated as EventListener
      );
    };
  }, [leadId]);

  // Helper function to get days until date
  const getDaysUntil = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays === -1) return "yesterday";
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `in ${diffDays} days`;
  };

  // Fetch upcoming activities
  const fetchUpcomingActivities = async () => {
    try {
      // Get next scheduled message
      const nextMessage = await messageApi.getNextScheduledMessageForLead(
        leadId
      );
      if (nextMessage && nextMessage.scheduled_at) {
        const scheduledDate = new Date(nextMessage.scheduled_at);
        const daysUntil = getDaysUntil(scheduledDate);
        setNextScheduledMessage(
          `${scheduledDate.toLocaleString("en-US", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })} (${daysUntil})`
        );
      } else {
        setNextScheduledMessage(undefined);
      }

      // Get next scheduled appointment (call/property showing)
      try {
        const appointments = await appointmentApi.getAppointmentsByLeadId(
          leadId
        );
        const upcomingAppointments = appointments
          .filter((apt) => {
            // Only show future appointments with status 'scheduled'
            return (
              apt.start_time_at &&
              new Date(apt.start_time_at) > new Date() &&
              apt.status === "scheduled"
            );
          })
          .sort((a, b) => {
            // Sort by start time, earliest first
            const dateA = a.start_time_at
              ? new Date(a.start_time_at)
              : new Date(0);
            const dateB = b.start_time_at
              ? new Date(b.start_time_at)
              : new Date(0);
            return dateA.getTime() - dateB.getTime();
          });

        if (upcomingAppointments.length > 0) {
          const nextAppointment = upcomingAppointments[0];
          const appointmentDate = new Date(nextAppointment.start_time_at!);
          const daysUntil = getDaysUntil(appointmentDate);
          setNextScheduledCall(
            `${appointmentDate.toLocaleString("en-US", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })} (${daysUntil}) - ${nextAppointment.title}`
          );
        } else {
          setNextScheduledCall(undefined);
        }
      } catch (appointmentError) {
        console.error("Error fetching appointments:", appointmentError);
        setNextScheduledCall(undefined);
      }
    } catch (error) {
      console.error("Error fetching upcoming activities:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with lead info and actions */}
      <div className="border-b border-gray-200 shadow-sm bg-white">
        {/* Top row - Lead info and main actions */}
        <div className="px-4 py-3 flex justify-between items-center">
          {/* Left side - Lead info */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
              {leadName ? leadName.charAt(0).toUpperCase() : "L"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {leadName}
                </h2>
                {leadType && (
                  <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    {leadType === "seller" ? "Seller" : "Buyer"}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                {leadPhone && (
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>{leadPhone}</span>
                  </div>
                )}
                {leadEmail && (
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span>{leadEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center space-x-4">
            {/* Call buttons group */}
            <div className="flex items-center space-x-2">
              <VoiceCallButton
                leadId={leadId}
                leadData={{
                  name: leadName,
                  phone: leadPhone || "",
                  email: leadEmail,
                  first_name: leadName.split(" ")[0] || "",
                  last_name: leadName.split(" ").slice(1).join(" ") || "",
                }}
                onCallStarted={handleCallStarted}
                onCallEnded={handleCallEnded}
                className="gap-1"
              />
            </div>

            {/* Refresh button */}
            <button
              onClick={() => {
                console.log("🔄 Manual refresh triggered");
                refreshCommunications();
              }}
              className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh calls and messages"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Commented out buttons */}
            {/* <div className="flex items-center space-x-2 border-l border-gray-200 pl-3">
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                title="Schedule appointment"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Appointment
              </button>
              <button
                onClick={() => setShowSearchCriteriaModal(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                title="Set search criteria"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
                Search
              </button>
            </div> */}
          </div>
        </div>

        {/* Bottom row - AI Assistant and status */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          {/* AI Assistant controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                AI Assistant:
              </span>
              <button
                onClick={handleToggleAiAssistant}
                disabled={aiAssistantEnabled === null}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  aiAssistantEnabled
                    ? "bg-blue-600"
                    : "bg-gray-200 hover:bg-gray-300"
                } ${
                  aiAssistantEnabled === null
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    aiAssistantEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  aiAssistantEnabled ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {aiAssistantEnabled === null
                  ? "Loading..."
                  : aiAssistantEnabled
                  ? "ON"
                  : "OFF"}
              </span>
            </div>
          </div>

          {/* Upcoming Activities */}
          {(nextScheduledMessage || nextScheduledCall) && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {nextScheduledMessage && (
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-4 h-4 text-orange-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Next message:</span>
                  <span>{nextScheduledMessage}</span>
                </div>
              )}
              {nextScheduledCall && (
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="font-medium">Next appointment:</span>
                  <span>{nextScheduledCall}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="px-3 pb-3">
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <CommunicationList items={communicationItems} />
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 p-3">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isSending}
          placeholder={
            isSending
              ? "Sending message..."
              : "Type your message to the lead..."
          }
        />
      </div>

      {/* Modals */}
      {showAppointmentModal && (
        <AppointmentModal
          leadId={leadId}
          leadName={leadName}
          onClose={() => setShowAppointmentModal(false)}
          onAppointmentCreated={() => {
            refreshCommunications();
            fetchUpcomingActivities();
          }}
          onAppointmentUpdated={() => {
            refreshCommunications();
            fetchUpcomingActivities();
          }}
          onAppointmentDeleted={() => {
            refreshCommunications();
            fetchUpcomingActivities();
          }}
        />
      )}

      {showSearchCriteriaModal && (
        <SearchCriteriaModal
          leadId={leadId}
          leadName={leadName}
          onClose={() => setShowSearchCriteriaModal(false)}
        />
      )}

      {/* Voice Call Modal */}
      {showVoiceCallModal && selectedCallMode && (
        <VoiceCallModal
          isOpen={showVoiceCallModal}
          onClose={() => setShowVoiceCallModal(false)}
          leadName={leadName}
          leadPhone={leadPhone || ""}
          callMode={selectedCallMode}
          leadId={leadId}
        />
      )}

      {/* AI Disable Confirmation Modal */}
      {showAiDisableConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Disable AI Assistant?
            </h3>
            <p className="text-gray-600 mb-4">
              This lead has {scheduledMessageCount} scheduled message
              {scheduledMessageCount === 1 ? "" : "s"}. Disabling the AI
              Assistant will delete all scheduled messages.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAiDisableConfirmation(false);
                  updateAiAssistantState(false);
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Yes, Disable & Delete Messages
              </button>
              <button
                onClick={() => setShowAiDisableConfirmation(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
