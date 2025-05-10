import React, { useState, useRef, useEffect } from "react";
import messageApi from "../api/messageApi"; // Import the API service

interface MessageInputProps {
  leadId: number; // Add leadId to props
  onSendMessage: (message: any) => void; // Update type to match what you're using
  isLoading?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  leadId,
  onSendMessage,
  isLoading = false,
  isDisabled = false,
  placeholder = "Type your message...",
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !isDisabled) {
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading && !isDisabled) {
        handleSendMessage();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setIsSending(true);

      const newMessage = await messageApi.sendMessage(
        leadId,
        message.trim(),
        false
      );

      onSendMessage(newMessage);

      setMessage("");
    } catch (error: any) {
      // Type error as any for now to access properties
      console.error("Error sending message:", error);

      // Show detailed error from server if available
      if (
        error &&
        error.response &&
        error.response.data &&
        error.response.data.error
      ) {
        console.error("Server error:", error.response.data.error);
        alert(`Failed to send message: ${error.response.data.error}`);
      } else if (error && error.message) {
        alert(`Failed to send message: ${error.message}`);
      } else {
        alert("Failed to send message. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500 resize-none overflow-x-auto
              ${isDisabled ? "bg-gray-300 text-gray-500" : ""}`}
            disabled={isLoading || isDisabled}
            rows={1}
            style={{
              maxHeight: "100px",
              overflowY: "auto",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isLoading || isDisabled}
          className={`px-6 py-2 rounded-lg bg-blue-600 text-white font-medium flex-shrink-0 h-fit
            ${
              !message.trim() || isLoading || isDisabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700"
            }`}
        >
          {isSending ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
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
              Sending
            </span>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
