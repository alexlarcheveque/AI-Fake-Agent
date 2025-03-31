import React, { useState, useEffect, useCallback } from "react";
import messageApi from "../api/messageApi";
import leadApi from "../api/leadApi";
import appointmentApi, { ApiError } from "../api/appointmentApi";
import propertySearchApi, { PropertySearchCriteria } from "../api/propertySearchApi";
import { Message } from "../types/message";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import AppointmentCreator from "./AppointmentCreator";
import AppointmentsList from "./AppointmentsList";
import FollowUpIndicator from "./FollowUpIndicator";
import { useSocket } from "../contexts/SocketContext";
import useCalendly from "../hooks/useCalendly";
import PropertySearchInfo from "../components/PropertySearchInfo";
import PropertySearchCriteriaSummary from "../components/PropertySearchCriteriaSummary";
import { useNotifications } from "../contexts/NotificationContext";
import { toast } from "react-hot-toast";

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
  const [searchCriteria, setSearchCriteria] = useState<any>(null);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [showFullPropertySearch, setShowFullPropertySearch] = useState(false);
  const [showCriteriaDetails, setShowCriteriaDetails] = useState(false);
  const { addNotification } = useNotifications();
  const [highlightSearchCriteria, setHighlightSearchCriteria] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setNextScheduledMessage(propNextScheduledMessage);
  }, [propNextScheduledMessage]);

  // Initialize search criteria from session storage
  useEffect(() => {
    // Create a storage key specific to this lead
    const storageKey = `propertySearchCriteria_${leadId}`;
    
    // Try to get search criteria from session storage
    const savedCriteria = sessionStorage.getItem(storageKey);
    if (savedCriteria) {
      try {
        const parsedCriteria = JSON.parse(savedCriteria);
        console.log("Restored search criteria from session storage:", parsedCriteria);
        setSearchCriteria(parsedCriteria);
        setShowSearchButton(true);
      } catch (err) {
        console.error("Error parsing saved search criteria:", err);
        // Remove invalid data
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [leadId]); // Only run on mount and when leadId changes

  // Update debugging for searchCriteria
  useEffect(() => {
    console.log("Current searchCriteria state:", searchCriteria);
    
    // Save search criteria to session storage when it changes
    if (searchCriteria) {
      const storageKey = `propertySearchCriteria_${leadId}`;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(searchCriteria));
        console.log("Saved search criteria to session storage");
        
        // Also update the database when search criteria changes
        propertySearchApi.savePropertySearchCriteria(leadId, searchCriteria)
          .then((success: boolean) => {
            if (success) {
              console.log("Successfully saved updated property search to database");
            } else {
              console.error("Failed to save updated property search to database");
            }
          });
      } catch (err) {
        console.error("Error saving search criteria to session storage:", err);
      }
      
      // REMOVE AUTO-HIGHLIGHT: This was causing continuous modal popups
      // handleHighlightSearchCriteria();
    }
  }, [searchCriteria, leadId]);

  // Helper function to highlight search criteria
  const handleHighlightSearchCriteria = useCallback(() => {
    console.log("handleHighlightSearchCriteria clicked - starting function execution");
    
    // Ensure we have search criteria to highlight
    if (!searchCriteria) {
      console.log("No search criteria available to highlight");
      return;
    }
    
    // Just highlight without showing modal by default
    console.log("Highlighting search criteria section");
    setHighlightSearchCriteria(true);
    
    // Reset highlight after animation completes
    setTimeout(() => {
      setHighlightSearchCriteria(false);
    }, 2000);
    
  }, [searchCriteria]);
  
  // Helper function to parse and extract property search criteria from messages
  const findPropertySearchCriteriaInMessages = useCallback((messageArray: Message[]) => {
    if (!messageArray || messageArray.length === 0) return null;
    
    // Get the current criteria to build upon
    let accumulatedCriteria: PropertySearchCriteria = {};
    
    // First check if we have existing criteria in state to use as base
    if (searchCriteria) {
      accumulatedCriteria = { ...searchCriteria };
      console.log("Starting with existing search criteria:", accumulatedCriteria);
    }
    
    // Process messages from newest to oldest to get the most recent criteria updates
    for (const message of [...messageArray].reverse()) {
      // Only check agent messages with content
      if (message.sender !== 'agent' || !message.text) continue;
      
      console.log(`Checking message ${message.id} for property search criteria`);
      
      // Try to parse using all available methods
      let messageCriteria = propertySearchApi.parseStructuredPropertySearch(message.text);
      
      // Also check metadata if it exists
      if (!messageCriteria && message.metadata?.isPropertySearch && message.metadata.propertySearchCriteria) {
        messageCriteria = propertySearchApi.parseSearchCriteriaFromAIMessage(message.metadata.propertySearchCriteria);
      }
      
      if (messageCriteria && Object.keys(messageCriteria).length > 0) {
        console.log(`Found property search criteria in message ${message.id}:`, messageCriteria);
        
        // Handle special case for null values (explicitly clearing fields)
        for (const [key, value] of Object.entries(messageCriteria)) {
          if (value === null) {
            // Null means explicitly clear this field
            delete accumulatedCriteria[key as keyof PropertySearchCriteria];
            console.log(`Cleared field '${key}' from criteria`);
          }
        }
        
        // Merge non-null values with accumulated criteria
        accumulatedCriteria = {
          ...accumulatedCriteria,
          ...Object.entries(messageCriteria)
            .filter(([_, value]) => value !== null)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
        };
        
        console.log("Updated accumulated criteria:", accumulatedCriteria);
      }
    }
    
    // Only return if we have criteria
    if (Object.keys(accumulatedCriteria).length > 0) {
      console.log("Final accumulated criteria:", accumulatedCriteria);
      return accumulatedCriteria;
    }
    
    return null;
  }, [searchCriteria]);
  
  // Function to handle manual sync of property search criteria
  const handleSyncPropertySearchCriteria = async () => {
    if (!leadId) return;
    
    try {
      console.log("Manually syncing property search criteria for lead", leadId);
      
      // Extract criteria from messages
      const criteriaFromMessages = findPropertySearchCriteriaInMessages(messages);
      
      if (criteriaFromMessages && Object.keys(criteriaFromMessages).length > 0) {
        console.log("Found property search criteria to sync:", criteriaFromMessages);
        
        // First save to the database
        const success = await propertySearchApi.savePropertySearchCriteria(leadId, criteriaFromMessages);
        
        if (success) {
          // Only update local state after successful database sync
          setSearchCriteria(criteriaFromMessages);
          
          // Show success message
          toast.success("Property search criteria synced successfully");
          
          // Highlight the criteria to show it was updated (but don't show modal)
          handleHighlightSearchCriteria();
          
          console.log("Successfully synchronized property search criteria");
        } else {
          toast.error("Failed to sync property search criteria with database");
          console.error("Failed to synchronize property search criteria");
        }
      } else {
        toast("No property search criteria found in messages");
        console.log("No property search criteria found in messages");
      }
    } catch (error) {
      toast.error("Error syncing property search criteria");
      console.error("Error syncing property search criteria:", error);
    }
  };

  // Function to handle "View Matches" button click
  const handleViewMatches = async () => {
    console.log("handleViewMatches clicked - starting function execution");
    if (!leadId) {
      console.error("handleViewMatches: No leadId found");
      return;
    }
    
    try {
      // First, make sure our search criteria is up to date in the database
      if (searchCriteria) {
        console.log("Saving property search criteria before viewing matches:", searchCriteria);
        const success = await propertySearchApi.savePropertySearchCriteria(leadId, searchCriteria);
        if (success) {
          console.log("Successfully saved property search criteria before viewing matches");
        } else {
          console.error("Failed to save property search criteria before viewing matches");
        }
      } else {
        console.log("No search criteria to save before viewing matches");
      }
      
      console.log("Setting showFullPropertySearch to true");
      setShowFullPropertySearch(true);
    } catch (error) {
      console.error("Error in handleViewMatches:", error);
    }
  };

  // Function to save search criteria from scratch or after manual entry
  const saveNewSearchCriteria = async (criteria: PropertySearchCriteria) => {
    if (!leadId) return;
    
    console.log("Saving new search criteria:", criteria);
    const success = await propertySearchApi.savePropertySearchCriteria(leadId, criteria);
    
    if (success) {
      console.log("Successfully saved new property search criteria");
      setSearchCriteria(criteria);
      setShowFullPropertySearch(false);
    } else {
      console.error("Failed to save new property search criteria");
    }
  };

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
      deliveryStatus: message.deliveryStatus || 'delivered',
      metadata: message.metadata || null
    };
    
    console.log("Normalized message:", normalizedMessage);
    return normalizedMessage;
  };

  // Helper to get the most recent property search criteria from messages
  const getMostRecentSearchCriteria = () => {
    if (!searchCriteria) return null;
    
    // For now we're just displaying the searchCriteria directly from state,
    // but in the future if we track multiple search criteria, this function
    // would return the most recent one
    return searchCriteria;
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
        
        // First try to get saved property searches from the database
        const savedSearchCriteria = await propertySearchApi.getPropertySearchesForLead(leadId);
        if (savedSearchCriteria) {
          console.log("Found saved property search criteria in database:", savedSearchCriteria);
          setSearchCriteria(savedSearchCriteria);
          setShowSearchButton(true);
        } else {
          // If no saved searches, scan loaded messages for property search criteria
          const propertyCriteria = findPropertySearchCriteriaInMessages(fetchedMessages);
          if (propertyCriteria) {
            console.log("Found property search criteria in initial messages:", propertyCriteria);
            setSearchCriteria(propertyCriteria);
            setShowSearchButton(true);
            
            // Save the detected criteria to the database
            propertySearchApi.savePropertySearchCriteria(leadId, propertyCriteria)
              .then((success: boolean) => {
                if (success) {
                  console.log("Successfully saved detected property search to database");
                } else {
                  console.error("Failed to save detected property search to database");
                }
              });
          }
        }
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
      
      // Refresh property search criteria from the database
      await handleSyncPropertySearchCriteria();
      
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
      
      // Don't set up interval if any modal is open
      if (showCriteriaDetails || showFullPropertySearch || showAppointments) {
        console.log("Not setting up auto-refresh while modals are open");
        return () => {};
      }
      
      const intervalId = setInterval(() => {
        console.log("Auto-refreshing messages (socket fallback)...");
        refreshMessages();
      }, 120000); // 2 minutes instead of 60 seconds
      
      return () => clearInterval(intervalId);
    }
    
    // No interval needed when socket is connected and working
    console.log("Socket connected, no auto-refresh interval needed");
    return () => {};
  }, [connected, socket, leadId, showCriteriaDetails, showFullPropertySearch, showAppointments]);
  
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

    const handleNewMessage = async (data: SocketMessageData) => {
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

        // Check if message contains property search criteria
        const propertySearchCriteria = normalizedMessage.metadata?.isPropertySearch 
          ? propertySearchApi.parseSearchCriteriaFromAIMessage(normalizedMessage.metadata.propertySearchCriteria || '')
          : propertySearchApi.parseSearchCriteriaFromAIMessage(normalizedMessage.text);
        
        // Add detailed logging for property search detection
        console.log("🔍 Checking for property search in message:", normalizedMessage.id);
        console.log("📋 Message text:", normalizedMessage.text);
        console.log("🏷️ Message metadata:", normalizedMessage.metadata);
        
        if (propertySearchCriteria) {
          console.log("🏠 Property search criteria detected:", propertySearchCriteria);
          
          // Save to the database first, to ensure it's persisted
          const savedToDb = await propertySearchApi.savePropertySearchCriteria(leadId, propertySearchCriteria);
          
          if (savedToDb) {
            console.log("Successfully saved property search to database");
            
            // Set in local state after successful database save
            setSearchCriteria(propertySearchCriteria);
            setShowSearchButton(true);
            
            // Add a notification about the search
            const formattedCriteria = propertySearchApi.formatSearchCriteria(propertySearchCriteria);
            
            addNotification({
              type: 'property_search',
              title: 'New Property Search',
              message: `${leadName} is looking for ${formattedCriteria}`,
              data: { leadId, criteria: propertySearchCriteria }
            });
          } else {
            // If database save failed, still update local state as fallback
            console.error("Failed to save property search to database, using local state only");
            setSearchCriteria(propertySearchCriteria);
            setShowSearchButton(true);
          }
        }

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

  // Function to update the property search criteria based on messages
  const refreshPropertySearchCriteria = useCallback(async () => {
    if (!leadId) return;
    
    // Don't refresh if we're showing the criteria modal - this prevents UI jumps
    if (showCriteriaDetails || showFullPropertySearch) {
      console.log("Not refreshing property search criteria while modal is open");
      return;
    }
    
    // Extract criteria from messages
    const criteriaFromMessages = findPropertySearchCriteriaInMessages(messages);
    
    if (criteriaFromMessages && Object.keys(criteriaFromMessages).length > 0) {
      console.log("Found property search criteria in messages:", criteriaFromMessages);
      
      // Compare with current criteria to avoid unnecessary updates
      const currentCriteriaStr = JSON.stringify(searchCriteria || {});
      const newCriteriaStr = JSON.stringify(criteriaFromMessages);
      
      if (currentCriteriaStr !== newCriteriaStr) {
        console.log("Criteria has changed, updating...");
        
        // Save the criteria to the database
        const success = await propertySearchApi.savePropertySearchCriteria(leadId, criteriaFromMessages);
        
        if (success) {
          console.log("Successfully saved property search criteria");
          // Refresh the local state
          setSearchCriteria(criteriaFromMessages);
        } else {
          console.error("Failed to save property search criteria");
        }
      } else {
        console.log("Criteria unchanged, skipping update");
      }
    } else {
      console.log("No property search criteria found in messages");
    }
  }, [leadId, messages, findPropertySearchCriteriaInMessages, searchCriteria, showCriteriaDetails, showFullPropertySearch]);

  // Add a periodic refresh of property search criteria - REDUCING FREQUENCY FURTHER
  useEffect(() => {
    // Only set up the refresh if we have a valid leadId
    if (!leadId) return;
    
    // Don't set up refresh if any modal is open
    if (showCriteriaDetails || showFullPropertySearch || showAppointments) {
      console.log("Not setting up property search criteria refresh while modals are open");
      return;
    }
    
    console.log("Setting up periodic refresh of property search criteria");
    
    // Initial fetch after a longer delay to let other operations complete
    const initialTimeoutId = setTimeout(() => {
      refreshPropertySearchCriteria();
    }, 15000); // 15 seconds instead of 5
    
    // Set up an interval to refresh the criteria VERY INFREQUENTLY (15 minutes)
    const intervalId = setInterval(() => {
      refreshPropertySearchCriteria();
    }, 900000); // 15 minutes (was 300000 - 5 minutes)
    
    // Cleanup function
    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [leadId, refreshPropertySearchCriteria, showCriteriaDetails, showFullPropertySearch, showAppointments]);

  // Monitor state changes for debugging
  useEffect(() => {
    console.log("showFullPropertySearch state changed:", showFullPropertySearch);
  }, [showFullPropertySearch]);

  useEffect(() => {
    console.log("showCriteriaDetails state changed:", showCriteriaDetails);
  }, [showCriteriaDetails]);

  useEffect(() => {
    console.log("showAppointments state changed:", showAppointments);
  }, [showAppointments]);

  useEffect(() => {
    console.log("aiAssistantEnabled state changed:", aiAssistantEnabled);
  }, [aiAssistantEnabled]);

  useEffect(() => {
    console.log("highlightSearchCriteria state changed:", highlightSearchCriteria);
  }, [highlightSearchCriteria]);

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
              <h2 className="text-lg font-medium text-gray-900">{leadName}</h2>
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
        
        {/* Property search criteria */}
        {searchCriteria && (
          <div className={`px-4 py-2 flex items-center justify-between border-b border-gray-100 property-search-criteria-section ${highlightSearchCriteria ? 'bg-blue-50' : ''}`}>
            <div className="flex items-center">
              <div className="mr-3 text-blue-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex items-center flex-wrap">
                <span className="text-xs text-gray-500 mr-2">Search:</span>
                <div className="flex items-center text-sm flex-wrap">
                  {searchCriteria.minBedrooms && <span className="font-medium">{searchCriteria.minBedrooms}+ beds</span>}
                  {searchCriteria.minBathrooms && (
                    <>
                      <span className="mx-1.5 text-gray-400">•</span>
                      <span className="font-medium">{searchCriteria.minBathrooms}+ baths</span>
                    </>
                  )}
                  {searchCriteria.minPrice && searchCriteria.maxPrice && (
                    <>
                      <span className="mx-1.5 text-gray-400">•</span>
                      <span className="font-medium">${searchCriteria.minPrice.toLocaleString()} - ${searchCriteria.maxPrice.toLocaleString()}</span>
                    </>
                  )}
                  {searchCriteria.location && (
                    <>
                      <span className="mx-1.5 text-gray-400">•</span>
                      <span className="font-medium">{searchCriteria.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  console.log("View Matches button clicked");
                  handleViewMatches();
                }}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded flex items-center"
                type="button"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>
              <button
                onClick={() => {
                  console.log("Edit Criteria button clicked");
                  setShowFullPropertySearch(true);
                }}
                className="px-2 py-1 text-xs text-gray-600 rounded flex items-center border border-gray-200"
                type="button"
              >
                <svg className="w-3 h-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
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

      {/* Property Search Info Modal - Only shown when needed */}
      {showFullPropertySearch && searchCriteria && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close the modal when clicking on the background overlay
            if (e.target === e.currentTarget) {
              console.log("Closing property search modal by clicking outside");
              setShowFullPropertySearch(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-medium">Property Search Criteria</h2>
              <button 
                onClick={() => setShowFullPropertySearch(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <PropertySearchInfo 
                leadId={leadId}
                criteria={searchCriteria} 
                leadName={leadName || "Lead"}
              />
            </div>
          </div>
        </div>
      )}

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
                console.log("View Criteria button clicked");
                if (searchCriteria) {
                  setShowCriteriaDetails(true);
                } else {
                  console.log("No search criteria available to view");
                  toast.error("No search criteria available");
                }
              }}
              className="px-2 py-1 text-xs border border-gray-200 bg-white text-gray-600 rounded flex items-center"
              type="button"
            >
              <svg className="w-3 h-3 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Edit Criteria
            </button>
            <button
              onClick={() => {
                console.log("Property Matches button clicked");
                handleViewMatches();
              }}
              className="px-2 py-1 text-xs border border-gray-200 bg-white text-gray-600 rounded flex items-center"
              type="button"
            >
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Property Matches
            </button>
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

      {/* Property Search Criteria Details Modal */}
      {showCriteriaDetails && searchCriteria && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close the modal when clicking on the background overlay
            if (e.target === e.currentTarget) {
              console.log("Closing criteria details modal by clicking outside");
              setShowCriteriaDetails(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-medium">Property Search Criteria Details</h2>
              <button 
                onClick={() => setShowCriteriaDetails(false)}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <PropertySearchCriteriaSummary criteria={searchCriteria} compact={false} />
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCriteriaDetails(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                  type="button"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowCriteriaDetails(false);
                    setShowFullPropertySearch(true);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  type="button"
                >
                  Edit Criteria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add style for highlight pulse animation */}
      <style>
        {`
        @keyframes highlight-pulse {
          0% { background-color: #ffffff; }
          50% { background-color: #dbeafe; } /* bg-blue-100 */
          100% { background-color: #ffffff; }
        }
        
        .highlight-pulse {
          animation: highlight-pulse 2s ease-in-out;
        }
        
        .property-search-criteria-section {
          transition: background-color 0.5s ease;
        }
        `}
      </style>
    </div>
  );
};

export default MessageThread;
