import React, { useState, useEffect } from "react";
import MessageThread from "../src/components/MessageThread";
import leadApi, { Lead } from "../src/api/leadApi";

const MessagesCenter: React.FC = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads on component mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedLeads = await leadApi.getLeads();
        setLeads(fetchedLeads);
      } catch (err) {
        setError("Failed to load leads");
        console.error("Error fetching leads:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-4">
          {/* Sidebar - Lead List */}
          <div className="w-1/4 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4">Leads</h2>

            {/* Error State */}
            {error && (
              <div className="p-2 mb-4 bg-red-100 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : leads.length === 0 ? (
              // Empty State
              <div className="text-center py-8 text-gray-500">
                No leads available
              </div>
            ) : (
              // Lead List
              <div className="space-y-2">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full p-3 text-left rounded-lg transition-colors
                      ${
                        selectedLeadId === lead.id
                          ? "bg-blue-100 text-blue-800"
                          : "hover:bg-gray-100"
                      }`}
                  >
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-sm text-gray-500">{lead.status}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Content - Message Thread */}
          <div className="flex-1">
            {selectedLeadId ? (
              <div className="h-[800px]">
                <MessageThread
                  leadId={selectedLeadId}
                  leadName={leads.find((l) => l.id === selectedLeadId)?.name}
                  leadEmail={leads.find((l) => l.id === selectedLeadId)?.email}
                  leadPhone={
                    leads.find((l) => l.id === selectedLeadId)?.phoneNumber
                  }
                  leadSource={
                    leads.find((l) => l.id === selectedLeadId)?.status
                  }
                />
              </div>
            ) : (
              <div className="h-[800px] bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-500">
                Select a lead to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesCenter;
