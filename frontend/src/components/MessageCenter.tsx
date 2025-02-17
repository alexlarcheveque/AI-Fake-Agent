import React, { useState, useEffect } from "react";
import leadApi from "../api/leadApi";
import messageApi from "../api/messageApi";
import { Lead } from "../types/lead";
import { Message } from "../types/message";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const MessageCenter: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showArchived, setShowArchived] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await leadApi.getLeads(currentPage, 10, showArchived);
      setLeads(response.leads);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError("Failed to fetch leads");
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, showArchived]);

  const fetchMessages = async (leadId: number) => {
    try {
      const messages = await messageApi.getMessages(leadId.toString());
      setMessages(messages);
    } catch (err) {
      setError("Failed to fetch messages");
      console.error("Error fetching messages:", err);
    }
  };

  const handleLeadSelect = async (lead: Lead) => {
    setSelectedLead(lead);
    await fetchMessages(lead.id);
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedLead) return;

    try {
      const message = await messageApi.sendMessage(
        selectedLead.id.toString(),
        text
      );
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError("Failed to send message");
      console.error("Error sending message:", err);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await leadApi.archiveLead(id.toString());
      fetchLeads();
      if (selectedLead?.id === id) {
        setSelectedLead(null);
        setMessages([]);
      }
    } catch (err) {
      setError("Failed to archive lead");
      console.error("Error archiving lead:", err);
    }
  };

  if (loading && !leads.length) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Message Center</h1>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          {showArchived ? "Show Active Leads" : "Show Archived Leads"}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Lead List */}
        <div className="col-span-4 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedLead?.id === lead.id ? "bg-blue-50" : ""
                }`}
                onClick={() => handleLeadSelect(lead)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {lead.name}
                    </h3>
                    <p className="text-sm text-gray-500">{lead.email}</p>
                  </div>
                  {!lead.archived && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(lead.id);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          <div className="flex justify-center p-4 border-t">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 mr-2"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50 ml-2"
            >
              Next
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div className="col-span-8 bg-white rounded-lg shadow">
          {selectedLead ? (
            <div className="h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedLead.name}
                </h2>
                <p className="text-sm text-gray-500">{selectedLead.email}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MessageList messages={messages} />
              </div>
              {!selectedLead.archived && (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  isLoading={loading}
                />
              )}
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center text-gray-500">
              Select a lead to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageCenter;
