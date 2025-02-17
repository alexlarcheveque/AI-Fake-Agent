import React, { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-adjust height of textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px"; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 100) + "px"; // Max height of 100px
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
            placeholder="Type your message..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500 resize-none overflow-x-auto"
            disabled={isLoading}
            rows={1}
            style={{
              maxHeight: "100px",
              overflowY: "auto",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={`px-6 py-2 rounded-lg bg-blue-600 text-white font-medium flex-shrink-0 h-fit
            ${
              !message.trim() || isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700"
            }`}
        >
          {isLoading ? (
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
