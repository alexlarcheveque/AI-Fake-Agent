import React, { useState, useEffect, useCallback, useRef } from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import { Message } from "../../../../backend/models/Message";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import AppointmentCreator from "./AppointmentCreator";
import AppointmentsList from "./AppointmentsList";
import { useNotifications } from "../contexts/NotificationContext";
import "../styles/MessageThread.css";

// Custom hook for message fetching
const useMessageFetching = (lead_id: number) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!lead_id) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedMessages = await messageApi.getMessagesByLeadIdDescending(
        lead_id
      );
      setMessages(fetchedMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [lead_id]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Set up periodic refresh
  useEffect(() => {
    const intervalId = setInterval(fetchMessages, 30000);
    return () => clearInterval(intervalId);
  }, [fetchMessages]);

  return {
    messages,
    setMessages,
    loading,
    error,
    refreshMessages: fetchMessages,
  } as const;
};

interface MessageThreadProps {
  lead_id: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  leadType?: string;
  leadSource?: string;
  nextScheduledMessage?: string;
  messageCount?: number;
  onClose: () => void;
  onLeadUpdate: (lead_id: number, nextScheduledMessage: string | null) => void;
  onAppointmentCreated: (appointment: any) => void;
  onAppointmentUpdated: (appointment: any) => void;
  onAppointmentDeleted: (appointmentId: number) => void;
  initialMessages?: Message[];
  isOpen?: boolean;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  lead_id,
  leadName,
  leadEmail,
  leadPhone,
  leadType,
  nextScheduledMessage: propNextScheduledMessage,
  initialMessages = [],
  isOpen = false,
}) => {
  const {
    messages,
    setMessages,
    loading,
    error: messageError,
    refreshMessages,
  } = useMessageFetching(lead_id);
  const [error, setError] = useState<string | null>(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [appointmentSuccess, setAppointmentSuccess] = useState<string | null>(
    null
  );
  const [calendarConfigurationError, setCalendarConfigurationError] =
    useState(false);
  const [nextScheduledMessage, setNextScheduledMessage] = useState<
    string | undefined
  >(propNextScheduledMessage);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { createNotification } = useNotifications();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(
    null
  );

  // Update local state when prop changes
  useEffect(() => {
    setNextScheduledMessage(propNextScheduledMessage);
  }, [propNextScheduledMessage]);

  // Fetch lead data on component mount and when lead_id changes
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setError(null);
        const lead = await leadApi.getLead(lead_id);
        console.log("lead", lead);
      } catch (err) {
        setError("Failed to load lead data");
        console.error("Error fetching lead data:", err);
      }
    };

    if (lead_id) {
      fetchLeadData();
    }
  }, [lead_id]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Toggle AI Assistant
  const handleToggleAiAssistant = async () => {
    setAiAssistantEnabled(!aiAssistantEnabled);
  };

  // Handle sending a new message
  const handleSendMessage = async (messageObj: Message | Message[]) => {
    const messageData = Array.isArray(messageObj) ? messageObj[0] : messageObj;

    // If we're receiving a complete message from MessageInput, just add it to state
    if (messageData.id) {
      console.log("Using existing message from input component:", messageData);
      setMessages((prev) => [...prev, messageData]);
      return;
    }

    // Otherwise, send a new message
    const { text, lead_id } = messageData;
    if (text.trim() === "" || !lead_id) return;

    try {
      console.log("Sending message with data:", {
        lead_id,
        text,
      });

      setIsSending(true);

      // Send the message
      const sentMessage = await messageApi.createOutgoingMessage(lead_id, text);
      console.log("Message sent successfully:", sentMessage);

      setIsSending(false);

      // Instead of fetching all messages again, just add the new one to state
      setMessages((prev) => [...prev, sentMessage]);
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
        lead_id: number;
        nextScheduledMessage: string | null;
      }>
    ) => {
      const { lead_id: updatedLeadId, nextScheduledMessage: updatedSchedule } =
        event.detail;

      if (updatedLeadId === lead_id) {
        console.log(
          "Received lead-updated event, updating nextScheduledMessage:",
          updatedSchedule
        );

        setNextScheduledMessage(updatedSchedule || undefined);

        window.dispatchEvent(
          new CustomEvent("lead-updated", {
            detail: {
              lead_id: lead_id,
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
  }, [lead_id]);

  useEffect(() => {
    console.log("MessageThread mounted with lead_id:", lead_id);

    return () => {
      console.log("MessageThread unmounted with lead_id:", lead_id);
    };
  }, []); // Empty dependency array means this runs once on mount and once on unmount

  useEffect(() => {
    console.log("Current messages state:", messages);
  }, [messages]);

  const handleAppointmentSuccess = (calendlyLink: string | null) => {
    setAppointmentSuccess("Appointment scheduled successfully!");

    // Refresh latest message to clear the appointment form
    setLatestMessage(null);
  };

  const handleAppointmentError = (error: any) => {
    console.error("Appointment error:", error);

    // Handle generic error
    setError(
      typeof error === "string"
        ? error
        : "An error occurred with the appointment"
    );

    setTimeout(() => {
      setError(null);
    }, 8000); // Show for a longer time so the user has time to read it
  };

  // Handle Calendly success
  const handleCalendlySuccess = (link: string) => {
    setAppointmentSuccess(`Calendly link created successfully: ${link}`);
    setTimeout(() => setAppointmentSuccess(null), 5000);
  };

  // Handle Calendly error
  const handleCalendlyError = (err: any) => {
    console.error("Error with Calendly:", err);

    // Set calendar configuration error
    setCalendarConfigurationError(true);

    // If error has a message, display it
    if (err && typeof err === "object" && "message" in err) {
      setError(err.message || "Failed to create Calendly link");
    } else {
      setError(
        "There was an issue with the Calendly integration. You can use manual scheduling instead."
      );
    }

    setTimeout(() => {
      setError(null);
    }, 8000);
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
                  console.log("AI Assistant toggle button clicked");
                  handleToggleAiAssistant();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  aiAssistantEnabled ? "bg-blue-500" : "bg-gray-300"
                }`}
                type="button"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    aiAssistantEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
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

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            className="ml-auto text-red-400"
            onClick={() => setError(null)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Success message */}
      {appointmentSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-600">{appointmentSuccess}</p>
          </div>
          <button
            className="ml-auto text-green-400"
            onClick={() => setAppointmentSuccess(null)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div
        className="flex-1 overflow-y-auto flex flex-col message-thread-container"
        id="message-container"
      >
        {/* Messages container */}
        <div className="flex-1">
          <MessageList messages={messages} />
        </div>
      </div>

      {/* Show appointments if requested */}
      {showAppointments && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close the modal when clicking on the background overlay
            if (e.target === e.currentTarget) {
              console.log("Closing appointments modal by clicking outside");
              setShowAppointments(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-medium">Appointments</h2>
              <button
                onClick={() => setShowAppointments(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <AppointmentsList lead_id={lead_id} />
              <div className="mt-4 pt-4 border-t">
                <AppointmentCreator
                  lead_id={lead_id}
                  messageText={latestMessage || undefined}
                  onSuccess={handleAppointmentSuccess}
                  onError={handleAppointmentError}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
                console.log("Appointments button clicked");
                setShowAppointments(true);
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
            lead_id={lead_id}
            onSendMessage={handleSendMessage}
            isLoading={isSending}
          />
        )}
      </div>
    </div>
  );
};

export default MessageThread;
