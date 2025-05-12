import React, { useState, useEffect } from "react";
import MessageThread from "./MessageThread";
import leadApi from "../api/leadApi";
import { useSearchParams } from "react-router-dom";
import { LeadRow } from "../../../../backend/models/Lead";

const MessagesCenter: React.FC = () => {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Single effect to handle all data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      const leadIdParam = searchParams.get("leadId");
      const targetLeadId = leadIdParam ? parseInt(leadIdParam, 10) : null;

      try {
        if (targetLeadId && !isNaN(targetLeadId)) {
          const specificLead = await leadApi.getLead(targetLeadId);
          if (specificLead) {
            setSelectedLeadId(targetLeadId);
            setLeads([specificLead]);
          }
        }

        // Always fetch the full list of leads
        const allLeads = await leadApi.getLeadsByUserId();

        if (targetLeadId && !isNaN(targetLeadId)) {
          // If we have a specific lead, make sure it's in the list
          const specificLeadExists = allLeads.some(
            (l) => Number(l.id) === targetLeadId
          );
          if (!specificLeadExists) {
            const specificLead = await leadApi.getLead(targetLeadId);
            if (specificLead) {
              setLeads([...allLeads, specificLead]);
            } else {
              setLeads(allLeads);
            }
          } else {
            setLeads(allLeads);
          }
        } else {
          setLeads(allLeads);
          // If no specific lead is selected, select the first one
          if (allLeads.length > 0 && !selectedLeadId) {
            setSelectedLeadId(Number(allLeads[0].id));
          }
        }
      } catch (err) {
        console.error("Error loading leads:", err);
        setError("Failed to load leads");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  // Listen for lead-updated custom events
  useEffect(() => {
    const handleLeadUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        leadId: number;
        nextScheduledMessage: string | null;
      }>;
      const { leadId, nextScheduledMessage } = customEvent.detail;

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          Number(lead.id) === leadId
            ? {
                ...lead,
                nextScheduledMessage: nextScheduledMessage || undefined,
              }
            : lead
        )
      );
    };

    window.addEventListener("lead-updated", handleLeadUpdated);
    return () => {
      window.removeEventListener("lead-updated", handleLeadUpdated);
    };
  }, []);

  const selectedLead = selectedLeadId
    ? leads.find((l) => Number(l.id) === selectedLeadId)
    : undefined;

  console.log("selectedLead", selectedLead);

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
                            lead.is_ai_enabled
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {lead.is_ai_enabled ? "AI Enabled" : "Manual"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{lead.status}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 h-full">
            {selectedLeadId ? (
              <MessageThread
                leadId={selectedLeadId}
                leadName={selectedLead?.name || "Unknown Lead"}
                leadEmail={selectedLead?.email || undefined}
                leadPhone={selectedLead?.phone_number?.toString() || undefined}
                leadType={selectedLead?.lead_type || undefined}
                leadSource={selectedLead?.status || undefined}
                onClose={() => {}}
                onLeadUpdate={() => {}}
                onAppointmentCreated={() => {}}
                onAppointmentUpdated={() => {}}
                onAppointmentDeleted={() => {}}
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
