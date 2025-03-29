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
  nextScheduledMessage: propNextScheduledMessage,
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
  const [nextScheduledMessage, setNextScheduledMessage] = useState<string | undefined>(propNextScheduledMessage);
  const { socket, connected, reconnect, lastEventTime } = useSocket();

  // Update local state when prop changes
  useEffect(() => {
    setNextScheduledMessage(propNextScheduledMessage);
  }, [propNextScheduledMessage]);

  // Helper function to validate and normalize messages
  const validateAndNormalizeMessage = (message: any): Message | null => {
    if (!message) return null;
    
    // Check required fields
    if (!message.id || !message.text || !message.sender) {
      console.error("Message missing required fields:", message);
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
      deliveryStatus: message.deliveryStatus || 'delivered'
    };
    
    console.log("Normalized message:", normalizedMessage);
    return normalizedMessage;
  };

  // Use the Calendly hook
  const { 
    isCalendlyAvailable, 
    isCalendlyRequest, 
    createCalendlyLink, 
    loading: calendlyLoading 
  } = useCalendly(leadId);

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
  const refreshMessages = async () => {
    try {
      setError(null);
      console.log("Force refreshing messages for lead:", leadId);
      const fetchedMessages = await messageApi.getMessages(leadId.toString());
      console.log("Refreshed messages:", fetchedMessages);
      
      // Make a copy to avoid potential mutability issues
      const newMessages = [...fetchedMessages];
      
      // Add any messages that might be missing
      setMessages(prevMessages => {
        // Find messages that aren't in the API response but are in our state
        // This could happen if a socket message was received but the API hasn't synced yet
        const localOnlyMessages = prevMessages.filter(
          existingMsg => !newMessages.some(fetchedMsg => fetchedMsg.id === existingMsg.id)
        );
        
        // If we have any socket-only messages, log them for debugging
        if (localOnlyMessages.length > 0) {
          console.log("Found messages only in local state (not yet in API):", localOnlyMessages);
        }
        
        // Merge the fetched messages with any socket-received messages not yet in the API
        const mergedMessages = [...newMessages, ...localOnlyMessages];
        
        // Sort by createdAt to ensure chronological order
        mergedMessages.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log("Final merged message count:", mergedMessages.length);
        return mergedMessages;
      });
      
      // Also refresh lead data
      const lead = await leadApi.getLead(leadId);
      setAiAssistantEnabled(lead.aiAssistantEnabled);
      
      return true;
    } catch (err) {
      setError("Failed to refresh messages");
      console.error("Error refreshing data:", err);
      return false;
    }
  };

  // Set up an interval to periodically refresh messages only when socket is not connected
  useEffect(() => {
    // Only set up auto-refresh if socket is not connected (as a fallback)
    if (!connected || !socket) {
      console.log("Socket not connected or unavailable, setting up auto-refresh fallback");
      const intervalId = setInterval(() => {
        console.log("Auto-refreshing messages (socket fallback)...");
        refreshMessages();
      }, 60000); // 60 seconds - longer interval since this is a fallback
      
      return () => clearInterval(intervalId);
    }
    
    // No interval needed when socket is connected and working
    console.log("Socket connected, no auto-refresh interval needed");
    return () => {};
  }, [connected, socket, leadId]);
  
  // Add a refresh when socket connects or reconnects
  useEffect(() => {
    if (connected && socket) {
      console.log("Socket connected, refreshing messages to ensure latest state");
      refreshMessages();
    }
  }, [connected, socket]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) {
      console.log("Socket not available, can't listen for messages");
      return;
    }

    const handleNewMessage = (data: SocketMessageData) => {
      // Log raw data received from socket for inspection
      console.log("🔍 RAW SOCKET MESSAGE DATA:", JSON.stringify(data));
      
      // Make sure we're checking the correct lead ID format
      const currentLeadId =
        typeof leadId === "string" ? parseInt(leadId, 10) : leadId;

      // Ensure data and data.message have all required fields
      if (!data || !data.message) {
        console.error("❌ Received invalid message data:", data);
        return;
      }

      // Check for missing critical fields
      if (!data.message.id || !data.message.text || !data.message.sender) {
        console.error("❌ Message is missing critical fields:", data.message);
        return;
      }

      // Log detailed matching criteria for debugging
      console.log("🔄 LEAD ID COMPARISON:", {
        messageData: data,
        currentLeadId: currentLeadId,
        dataLeadId: data.leadId,
        dataLeadIdType: typeof data.leadId,
        messageLeadId: data.message.leadId,
        messageLeadIdType: typeof data.message.leadId,
        outerMatches: data.leadId === currentLeadId,
        innerMatches: data.message.leadId === currentLeadId,
        socketConnected: connected,
        messageType: data.message.sender,
        direction: data.message.direction || 'unknown',
        isAI: data.message.isAiGenerated
      });

      // Check if the leadIds match - try both the outer and inner leadId
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

        // Check if message contains appointment information or Calendly requests
        // Check all messages, not just inbound, since the AI could be confirming appointments
        if (normalizedMessage.isAiGenerated) {
          // Check for appointment information
          const appointmentDetails = appointmentApi.parseAppointmentFromAIMessage(normalizedMessage.text);
          if (appointmentDetails) {
            console.log("📅 Appointment details detected:", appointmentDetails);
            setLatestMessage(normalizedMessage.text);
          }
          
          // Check for Calendly-related requests using the hook
          if (isCalendlyRequest(normalizedMessage.text)) {
            console.log("📅 Calendly request detected in message");
            
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
              setLatestMessage(normalizedMessage.text);
            }
          }
          
          // If this is an AI generated message, refresh the lead data to get the updated next scheduled message
          const refreshLeadData = async () => {
            try {
              console.log("Refreshing lead data to update next scheduled message");
              const refreshedLead = await leadApi.getLead(leadId);
              
              // If the next scheduled message has changed, update it in the UI
              if (refreshedLead.nextScheduledMessage !== nextScheduledMessage) {
                console.log("Next scheduled message updated:", refreshedLead.nextScheduledMessage);
                
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
        }

        // Check if this message is already in our state to avoid duplicates
        setMessages((prevMessages) => {
          const messageExists = prevMessages.some(
            (msg) => msg.id === normalizedMessage.id
          );
          if (messageExists) {
            console.log("⚠️ Message already exists in state, skipping:", normalizedMessage.id);
            return prevMessages;
          }
          console.log("✅ Adding new message to state:", normalizedMessage);
          
          // Let's log the current messages for debugging
          console.log("Current messages state before update:", prevMessages.map(m => ({ id: m.id, text: m.text.substring(0, 20) + "...", sender: m.sender })));
          
          // Add the new message to the state
          const updatedMessages = [...prevMessages, normalizedMessage];
          
          // Sort by creation time to ensure correct order
          updatedMessages.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          console.log("✅ New message count:", updatedMessages.length);
          
          // Return the updated state
          return updatedMessages;
        });

        // Play a notification sound
        const audio = new Audio("/notification.mp3");
        audio
          .play()
          .catch((err) => console.log("Error playing notification:", err));
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
      console.log(`🔌 Socket unsubscribed from new-message events for lead ${leadId}`);
    };
  }, [socket, leadId, connected, leadName, leadEmail, isCalendlyAvailable, isCalendlyRequest, calendlyLoading]);

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
        // If we're turning ON AI Assistant, schedule a new follow-up message
        try {
          // First, get the full lead to have access to the current status
          const lead = await leadApi.getLead(leadId);
          
          // Schedule a new follow-up message based on the lead's status
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/schedule-followup/${leadId}`, {
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
      const sentMessage = await messageApi.sendMessage(numericLeadId, text);
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
            {socket && (
              <span className="ml-2" title={connected ? "Connected to realtime updates" : "Realtime updates unavailable"}>
                <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {!connected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                reconnect();
              }}
              className="mr-3 px-3 py-1.5 text-sm rounded-md flex items-center bg-red-100 text-red-700 hover:bg-red-200"
              title="Reconnect to server"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reconnect
              <span className="ml-1 text-xs opacity-75">(Auto-refreshing)</span>
            </button>
          )}
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

      {/* Next Scheduled Message Indicator */}
      {scheduledDateTime && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center">
          <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
          </svg>
          <div className="text-sm text-blue-700 flex flex-wrap items-center">
            <span className="mr-2">Next scheduled message:</span>
            <span className="font-medium mr-2">{scheduledDateTime.date}</span> 
            <span>at</span>
            <span className="font-medium mx-1">{scheduledDateTime.time}</span>
            {scheduledDateTime.daysUntil > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                {scheduledDateTime.daysUntil === 1 ? 'Tomorrow' : `in ${scheduledDateTime.daysUntil} days`}
              </span>
            )}
            {scheduledDateTime.daysUntil === 0 && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                Today
              </span>
            )}
          </div>
        </div>
      )}

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
        
        {/* Socket Debug Panel (only shown in development) */}
        {import.meta.env.DEV && (
          <div className="p-2 bg-gray-100 border-b border-gray-200">
            <details className="text-xs">
              <summary className="font-medium text-gray-700 cursor-pointer">Socket Debug Tools</summary>
              <div className="mt-2 p-2 bg-white rounded-md">
                <div className="flex items-center mb-2">
                  <span className="mr-2">Socket Status:</span>
                  <span 
                    className={`inline-block w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} 
                    title={connected ? 'Connected' : 'Disconnected'}
                  ></span>
                  <span className="ml-1">{connected ? 'Connected' : 'Disconnected'}</span>
                  
                  {lastEventTime && (
                    <span className="ml-2 text-xs text-gray-500">
                      Last activity: {new Date(lastEventTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2 mb-2">
                  <button 
                    onClick={() => reconnect()} 
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Reconnect
                  </button>
                  
                  <button 
                    onClick={() => refreshMessages()}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Force Refresh (Testing)
                  </button>
                </div>
                
                <div className="flex space-x-2 mb-2">
                  <button 
                    onClick={async () => {
                      try {
                        const result = await messageApi.testSocketMessage(leadId, `Test message at ${new Date().toLocaleTimeString()}`);
                        console.log("Test socket message result:", result);
                      } catch (err) {
                        console.error("Error testing socket:", err);
                        setError("Failed to send test socket message. See console for details.");
                      }
                    }}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    Send Test Lead Message
                  </button>
                  
                  <button 
                    onClick={async () => {
                      try {
                        const result = await messageApi.simulateAiResponse(leadId, `Simulated AI response at ${new Date().toLocaleTimeString()}`);
                        console.log("Simulated AI response result:", result);
                      } catch (err) {
                        console.error("Error simulating AI response:", err);
                        setError("Failed to simulate AI response. See console for details.");
                      }
                    }}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Simulate AI Response
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Check browser console for detailed socket logs.
                </div>
              </div>
            </details>
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
        
        {/* Manual message input is disabled when AI Assistant is enabled */}
        {aiAssistantEnabled ? (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center text-gray-500 text-sm border border-gray-200 rounded-lg p-3 bg-gray-100">
              <svg className="w-5 h-5 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              AI Assistant is enabled and will automatically follow up with this lead.
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
