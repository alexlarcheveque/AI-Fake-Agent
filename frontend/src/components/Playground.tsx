import React, { useState, useEffect } from "react";
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
        sender: "lead",
        twilioSid: `local-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        useAiResponse: true,
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
      setMessages((prev) => [...prev, response.message]);
    } catch (error) {
      setError("Failed to send message");
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await messageApi.sendLocalMessage(
        leadContext
          ? `Create a short, warm and engaging introduction message with the following context: ${leadContext}. Be sure to confirm what the lead is looking for.`
          : "Create a short, warm and engaging introduction message",
        []
      );
      setMessages([response.message]);
    } catch (error) {
      setError("Failed to start conversation");
      console.error("Error starting conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomContext = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_LEAD_CONTEXT.length);
    setLeadContext(SAMPLE_LEAD_CONTEXT[randomIndex]);
    setMessages([]);
  };

  // Generate initial greeting when lead context changes
  useEffect(() => {
    if (leadContext.trim()) {
      handleStartConversation();
    }
  }, [leadContext]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AI Playground</h1>

      {/* Warning Banner */}
      <div className="my-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
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
              This is a test environment. All messages will be deleted when you
              leave this page.
            </p>
          </div>
        </div>
      </div>

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
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                className="h-4 w-4 mr-1"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
                />
              </svg>
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
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="mb-4">No messages yet</p>
                <button
                  onClick={handleStartConversation}
                  disabled={isLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? "Starting..." : "Start Conversation"}
                </button>
              </div>
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
          <div className="flex-shrink-0">
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
