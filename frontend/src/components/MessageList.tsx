import React from "react";
import { Message } from "../types/message";
import propertySearchApi, { PropertySearchCriteria } from "../api/propertySearchApi";
import PropertySearchCriteriaSummary from "./PropertySearchCriteriaSummary";

interface MessageListProps {
  messages: Message[];
}

// Function to clean up property search criteria from message text
const cleanupPropertySearch = (text: string): string => {
  // Remove the "NEW SEARCH CRITERIA:" part and everything that follows it
  const searchPattern = /NEW SEARCH CRITERIA:.*/gs;
  
  // Test with sample message (only log in development)
  const isDev = import.meta.env?.MODE === 'development';
  if (isDev) {
    const testMessage = "I'll make sure to update your email to test@gmail.com. Expect detailed listings for 3-bedroom properties in Pasadena and Culver City soon. NEW SEARCH CRITERIA: BED:3 BATH:2 PRICE:$800,000 SQFT:1500-2500";
    const cleanedTest = testMessage.replace(searchPattern, '').trim();
    console.log("Original test:", testMessage);
    console.log("Cleaned test:", cleanedTest);
  }
  
  return text.replace(searchPattern, '').trim();
};

const getStatusIndicator = (message: Message) => {
  if (message.direction === "inbound") return null;

  type StatusKey = "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | "read";
  
  const statusMap = {
    queued: { icon: "⏳", color: "text-gray-400", text: "Queued" },
    sending: { icon: "⏳", color: "text-blue-400", text: "Sending" },
    sent: { icon: "✓", color: "text-blue-500", text: "Sent" },
    delivered: { icon: "✓✓", color: "text-green-500", text: "Delivered" },
    failed: { icon: "❌", color: "text-red-500", text: "Failed" },
    undelivered: { icon: "❌", color: "text-red-500", text: "Undelivered" },
    read: { icon: "👁️", color: "text-green-600", text: "Read" },
  };

  // Type the status explicitly as a key of statusMap
  const deliveryStatus = message.deliveryStatus || "queued";
  const status = (validStatus(deliveryStatus) ? deliveryStatus : "queued") as StatusKey;
  
  // Ensure the status is valid
  const indicator = statusMap[status];

  return (
    <span
      className={`text-xs ${indicator.color} ml-2`}
      title={message.errorMessage || indicator.text}
    >
      {indicator.icon}
    </span>
  );
};

// Helper function to validate if a status is a valid key
function validStatus(status: string): status is "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | "read" {
  return ["queued", "sending", "sent", "delivered", "failed", "undelivered", "read"].includes(status);
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messageEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [searchCriteria, setSearchCriteria] = React.useState<{[key: string]: PropertySearchCriteria}>({});
  const [previousMessagesLength, setPreviousMessagesLength] = React.useState(0);

  console.log("messages", messages);

  // Improved scroll handling to maintain position or scroll to bottom when appropriate
  React.useEffect(() => {
    // Only consider scrolling if we have messages
    if (messages.length === 0) return;
    
    // Check if we should scroll to bottom by checking if:
    // 1. New messages were added (messages.length > previousMessagesLength)
    // 2. User was already at the bottom before the update
    const container = messagesContainerRef.current;
    if (container) {
      // Calculate if user was at the bottom before new messages
      const wasAtBottom = 
        container.scrollHeight - container.clientHeight <= container.scrollTop + 100; // Within 100px of bottom
      
      // New messages were added and user was already at the bottom
      if (messages.length > previousMessagesLength && wasAtBottom) {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        console.log("Scrolling to bottom - user was at bottom and new messages added");
      } else if (messages.length === 1) {
        // This is the first message, always scroll to it
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        console.log("Scrolling to first message");
      } else {
        console.log("Not scrolling - maintaining current position");
      }
    }
    
    // Update the previous length for next comparison
    setPreviousMessagesLength(messages.length);
  }, [messages, previousMessagesLength]);

  React.useEffect(() => {
    // Check for property search criteria in messages
    const newSearchCriteria: {[key: string]: PropertySearchCriteria} = {};
    
    messages.forEach(message => {
      // First check metadata for property search criteria
      if (message.metadata?.isPropertySearch && message.metadata.propertySearchCriteria) {
        const criteria = propertySearchApi.parseSearchCriteriaFromAIMessage(message.metadata.propertySearchCriteria);
        if (criteria) {
          console.log("Found property search criteria in message metadata:", message.id, criteria);
          newSearchCriteria[message.id] = criteria;
        }
      } else {
        // Fallback to checking the message text
        const criteria = propertySearchApi.parseSearchCriteriaFromAIMessage(message.text);
        if (criteria) {
          console.log("Found property search criteria in message text:", message.id, criteria);
          newSearchCriteria[message.id] = criteria;
        }
      }
    });
    
    if (Object.keys(newSearchCriteria).length > 0) {
      console.log("Setting search criteria state:", newSearchCriteria);
      setSearchCriteria(newSearchCriteria);
    }
  }, [messages]);

  React.useEffect(() => {
    if (messages.length > 0) {
      console.log("Message structure:", messages[0]);
    }
  }, [messages]);

  // Helper function to format dates safely
  const formatMessageTime = (dateString: string | Date) => {
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;

      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return ""; // Return empty string for invalid dates
      }

      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  return (
    <div className="p-4 space-y-6" ref={messagesContainerRef}>
      {messages.map((message) => {
        // Get potentially cleaned message text
        let displayText = message.text;
        
        // If this message contains property search criteria, clean it up
        if (searchCriteria[message.id]) {
          const before = displayText;
          displayText = cleanupPropertySearch(displayText);
          
          // Log the before and after for debugging
          console.log(`Cleaned message ${message.id}:`);
          console.log("Before:", before);
          console.log("After:", displayText);
        }
        
        return (
          <React.Fragment key={message.id}>
            <div
              className={`flex ${
                message.sender === "lead" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-3/4 px-4 py-3 rounded-2xl shadow-sm ${
                  message.sender === "lead"
                    ? "bg-gray-100 text-gray-800 border border-gray-200"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                }`}
              >
                <div className="whitespace-pre-wrap">{displayText}</div>
                <div className={`text-xs mt-1.5 flex items-center ${
                  message.sender === "lead" ? "text-gray-500" : "text-blue-100"
                }`}>
                  <span className="mr-1">{formatMessageTime(message.createdAt)}</span>
                  {message.sender === "agent" && getStatusIndicator(message)}
                </div>
              </div>
            </div>
            
            {/* Show property search summary directly after the message that contains it */}
            {searchCriteria[message.id] && (
              <div className="ml-4 mt-1">
                <PropertySearchCriteriaSummary criteria={searchCriteria[message.id]} compact={true} />
              </div>
            )}
          </React.Fragment>
        );
      })}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageList;
