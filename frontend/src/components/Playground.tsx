import React, { useState } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import { Message } from "../types/message";
import messageApi from "../api/messageApi";
import { SAMPLE_LEAD_CONTEXT } from "../data/sampleLeadContext";

const Playground: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [leadContext, setLeadContext] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create and show user message immediately
      const userMessage: Message = {
        id: Date.now(),
        text,
        sender: "user",
        twilioSid: `local-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add user message to UI immediately
      setMessages((prev) => [...prev, userMessage]);

      // Then wait for AI response
      const response = await messageApi.sendLocalMessage(
        text,
        messages,
        leadContext
      );

      // Only add AI message since user message is already shown
      setMessages((prev) => [...prev, response.aiMessage]);
    } catch (error) {
      setError("Failed to send message");
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomContext = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_LEAD_CONTEXT.length);
    setLeadContext(SAMPLE_LEAD_CONTEXT[randomIndex]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AI Playground</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Test Environment
          </h2>
          <p className="text-sm text-gray-600">
            Test the AI assistant's responses without affecting real leads. You
            will be acting as the buyer/seller in this conversation.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                This is a test environment. All messages will be deleted when
                you leave this page.
              </p>
            </div>
          </div>
        </div>

        {/* Lead Context Section */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="leadContext"
              className="block text-sm font-medium text-gray-700"
            >
              Lead Context
            </label>
            <button
              onClick={generateRandomContext}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Generate Random Lead Context
            </button>
          </div>
          <textarea
            id="leadContext"
            value={leadContext}
            onChange={(e) => setLeadContext(e.target.value)}
            placeholder="Enter any relevant information about the lead (e.g., 'Looking for a 3-bedroom house in Culver City, budget $1.2M, first-time homebuyer')"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
          />
        </div>

        {/* Messages */}
        <div className="h-[600px] flex flex-col">
          <MessageList messages={messages} />
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Playground;
