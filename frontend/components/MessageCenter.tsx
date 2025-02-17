import React, { useState, useEffect } from "react";
import MessageThread from "../src/components/MessageThread";
import leadApi from "../src/api/leadApi";
import { Lead } from "../src/types/lead";

const MessagesCenter: React.FC = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch leads on component mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await leadApi.getLeads(currentPage, 10);
        setLeads(response.leads);
        setTotalPages(response.totalPages);
      } catch (err) {
        setError("Failed to load leads");
        console.error("Error fetching leads:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [currentPage]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="flex gap-4 p-6">
          {/* Sidebar - Lead List */}
          <div className="w-1/4 bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Leads</h2>

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

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
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
              <div className="h-[800px] bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
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
