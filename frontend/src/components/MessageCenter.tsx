import React, { useState, useEffect } from "react";
import MessageThread from "./MessageThread";
import leadApi from "../api/leadApi";
import { Lead } from "../types/lead";
import { useSearchParams } from "react-router-dom";

const MessagesCenter: React.FC = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();

  // Handle URL params when they change
  useEffect(() => {
    const leadIdParam = searchParams.get("leadId");
    if (leadIdParam) {
      const leadId = parseInt(leadIdParam, 10);
      if (!isNaN(leadId)) {
        setSelectedLeadId(leadId);
        
        // If we're setting a new lead from URL params, make sure it's available in our leads list
        if (!leads.some(lead => lead.id === leadId)) {
          // Fetch the specific lead if it's not in our current list
          const fetchSpecificLead = async () => {
            try {
              const response = await leadApi.getLead(leadId);
              if (response) {
                // Add this lead to our list if it's not already there
                setLeads(prevLeads => {
                  if (!prevLeads.some(l => l.id === response.id)) {
                    return [...prevLeads, response];
                  }
                  return prevLeads;
                });
              }
            } catch (err) {
              console.error("Error fetching specific lead:", err);
            }
          };
          
          fetchSpecificLead();
        }
      }
    }
  }, [searchParams, leads]);

  // Listen for lead-updated custom events (e.g., when AI Assistant is toggled off)
  useEffect(() => {
    const handleLeadUpdated = (event: Event) => {
      // Type assertion for the custom event
      const customEvent = event as CustomEvent<{leadId: number, nextScheduledMessage: string | null}>;
      const { leadId, nextScheduledMessage } = customEvent.detail;
      
      // Update the lead in our state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, nextScheduledMessage: nextScheduledMessage || undefined } 
            : lead
        )
      );
    };
    
    // Add event listener
    window.addEventListener('lead-updated', handleLeadUpdated);
    
    // Clean up
    return () => {
      window.removeEventListener('lead-updated', handleLeadUpdated);
    };
  }, []);

  // Fetch leads on component mount and when page changes
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await leadApi.getLeads(currentPage, 10);
        setLeads(response.leads);
        setTotalPages(response.totalPages);

        // Check if leadId is in URL params and we don't already have a selected lead
        if (!selectedLeadId) {
          const leadIdParam = searchParams.get("leadId");
          if (leadIdParam) {
            const leadId = parseInt(leadIdParam, 10);
            if (!isNaN(leadId)) {
              setSelectedLeadId(leadId);
            }
          } else if (response.leads.length > 0) {
            // If no leadId in params and we have leads, select the first one
            setSelectedLeadId(response.leads[0].id);
          }
        }
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
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      <h1 className="text-2xl font-bold mb-6 flex-shrink-0">Messages</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex-shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-full flex">
          {/* Sidebar - Lead List */}
          <div className="w-1/4 border-r border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-700">Leads</h2>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : leads.length === 0 ? (
              // Empty State
              <div className="text-center py-8 text-gray-500 flex-1">
                No leads available
              </div>
            ) : (
              // Lead List
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-2">
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
                      <div className="font-medium flex items-center gap-2">
                        {lead.name}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            lead.aiAssistantEnabled
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {lead.aiAssistantEnabled ? "AI Enabled" : "Manual"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{lead.status}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
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
          <div className="flex-1 h-full">
            {selectedLeadId ? (
              <MessageThread
                leadId={selectedLeadId}
                leadName={leads.find((l) => l.id === selectedLeadId)?.name || 'Unknown Lead'}
                leadEmail={leads.find((l) => l.id === selectedLeadId)?.email}
                leadPhone={
                  leads.find((l) => l.id === selectedLeadId)?.phoneNumber
                }
                leadSource={leads.find((l) => l.id === selectedLeadId)?.status}
                nextScheduledMessage={
                  leads.find((l) => l.id === selectedLeadId)
                    ?.nextScheduledMessage
                }
                messageCount={
                  leads.find((l) => l.id === selectedLeadId)?.messageCount
                }
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
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
