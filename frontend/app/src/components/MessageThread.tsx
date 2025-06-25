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
import "../styles/MessageThread.css";
import AppointmentModal from "./AppointmentModal";
import SearchCriteriaModal from "./SearchCriteriaModal";

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
      // Fetch messages
      const fetchedMessages = await messageApi.getMessagesByLeadIdDescending(
        leadId
      );

      // Try to fetch calls, but don't crash if it fails
      let fetchedCalls: Call[] = [];
      try {
        fetchedCalls = await callApi.getCallsForLead(leadId);
      } catch (error) {
        console.warn("Failed to fetch calls:", error);
      }

      setMessages(fetchedMessages || []);
      setCalls(fetchedCalls || []);
    } catch (err) {
      console.error("Error fetching communications:", err);
      setError("Failed to load communications");
    }
  }, [leadId]);

  // Create unified timeline
  const communicationItems: CommunicationItem[] = useMemo(
    () =>
      [
        ...messages.map((msg) => ({
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
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [messages, calls]
  );

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
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [callSuccess, setCallSuccess] = useState<string | null>(null);
  const [currentCallStatus, setCurrentCallStatus] = useState<{
    status:
      | "idle"
      | "initiating"
      | "ringing"
      | "in-progress"
      | "completed"
      | "failed";
    callId?: number;
    duration?: number;
    startTime?: Date;
  }>({ status: "idle" });
  const [callStatusInterval, setCallStatusInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [nextScheduledMessage, setNextScheduledMessage] = useState<
    string | undefined
  >("Tomorrow at 10:00 AM");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSearchCriteriaModal, setShowSearchCriteriaModal] = useState(false);

  const [showAiDisableConfirmation, setShowAiDisableConfirmation] =
    useState(false);
  const [scheduledMessageCount, setScheduledMessageCount] = useState(0);

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

      // Clear call status polling interval
      if (callStatusInterval) {
        clearInterval(callStatusInterval);
      }
    };
  }, [leadId, refreshCommunications, callStatusInterval]);

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
    }
  }, [leadId]);

  // Toggle AI Assistant
  const handleToggleAiAssistant = async () => {
    // If turning on, just do it directly
    if (!aiAssistantEnabled) {
      await updateAiAssistantState(true);
      await leadApi.scheduleNextFollowUp(leadId);
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

      // Send the message
      const sentMessage = await messageApi.createOutgoingMessage(
        numericLeadId,
        text
      );
      console.log("Message sent successfully:", sentMessage);

      setIsSending(false);

      // Ensure the message has createdAt timestamp
      if (!sentMessage.created_at) {
        sentMessage.created_at = new Date().toISOString();
      }

      // Add the new message to state
      setMessages((prev) => [...prev, sentMessage]);

      // Force a full refresh after a short delay to ensure message is visible
      setTimeout(() => {
        refreshCommunications();
      }, 1000);

      // If AI is enabled, refresh lead data after a short delay to get the updated nextScheduledMessage
      if (aiAssistantEnabled) {
        setTimeout(async () => {
          try {
            console.log(
              "Refreshing lead data after sending message to get updated nextScheduledMessage"
            );
            await leadApi.getLead(leadId);

            // check messages for "scheduled" delivery_status and set nextScheduledMessage to the first one
            const scheduledMessage = messages.find(
              (message) => message.delivery_status === "scheduled"
            );

            if (scheduledMessage) {
              setNextScheduledMessage(scheduledMessage.text || undefined);
            }

            // Dispatch an event to update any parent components
            window.dispatchEvent(
              new CustomEvent("lead-updated", {
                detail: {
                  leadId: leadId,
                  nextScheduledMessage: scheduledMessage?.text || undefined,
                },
              })
            );
          } catch (err) {
            console.error(
              "Error refreshing lead data after sending message:",
              err
            );
          }
        }, 5000); // Wait 5 seconds for AI to respond
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
    }
  };

  // Format next scheduled message date and time
  const formatScheduledDate = (dateString?: string) => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(
          "Invalid date format for nextScheduledMessage:",
          dateString
        );
        return null;
      }

      // Calculate days until scheduled message
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Format with day of week, month date, and time
      return {
        date: date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        daysUntil: diffDays,
      };
    } catch (error) {
      console.error("Error formatting scheduled date:", error);
      return null;
    }
  };

  // Get formatted scheduled message date and time
  const scheduledDateTime = formatScheduledDate(nextScheduledMessage);

  // Listen for lead-updated events to update the nextScheduledMessage without requiring a refresh
  useEffect(() => {
    const handleLeadUpdated = (
      event: CustomEvent<{
        leadId: number;
        nextScheduledMessage: string | null;
      }>
    ) => {
      const { leadId: updatedLeadId, nextScheduledMessage: updatedSchedule } =
        event.detail;

      // Only update if this event is for our lead
      if (updatedLeadId === leadId) {
        console.log(
          "Received lead-updated event, updating nextScheduledMessage:",
          updatedSchedule
        );

        // Update our local state for immediate UI refresh
        setNextScheduledMessage(updatedSchedule || undefined);

        // Update the parent component's props through the window event
        // This is just to maintain consistent data state, the actual UI update comes from
        // the nextScheduledMessage prop which will be updated by the parent component
        window.dispatchEvent(
          new CustomEvent("lead-updated", {
            detail: {
              leadId: leadId,
              nextScheduledMessage: updatedSchedule,
            },
          })
        );
      }
    };

    // Add the event listener
    window.addEventListener("lead-updated", handleLeadUpdated as EventListener);

    // Clean up
    return () => {
      window.removeEventListener(
        "lead-updated",
        handleLeadUpdated as EventListener
      );
    };
  }, [leadId]);

  // Handle manual call initiation
  const handleInitiateCall = async () => {
    try {
      setIsInitiatingCall(true);
      setError(null);
      setCallSuccess(null);
      setCurrentCallStatus({
        status: "initiating",
        startTime: new Date(),
      });

      const result = await callApi.initiateCall(leadId);

      setCurrentCallStatus({
        status: "ringing",
        callId: result.callId,
        startTime: new Date(),
      });

      setCallSuccess("Call initiated! Ringing the lead now...");

      // Start polling for call status updates
      startCallStatusPolling(result.callId);

      // Refresh communications to show the new call
      setTimeout(() => {
        refreshCommunications();
      }, 2000);

      // Clear success message after call progresses
      setTimeout(() => {
        setCallSuccess(null);
      }, 3000);
    } catch (error: any) {
      setCurrentCallStatus({ status: "failed" });
      setError(
        error.response?.data?.error ||
          "Failed to initiate call. Please try again."
      );

      // Clear error message after a few seconds
      setTimeout(() => {
        setError(null);
        setCurrentCallStatus({ status: "idle" });
      }, 5000);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // Poll for call status updates
  const startCallStatusPolling = (callId: number) => {
    if (callStatusInterval) {
      clearInterval(callStatusInterval);
    }

    const interval = setInterval(async () => {
      try {
        const calls = await callApi.getCallsForLead(leadId);
        const currentCall = calls.find((call) => call.id === callId);

        if (currentCall) {
          const status = mapTwilioStatusToUI(currentCall.status);
          const duration = calculateCallDuration(currentCall);

          setCurrentCallStatus({
            status,
            callId,
            duration,
            startTime: new Date(currentCall.created_at),
          });

          // Stop polling if call is completed or failed
          if (status === "completed" || status === "failed") {
            clearInterval(interval);
            setCallStatusInterval(null);

            // Show final status message
            if (status === "completed") {
              setCallSuccess(
                `Call completed successfully! Duration: ${formatDuration(
                  duration
                )}`
              );
            } else {
              setError("Call failed or was not answered.");
            }

            // Clear status after delay
            setTimeout(() => {
              setCurrentCallStatus({ status: "idle" });
              setCallSuccess(null);
              setError(null);
            }, 5000);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch call status:", error);
      }
    }, 2000); // Poll every 2 seconds

    setCallStatusInterval(interval);

    // Stop polling after 5 minutes regardless
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setCallStatusInterval(null);
        setCurrentCallStatus({ status: "idle" });
      }
    }, 300000);
  };

  // Helper functions
  const mapTwilioStatusToUI = (twilioStatus: string) => {
    switch (twilioStatus) {
      case "queued":
      case "initiated":
        return "initiating";
      case "ringing":
        return "ringing";
      case "in-progress":
        return "in-progress";
      case "completed":
        return "completed";
      case "busy":
      case "failed":
      case "no-answer":
      case "canceled":
        return "failed";
      default:
        return "idle";
    }
  };

  const calculateCallDuration = (call: any) => {
    if (!call.started_at) return 0;
    const start = new Date(call.started_at);
    const end = call.ended_at ? new Date(call.ended_at) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with lead info and actions */}
      <div className="border-b border-gray-200 shadow-sm">
        <div className="p-3 flex justify-between items-center">
          {/* Left side - Lead info */}
          <div className="flex items-center">
            <div className="mr-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                {leadName ? leadName.charAt(0).toUpperCase() : "L"}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {leadName}
                {leadType && (
                  <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {leadType === "seller" ? "Seller" : "Buyer"}
                  </span>
                )}
              </h2>
              <div className="flex items-center text-sm">
                {leadPhone && (
                  <span className="text-gray-500 mr-3 flex items-center">
                    <svg
                      className="w-3.5 h-3.5 mr-1 text-gray-400"
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
                    {leadPhone}
                  </span>
                )}
                {leadEmail && (
                  <span className="text-gray-500 flex items-center">
                    <svg
                      className="w-3.5 h-3.5 mr-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {leadEmail}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Status and actions */}
          <div className="flex items-center">
            <div className="flex items-center mr-4"></div>

            <div className="flex items-center">
              <span className="mr-2 text-sm text-gray-600">AI Assistant</span>
              <button
                onClick={() => {
                  // Only toggle if we've loaded the value
                  if (aiAssistantEnabled !== null) {
                    handleToggleAiAssistant();
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  aiAssistantEnabled === null
                    ? "bg-gray-200" // Loading state
                    : aiAssistantEnabled
                    ? "bg-blue-500"
                    : "bg-gray-300"
                }`}
                type="button"
                disabled={aiAssistantEnabled === null}
              >
                {aiAssistantEnabled === null ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-3 animate-pulse"></span>
                ) : (
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiAssistantEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div>
        {scheduledDateTime && (
          <div className="px-4 py-2 flex items-center border-b border-gray-100">
            <div className="mr-3 text-blue-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Next:</span>
              <span className="text-sm font-medium">
                {scheduledDateTime.date} at {scheduledDateTime.time}
              </span>
              {scheduledDateTime.daysUntil > 0 && (
                <span className="ml-2 text-xs text-blue-600">
                  in {scheduledDateTime.daysUntil} days
                </span>
              )}
              {scheduledDateTime.daysUntil === 0 && (
                <span className="ml-2 text-xs text-green-600 font-medium">
                  Today
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mx-4 mt-2 bg-red-50 border-l-4 border-red-400 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {callSuccess && (
        <div className="mx-4 mt-2 bg-green-50 border-l-4 border-green-400 p-3 text-green-700 text-sm">
          {callSuccess}
        </div>
      )}

      {/* Real-time Call Status Indicator */}
      {currentCallStatus.status !== "idle" && (
        <div className="mx-4 mt-2 bg-blue-50 border-l-4 border-blue-400 p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {currentCallStatus.status === "initiating" && (
                <svg
                  className="w-5 h-5 text-blue-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {currentCallStatus.status === "ringing" && (
                <svg
                  className="w-5 h-5 text-blue-500 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              )}
              {currentCallStatus.status === "in-progress" && (
                <svg
                  className="w-5 h-5 text-green-500 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {(currentCallStatus.status === "completed" ||
                currentCallStatus.status === "failed") && (
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {currentCallStatus.status === "initiating" &&
                      "Initiating Call..."}
                    {currentCallStatus.status === "ringing" &&
                      "Ringing Lead..."}
                    {currentCallStatus.status === "in-progress" &&
                      "Call In Progress"}
                    {currentCallStatus.status === "completed" &&
                      "Call Completed"}
                    {currentCallStatus.status === "failed" && "Call Failed"}
                  </p>
                  <p className="text-xs text-blue-700">
                    {currentCallStatus.callId &&
                      `Call ID: ${currentCallStatus.callId}`}
                    {currentCallStatus.status === "in-progress" &&
                      currentCallStatus.duration !== undefined &&
                      ` • Duration: ${formatDuration(
                        currentCallStatus.duration
                      )}`}
                  </p>
                </div>
                {currentCallStatus.status === "in-progress" && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-xs text-green-600 font-medium">
                      LIVE
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto flex flex-col message-thread-container"
        id="message-container"
      >
        {/* Communications container */}
        <div className="flex-1">
          <CommunicationList items={communicationItems} />
        </div>
      </div>

      {/* Quick Actions bar */}
      <div className="border-t border-gray-200 bg-white">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-1 h-4 bg-blue-500 rounded-r mr-2"></div>
            <span className="text-xs font-medium text-gray-700">Actions</span>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => {
                setShowAppointmentModal(true);
              }}
              className="px-2 py-1 text-xs border border-gray-200 bg-white text-gray-600 rounded flex items-center"
              type="button"
            >
              <svg
                className="w-3 h-3 mr-1 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Appointments
            </button>
            <button
              onClick={() => {
                setShowSearchCriteriaModal(true);
              }}
              className="px-2 py-1 text-xs border border-gray-200 bg-white text-gray-600 rounded flex items-center"
              type="button"
            >
              <svg
                className="w-3 h-3 mr-1 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              Search Criteria
            </button>
            <button
              onClick={handleInitiateCall}
              disabled={isInitiatingCall || currentCallStatus.status !== "idle"}
              className={`px-2 py-1 text-xs border rounded flex items-center transition-all ${
                currentCallStatus.status === "in-progress"
                  ? "border-green-400 bg-green-100 text-green-800 animate-pulse"
                  : currentCallStatus.status === "ringing"
                  ? "border-blue-400 bg-blue-100 text-blue-800 animate-pulse"
                  : currentCallStatus.status === "initiating" ||
                    isInitiatingCall
                  ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              }`}
              type="button"
            >
              {currentCallStatus.status === "initiating" || isInitiatingCall ? (
                <svg
                  className="w-3 h-3 mr-1 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              )}
              {currentCallStatus.status === "initiating" || isInitiatingCall
                ? "Calling..."
                : currentCallStatus.status === "ringing"
                ? "Ringing..."
                : currentCallStatus.status === "in-progress"
                ? "In Call"
                : "Call Lead"}
            </button>
          </div>
        </div>

        {/* AI Assistant message or input */}
        {aiAssistantEnabled ? (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex items-center justify-center text-gray-600 text-sm border border-gray-200 rounded-md p-2 bg-gray-50">
              <svg
                className="w-4 h-4 mr-2 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <span>
                AI Assistant is enabled and will automatically follow up with
                this lead
              </span>
            </div>
          </div>
        ) : (
          <MessageInput
            leadId={leadId}
            onSendMessage={handleSendMessage}
            isLoading={isSending}
          />
        )}
      </div>

      <AppointmentModal
        lead_id={leadId}
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSuccess={() => {
          // Appointment scheduled successfully
        }}
      />

      {/* Search Criteria Modal */}
      <SearchCriteriaModal
        leadId={leadId}
        isOpen={showSearchCriteriaModal}
        onClose={() => setShowSearchCriteriaModal(false)}
      />

      {/* AI Assistant Disable Confirmation Modal */}
      {showAiDisableConfirmation && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Modal panel */}
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Disable AI Assistant
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Turning off the AI Assistant will delete{" "}
                        {scheduledMessageCount} scheduled{" "}
                        {scheduledMessageCount === 1 ? "message" : "messages"}{" "}
                        for this lead. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowAiDisableConfirmation(false);
                    updateAiAssistantState(false);
                  }}
                >
                  Disable & Delete Messages
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowAiDisableConfirmation(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
