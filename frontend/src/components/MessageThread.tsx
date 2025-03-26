import React, { useState, useEffect } from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import appointmentApi, { ApiError } from "../api/appointmentApi";
import { Message } from "../types/message";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import AppointmentCreator from "./AppointmentCreator";
import AppointmentsList from "./AppointmentsList";
import FollowUpIndicator from "./FollowUpIndicator";
import { useSocket } from "../contexts/SocketContext";
import useCalendly from "../hooks/useCalendly";

interface MessageThreadProps {
  leadId: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  leadSource?: string;
  nextScheduledMessage?: string;
  messageCount?: number;
}

// Define interface for socket message data
interface SocketMessageData {
  leadId: number;
  message: Message;
}

interface SocketStatusData {
  leadId: number;
  messageId: number;
  status: "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | "read";
}

const MessageThread: React.FC<MessageThreadProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  leadSource,
  nextScheduledMessage,
  messageCount,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [appointmentSuccess, setAppointmentSuccess] = useState<string | null>(null);
  const [calendarConfigurationError, setCalendarConfigurationError] = useState(false);
  const { socket } = useSocket();

  // Use the Calendly hook
  const { 
    isCalendlyAvailable, 
    isCalendlyRequest, 
    createCalendlyLink, 
    loading: calendlyLoading 
  } = useCalendly(leadId);

  // Fetch messages and lead settings on component mount and when leadId changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [fetchedMessages, lead] = await Promise.all([
          messageApi.getMessages(leadId.toString()),
          leadApi.getLead(leadId),
        ]);
        setMessages(fetchedMessages);
        setAiAssistantEnabled(lead.aiAssistantEnabled);
      } catch (err) {
        setError("Failed to load messages");
        console.error("Error fetching data:", err);
      }
    };

    if (leadId) {
      fetchData();
    }
  }, [leadId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: SocketMessageData) => {
      // Make sure we're checking the correct lead ID format
      const currentLeadId =
        typeof leadId === "string" ? parseInt(leadId, 10) : leadId;

      if (data.leadId === currentLeadId) {
        console.log("Received new message via socket:", data.message);

        // Check if message contains appointment information or Calendly requests
        // Check all messages, not just inbound, since the AI could be confirming appointments
        if (data.message.isAiGenerated) {
          // Check for appointment information
          const appointmentDetails = appointmentApi.parseAppointmentFromAIMessage(data.message.text);
          if (appointmentDetails) {
            console.log("Appointment details detected:", appointmentDetails);
            setLatestMessage(data.message.text);
          }
          
          // Check for Calendly-related requests using the hook
          if (isCalendlyRequest(data.message.text)) {
            console.log("Calendly request detected in message");
            
            // If Calendly is available, create a link automatically
            if (isCalendlyAvailable && !calendlyLoading) {
              const clientName = leadName || "Client";
              const clientEmail = leadEmail || `${leadId}@example.com`;
              
              // Create a Calendly link automatically
              createCalendlyLink(
                clientName,
                clientEmail,
                handleCalendlySuccess,
                handleCalendlyError
              );
            } else {
              // Show the appointment form
              setLatestMessage(data.message.text);
            }
          }
        }

        // Check if this message is already in our state to avoid duplicates
        setMessages((prevMessages) => {
          const messageExists = prevMessages.some(
            (msg) => msg.id === data.message.id
          );
          if (messageExists) return prevMessages;
          return [...prevMessages, data.message];
        });

        // Play a notification sound
        const audio = new Audio("/notification.mp3");
        audio
          .play()
          .catch((err) => console.log("Error playing notification:", err));
      }
    };

    // Listen for both sent and received messages
    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, leadId]);

  // Add this useEffect to listen for status updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: SocketStatusData) => {
      // Make sure we're checking the correct lead ID format
      const currentLeadId =
        typeof leadId === "string" ? parseInt(leadId, 10) : leadId;

      if (data.leadId === currentLeadId) {
        console.log("Received status update:", data);

        // Update the message status in our state
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, deliveryStatus: data.status }
              : msg
          )
        );
      }
    };

    socket.on("message-status-update", handleStatusUpdate);

    return () => {
      socket.off("message-status-update", handleStatusUpdate);
    };
  }, [socket, leadId]);

  // Toggle AI Assistant
  const handleToggleAiAssistant = async () => {
    try {
      const updatedLead = await leadApi.updateLead(leadId, {
        aiAssistantEnabled: !aiAssistantEnabled,
      });
      setAiAssistantEnabled(updatedLead.aiAssistantEnabled);
    } catch (err) {
      setError("Failed to update AI Assistant setting");
      console.error("Error updating lead:", err);
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
      const sentMessage = await messageApi.sendMessage(numericLeadId, text);
      console.log("Message sent successfully:", sentMessage);

      setIsSending(false);

      // Instead of fetching all messages again, just add the new one to state
      setMessages((prev) => [...prev, sentMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
    }
  };

  useEffect(() => {
    console.log("MessageThread mounted with leadId:", leadId);

    return () => {
      console.log("MessageThread unmounted with leadId:", leadId);
    };
  }, []); // Empty dependency array means this runs once on mount and once on unmount

  useEffect(() => {
    console.log("Current messages state:", messages);
  }, [messages]);

  const handleAppointmentSuccess = (calendlyLink: string | null) => {
    if (calendlyLink) {
      // For Calendly direct link
      setAppointmentSuccess('Calendly scheduling link created successfully! The client can now choose from your available time slots.');
    } else {
      // For manual appointments
      setAppointmentSuccess('Appointment scheduled successfully!');
    }
    
    setTimeout(() => {
      setAppointmentSuccess(null);
    }, 8000); // Show for a longer time so the user has time to read it
    
    // Refresh latest message to clear the appointment form
    setLatestMessage(null);
  };
  
  const handleAppointmentError = (error: any) => {
    console.error('Appointment error:', error);
    
    // If it's an ApiError from our client
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as ApiError;
      
      // Set calendar configuration error if it's an auth error or related to Calendly
      if (apiError.isAuthError || apiError.code === 503 || 
          (apiError.message && (
            apiError.message.includes("Calendly") || 
            apiError.message.includes("calendar") || 
            apiError.message.includes("authentication")
          ))) {
        setCalendarConfigurationError(true);
        
        if (apiError.code === 503) {
          setError('Calendly service is temporarily unavailable. You can still create appointments manually.');
        } else {
          setError(apiError.message);
        }
      } else {
        setError(apiError.message);
      }
    } else {
      // Handle generic error
      setError(typeof error === 'string' ? error : 'An error occurred with the appointment');
    }
    
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
    if (err && typeof err === 'object' && 'message' in err) {
      setError(err.message || 'Failed to create Calendly link');
    } else {
      setError('There was an issue with the Calendly integration. You can use manual scheduling instead.');
    }
    
    setTimeout(() => {
      setError(null);
    }, 8000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
        <div>
          <h2 className="text-xl font-semibold">{leadName}</h2>
          <div className="text-sm text-gray-500">
            {leadPhone}{" "}
            {leadEmail && (
              <>
                • <span className="text-blue-500">{leadEmail}</span>
              </>
            )}
            {leadSource && (
              <>
                • <span className="text-gray-500">Source: {leadSource}</span>
              </>
            )}
            {messageCount && (
              <>
                • <span className="text-gray-500">Messages: {messageCount}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setShowAppointments(!showAppointments)}
            className={`mr-3 px-3 py-1.5 text-sm rounded-md flex items-center ${
              showAppointments
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {showAppointments ? "Hide Appointments" : "Show Appointments"}
          </button>
          <div className="flex items-center">
            <span className="mr-2 text-sm text-gray-600">AI Assistant:</span>
            <button 
              onClick={handleToggleAiAssistant} 
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                aiAssistantEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiAssistantEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main scrollable container */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Error Message - Enhanced to provide more context */}
        {error && (
          <div className="p-3 bg-red-100 text-red-700 text-sm flex-shrink-0 border-l-4 border-red-500">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {appointmentSuccess && (
          <div className="p-3 bg-green-100 text-green-700 text-sm flex-shrink-0 border-l-4 border-green-500">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Success</p>
                <p>{appointmentSuccess}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Calendar Configuration Error - Enhanced with more specific help */}
        {calendarConfigurationError && (
          <div className="p-4 border-b border-orange-200 bg-orange-50">
            <h3 className="text-orange-700 font-medium flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Calendar Integration Issue
            </h3>
            <p className="text-sm text-orange-600 mt-1">
              {error || 'There appears to be an issue with the calendar integration.'}
            </p>
            <ul className="list-disc ml-5 mt-1 text-sm text-orange-600">
              <li>The Calendly service might be temporarily unavailable</li>
              <li>There might be a missing or invalid Calendly API token</li>
              <li>There could be insufficient permissions on your Calendly account</li>
            </ul>
            <p className="text-sm text-orange-600 mt-1 font-medium">
              You can continue to use manual appointment scheduling in the meantime.
            </p>
            <div className="flex mt-2">
              <button 
                onClick={() => {
                  setCalendarConfigurationError(false);
                  setError(null);
                }}
                className="px-3 py-1 text-xs bg-white text-orange-700 border border-orange-300 rounded hover:bg-orange-50"
              >
                Dismiss
              </button>
              <button 
                onClick={() => window.open('https://docs.calendly.com/getting-started/authentication', '_blank')}
                className="ml-2 px-3 py-1 text-xs bg-orange-700 text-white rounded hover:bg-orange-800"
              >
                Calendly Documentation
              </button>
              <button 
                onClick={() => {
                  setCalendarConfigurationError(false);
                  setError(null);
                  setShowAppointments(true);
                }}
                className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Manual Scheduling
              </button>
            </div>
          </div>
        )}
        
        {/* Appointments Section */}
        {showAppointments && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-medium text-gray-900">Manage Appointments</h2>
                <button 
                  onClick={() => setShowAppointments(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <AppointmentsList leadId={leadId} />
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Appointment</h3>
                  <AppointmentCreator
                    leadId={leadId}
                    messageText={latestMessage || undefined}
                    onSuccess={handleAppointmentSuccess}
                    onError={handleAppointmentError}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* AI Detected Appointment */}
        {!calendarConfigurationError && latestMessage && appointmentApi.parseAppointmentFromAIMessage(latestMessage) && (
          <div className="p-4 border-b border-gray-200 bg-yellow-50">
            <div className="text-sm text-yellow-800 mb-2">
              {latestMessage.toLowerCase().includes('reschedule') ? (
                <strong>AI detected a rescheduled appointment.</strong> 
              ) : (
                <strong>AI detected a potential appointment request.</strong> 
              )}
              Would you like to {latestMessage.toLowerCase().includes('reschedule') ? 'update it in your calendar' : 'schedule it'}?
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAppointments(true)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {latestMessage.toLowerCase().includes('reschedule') ? 'Update Appointment' : 'Schedule Now'}
              </button>
              <button
                onClick={() => setLatestMessage(null)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {(() => {
                const details = appointmentApi.parseAppointmentFromAIMessage(latestMessage);
                return details ? (
                  <span>
                    Date: <strong>{details.date}</strong>, 
                    Time: <strong>{details.time}</strong>
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        )}
        
        {/* Calendly Request Detected */}
        {!calendarConfigurationError && latestMessage && isCalendlyRequest(latestMessage) && !appointmentApi.parseAppointmentFromAIMessage(latestMessage) && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="text-sm text-blue-800 mb-2">
              <strong>Calendly scheduling requested.</strong> Would you like to create a Calendly link?
            </div>
            <div className="flex space-x-2">
              {isCalendlyAvailable ? (
                <button
                  onClick={() => {
                    const clientName = leadName || "Client";
                    const clientEmail = leadEmail || `${leadId}@example.com`;
                    createCalendlyLink(clientName, clientEmail, handleCalendlySuccess, handleCalendlyError);
                  }}
                  disabled={calendlyLoading}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                >
                  {calendlyLoading ? "Creating..." : "Create Calendly Link"}
                </button>
              ) : (
                <button
                  onClick={() => setShowAppointments(true)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Use Manual Scheduling
                </button>
              )}
              <button
                onClick={() => setLatestMessage(null)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1">
          <MessageList messages={messages} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">Quick Actions:</div>
          <div className="flex space-x-2">
            {isCalendlyAvailable && (
              <button
                onClick={() => {
                  const clientName = leadName || "Client";
                  const clientEmail = leadEmail || `${leadId}@example.com`;
                  createCalendlyLink(clientName, clientEmail, handleCalendlySuccess, handleCalendlyError);
                }}
                disabled={calendlyLoading}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {calendlyLoading ? "Creating..." : "Create Calendly Link"}
              </button>
            )}
            <button
              onClick={() => setShowAppointments(true)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Manage Appointments
            </button>
          </div>
        </div>
        <MessageInput
          leadId={leadId}
          onSendMessage={handleSendMessage}
          isLoading={isSending}
        />
      </div>
    </div>
  );
};

export default MessageThread;
