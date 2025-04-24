import React, { useState, useEffect, useCallback, useRef } from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import appointmentApi, { ApiError } from "../api/appointmentApi";
import { Message } from "../types/message";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import AppointmentCreator from "./AppointmentCreator";
import AppointmentsList from "./AppointmentsList";
import { useSocket } from "../contexts/SocketContext";
import { useNotifications } from "../contexts/NotificationContext";
import settingsApi from "../api/settingsApi";
import "../styles/MessageThread.css";

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
  initialMessages?: Message[];
  isOpen?: boolean;
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
  leadType, 
  leadSource,
  nextScheduledMessage: propNextScheduledMessage,
  messageCount,
  onClose,
  onLeadUpdate,
  onAppointmentCreated,
  onAppointmentUpdated,
  onAppointmentDeleted,
  initialMessages = [],
  isOpen = false,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [appointmentSuccess, setAppointmentSuccess] = useState<string | null>(null);
  const [calendarConfigurationError, setCalendarConfigurationError] = useState(false);
  const [nextScheduledMessage, setNextScheduledMessage] = useState<string | undefined>(propNextScheduledMessage);
  const { socket, connected } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { createNotification } = useNotifications();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  
  // Update local state when prop changes
  useEffect(() => {
    setNextScheduledMessage(propNextScheduledMessage);
  }, [propNextScheduledMessage]);

  // Helper function to validate and normalize messages
  const validateAndNormalizeMessage = (message: any): Message | null => {
    if (!message) return null;
    
    // Check required fields
    if (!message.id || !message.text || !message.sender) {
      console.error("Message missing required fields");
      return null;
    }
    
    // Ensure all required fields are present
    const normalizedMessage: Message = {
      id: Number(message.id),
      leadId: Number(message.leadId || leadId), // Use leadId from props if not in message
      text: String(message.text),
      sender: message.sender === 'lead' ? 'lead' : 'agent', // Normalize sender
      direction: message.direction || (message.sender === 'lead' ? 'inbound' : 'outbound'),
      isAiGenerated: Boolean(message.isAiGenerated),
      createdAt: message.createdAt || new Date().toISOString(),
      twilioSid: message.twilioSid || undefined,
      deliveryStatus: message.deliveryStatus || 'delivered',
      metadata: message.metadata || null
    };
    
    return normalizedMessage;
  };

  // Format next scheduled message date and time
  const formatScheduledDate = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date format for nextScheduledMessage:", dateString);
        return null;
      }
      
      // Calculate days until scheduled message
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Format with day of week, month date, and time
      return {
        date: date.toLocaleDateString(undefined, { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        time: date.toLocaleTimeString([], {
          hour: '2-digit', 
          minute: '2-digit'
        }),
        daysUntil: diffDays
      };
    } catch (error) {
      console.error("Error formatting scheduled date:", error);
      return null;
    }
  };
  
  // Get formatted scheduled message date and time
  const scheduledDateTime = formatScheduledDate(nextScheduledMessage);

  // Fetch messages and lead settings on component mount and when leadId changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        // Fetch messages, lead data, and user settings in parallel
        const [fetchedMessages, lead, userSettings] = await Promise.all([
          messageApi.getMessages(leadId.toString()),
          leadApi.getLead(leadId),
          settingsApi.getSettings() // Get the user settings from Settings page
        ]);
        
        setMessages(fetchedMessages);
        
        // Check for user settings first, then fall back to lead settings
        // This ensures the global settings from the Settings page take precedence
        setAiAssistantEnabled(
          userSettings.aiAssistantEnabled !== undefined 
          ? userSettings.aiAssistantEnabled 
          : lead.aiAssistantEnabled
        );
      } catch (err) {
        setError("Failed to load messages");
        console.error("Error fetching data:", err);
      }
    };

    if (leadId) {
      fetchData();
    }
  }, [leadId]);

  // Listen for lead-updated events to update the nextScheduledMessage without requiring a refresh
  useEffect(() => {
    const handleLeadUpdated = (event: CustomEvent<{leadId: number, nextScheduledMessage: string | null}>) => {
      const { leadId: updatedLeadId, nextScheduledMessage: updatedSchedule } = event.detail;
      
      // Only update if this event is for our lead
      if (updatedLeadId === leadId) {
        console.log("Received lead-updated event, updating nextScheduledMessage:", updatedSchedule);
        
        // Update our local state for immediate UI refresh
        setNextScheduledMessage(updatedSchedule || undefined);
        
        // Update the parent component's props through the window event
        // This is just to maintain consistent data state, the actual UI update comes from
        // the nextScheduledMessage prop which will be updated by the parent component
        window.dispatchEvent(new CustomEvent('lead-updated', { 
          detail: { 
            leadId: leadId,
            nextScheduledMessage: updatedSchedule
          } 
        }));
      }
    };
    
    // Add the event listener
    window.addEventListener('lead-updated', handleLeadUpdated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('lead-updated', handleLeadUpdated as EventListener);
    };
  }, [leadId]);

  // Force refresh messages function with improved error handling
  const refreshMessages = useCallback(async () => {
    if (!leadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedMessages = await messageApi.getMessages(leadId);
      setMessages(fetchedMessages);
      
      // Scroll to bottom after messages load
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Set up an interval to periodically refresh messages only when socket is not connected
  useEffect(() => {
    // Only set up auto-refresh if socket is not connected (as a fallback)
    if (!connected || !socket) {
      // Don't set up interval if any modal is open
      if (showAppointments) {
        return () => {};
      }
      
      const intervalId = setInterval(() => {
        refreshMessages();
      }, 120000); // 2 minutes
      
      return () => clearInterval(intervalId);
    }
    
    return () => {};
  }, [connected, socket, leadId, showAppointments]);
  
  // Add a refresh when socket connects or reconnects
  useEffect(() => {
    if (connected && socket) {
      refreshMessages();
    }
  }, [connected, socket]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (data: SocketMessageData) => {
      // Make sure we're checking the correct lead ID format
      const currentLeadId =
        typeof leadId === "string" ? parseInt(leadId, 10) : leadId;

      // Ensure data and data.message have all required fields
      if (!data || !data.message) {
        console.error("❌ Received invalid message data");
        return;
      }

      // Check for missing critical fields
      if (!data.message.id || !data.message.text || !data.message.sender) {
        console.error("❌ Message is missing critical fields");
        return;
      }

      // Debug lead ID matching if needed
      const outerIdMatch = data.leadId === currentLeadId;
      const innerIdMatch = data.message.leadId === currentLeadId;
      
      if (outerIdMatch || innerIdMatch) {
        console.log("✅ LEAD ID MATCH! Received new message via socket:", data.message);

        // Validate and normalize message
        const normalizedMessage = validateAndNormalizeMessage(data.message);
        if (!normalizedMessage) {
          console.error("❌ Failed to validate message:", data.message);
          return;
        }

        console.log("✅ MESSAGE NORMALIZED:", normalizedMessage);
        
        // Add detailed logging for property search detection
        console.log("🔍 Checking for property search in message:", normalizedMessage.id);
        console.log("📋 Message text:", normalizedMessage.text);
        console.log("🏷️ Message metadata:", normalizedMessage.metadata);
        

        // Check for appointment information
        const appointmentDetails = appointmentApi.parseAppointmentFromAIMessage(normalizedMessage.text);
        if (appointmentDetails) {
          console.log("📅 Appointment details detected:", appointmentDetails);
          setLatestMessage(normalizedMessage.text);
        }
        
        
        // If this is an AI generated message, refresh the lead data to get the updated next scheduled message
        const refreshLeadData = async () => {
          try {
            const refreshedLead = await leadApi.getLead(leadId);
            
            // If the next scheduled message has changed, update it in the UI
            if (refreshedLead.nextScheduledMessage !== nextScheduledMessage) {
              // First update our local state for immediate UI refresh
              setNextScheduledMessage(refreshedLead.nextScheduledMessage);
              
              // Then dispatch an event to update any parent components
              window.dispatchEvent(new CustomEvent('lead-updated', { 
                detail: { 
                  leadId: leadId,
                  nextScheduledMessage: refreshedLead.nextScheduledMessage 
                } 
              }));
            }
          } catch (err) {
            console.error("Error refreshing lead data:", err);
          }
        };
        
        // Refresh lead data after a short delay to allow the backend to update
        setTimeout(refreshLeadData, 1000);

        // Check if this message is already in our state to avoid duplicates
        setMessages((prevMessages) => {
          const messageExists = prevMessages.some(
            (msg) => msg.id === normalizedMessage.id
          );
          if (messageExists) {
            return prevMessages;
          }
          
          // Add the new message to the state
          const updatedMessages = [...prevMessages, normalizedMessage];
          
          // Sort by creation time to ensure correct order
          updatedMessages.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          // Return the updated state
          return updatedMessages;
        });

        // Play a notification sound
        const audio = new Audio("/notification.mp3");
        audio.play().catch((err) => console.error("Error playing notification:", err));
      } else {
        console.log(`⚠️ Message for different lead (received: ${data.leadId}, current: ${currentLeadId}), ignoring`);
      }
    };

    // Listen for both sent and received messages
    socket.on("new-message", handleNewMessage);

    // Log initial connection and subscription
    console.log(`🔌 Socket subscribed to new-message events for lead ${leadId}, socket ID: ${socket.id}, connected: ${connected}`);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, leadId, connected, leadName, leadEmail]);

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
      const isTogglingOn = !aiAssistantEnabled;
      
      // Prepare updated fields
      const updatedFields = {
        aiAssistantEnabled: isTogglingOn,
      };

      // Update lead with new AI Assistant setting
      const updatedLead = await leadApi.updateLead(leadId, updatedFields);
      setAiAssistantEnabled(updatedLead.aiAssistantEnabled);
      
      if (isTogglingOn) {
        try {
          // First, get the full lead to have access to the current status
          const lead = await leadApi.getLead(leadId);
          
          // Schedule a new follow-up message based on the lead's status
          const response = await fetch(`/api/leads/schedule-followup/${leadId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            
            // Refresh the lead data to get the new nextScheduledMessage
            const refreshedLead = await leadApi.getLead(leadId);
            
            // Update parent component with new scheduled message
            if (refreshedLead.nextScheduledMessage) {
              window.dispatchEvent(new CustomEvent('lead-updated', { 
                detail: { 
                  leadId: leadId,
                  nextScheduledMessage: refreshedLead.nextScheduledMessage 
                } 
              }));
              
              // Show success message
              setAppointmentSuccess(`AI Assistant is enabled. Next follow-up scheduled based on ${lead.status} status.`);
              setTimeout(() => setAppointmentSuccess(null), 5000);
            }
          } else {
            const errorData = await response.json();
            setError(`Failed to schedule follow-up: ${errorData.error || 'Unknown error'}`);
            setTimeout(() => setError(null), 5000);
          }
        } catch (err) {
          console.error("Error scheduling follow-up:", err);
          setError("Failed to schedule follow-up message");
          setTimeout(() => setError(null), 5000);
        }
      } else {
        // If we just disabled AI Assistant, we need to update local state to clear the nextScheduledMessage UI
        if (scheduledDateTime) {
          // Force refresh to get the latest lead data including the cleared scheduled message
          const refreshedLead = await leadApi.getLead(leadId);
          
          // Update parent component by simulating navigation (this will re-render with updated data)
          if (!refreshedLead.nextScheduledMessage) {
            window.dispatchEvent(new CustomEvent('lead-updated', { 
              detail: { 
                leadId: leadId,
                nextScheduledMessage: null 
              } 
            }));
          }
        }
      }
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
      const sentMessage = await messageApi.sendMessage(numericLeadId.toString(), text);
      console.log("Message sent successfully:", sentMessage);

      setIsSending(false);

      // Instead of fetching all messages again, just add the new one to state
      setMessages((prev) => [...prev, sentMessage]);
      
      // If AI is enabled, refresh lead data after a short delay to get the updated nextScheduledMessage
      if (aiAssistantEnabled) {
        setTimeout(async () => {
          try {
            console.log("Refreshing lead data after sending message to get updated nextScheduledMessage");
            const refreshedLead = await leadApi.getLead(leadId);
            
            // If the next scheduled message has changed, update it in the UI
            if (refreshedLead.nextScheduledMessage !== nextScheduledMessage) {
              console.log("Next scheduled message updated:", refreshedLead.nextScheduledMessage);
              
              // Update our local state for immediate UI refresh
              setNextScheduledMessage(refreshedLead.nextScheduledMessage);
              
              // Dispatch an event to update any parent components
              window.dispatchEvent(new CustomEvent('lead-updated', { 
                detail: { 
                  leadId: leadId,
                  nextScheduledMessage: refreshedLead.nextScheduledMessage 
                } 
              }));
            }
          } catch (err) {
            console.error("Error refreshing lead data after sending message:", err);
          }
        }, 5000); // Wait 5 seconds for AI to respond
      }
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
    
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
                    {leadType === 'seller' ? 'Seller' : 'Buyer'}
                  </span>
                )}
              </h2>
              <div className="flex items-center text-sm">
                {leadPhone && (
                  <span className="text-gray-500 mr-3 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {leadPhone}
                  </span>
                )}
                {leadEmail && (
                  <span className="text-gray-500 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {leadEmail}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side - Status and actions */}
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              {connected && (
                <span className="flex items-center" title="Connected to realtime updates">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                  <span className="text-xs text-gray-500">Connected</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center">
              <span className="mr-2 text-sm text-gray-600">AI Assistant</span>
              <button 
                onClick={() => {
                  console.log("AI Assistant toggle button clicked");
                  handleToggleAiAssistant();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  aiAssistantEnabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                type="button"
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
      </div>

      {/* Info rows for next message and search criteria */}
      <div>
        {/* Next scheduled message */}
        {scheduledDateTime && (
          <div className="px-4 py-2 flex items-center border-b border-gray-100">
            <div className="mr-3 text-blue-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Next:</span>
              <span className="text-sm font-medium">{scheduledDateTime.date} at {scheduledDateTime.time}</span>
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
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button 
            className="ml-auto text-red-400"
            onClick={() => setError(null)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Success message */}
      {appointmentSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-600">{appointmentSuccess}</p>
          </div>
          <button 
            className="ml-auto text-green-400"
            onClick={() => setAppointmentSuccess(null)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col message-thread-container" id="message-container">
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <AppointmentsList leadId={leadId} />
              <div className="mt-4 pt-4 border-t">
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
              <svg className="w-3 h-3 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Appointments
            </button>
          </div>
        </div>
        
        {/* AI Assistant message or input */}
        {aiAssistantEnabled ? (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex items-center justify-center text-gray-600 text-sm border border-gray-200 rounded-md p-2 bg-gray-50">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              <span>AI Assistant is enabled and will automatically follow up with this lead</span>
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
    </div>
  );
};

export default MessageThread;
