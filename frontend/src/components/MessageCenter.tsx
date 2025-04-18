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

  // First effect: Check URL params on component mount and load specific lead if provided
  useEffect(() => {
    const loadInitialData = async () => {
      const leadIdParam = searchParams.get("leadId");
      
      if (leadIdParam) {
        const leadId = parseInt(leadIdParam, 10);
        if (!isNaN(leadId)) {
          setSelectedLeadId(leadId);
          
          // Immediately fetch this specific lead before anything else
          try {
            const leadData = await leadApi.getLead(leadId);
            if (leadData) {
              // Add this specific lead to our state
              setLeads([leadData]);
              
              // Then continue with regular lead loading
              fetchPagedLeads(currentPage);
            }
          } catch (err) {
            console.error("Error fetching specific lead:", err);
            setError("Failed to load lead details");
            // Continue with regular lead loading even if specific lead fails
            fetchPagedLeads(currentPage);
          }
        } else {
          // No valid leadId, just load regular leads
          fetchPagedLeads(currentPage);
        }
      } else {
        // No leadId param, just load regular leads
        fetchPagedLeads(currentPage);
      }
    };
    
    loadInitialData();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on component mount
  
  // Update leads when page changes
  useEffect(() => {
    // Skip on initial mount as it's handled by the first effect
    if (!isLoading) {
      fetchPagedLeads(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Helper function to fetch leads by page
  const fetchPagedLeads = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await leadApi.getLeads(page, 10);
      
      // Preserve the specific lead if it exists
      if (selectedLeadId) {
        const existingSpecificLead = leads.find(l => Number(l.id) === selectedLeadId);
        if (existingSpecificLead && !response.leads.some(l => Number(l.id) === selectedLeadId)) {
          // Make sure we don't lose our selected lead when changing pages
          setLeads([...response.leads, existingSpecificLead]);
        } else {
          setLeads(response.leads);
        }
      } else {
        setLeads(response.leads);
        // If no lead is selected and we have leads, select the first one
        if (response.leads.length > 0 && !selectedLeadId) {
          setSelectedLeadId(Number(response.leads[0].id));
        }
      }
      
      setTotalPages(response.totalPages);
    } catch (err) {
      setError("Failed to load leads");
      console.error("Error fetching leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for lead-updated custom events
  useEffect(() => {
    const handleLeadUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{leadId: number, nextScheduledMessage: string | null}>;
      const { leadId, nextScheduledMessage } = customEvent.detail;
      
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          Number(lead.id) === leadId 
            ? { ...lead, nextScheduledMessage: nextScheduledMessage || undefined } 
            : lead
        )
      );
    };
    
    window.addEventListener('lead-updated', handleLeadUpdated);
    return () => {
      window.removeEventListener('lead-updated', handleLeadUpdated);
    };
  }, []);

  // Find the selected lead once to avoid repeated lookups
  const selectedLead = selectedLeadId ? leads.find((l) => Number(l.id) === selectedLeadId) : undefined;

  console.log('selectedLead', selectedLead);

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
                      onClick={() => setSelectedLeadId(Number(lead.id))}
                      className={`w-full p-3 text-left rounded-lg transition-colors
                        ${
                          selectedLeadId === Number(lead.id)
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
                leadName={selectedLead?.name || 'Unknown Lead'}
                leadEmail={selectedLead?.email}
                leadPhone={selectedLead?.phoneNumber}
                leadType={selectedLead?.leadType}
                leadSource={selectedLead?.status}
                nextScheduledMessage={selectedLead?.nextScheduledMessage}
                messageCount={selectedLead?.messageCount}
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
