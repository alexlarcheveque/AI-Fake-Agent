import React, { useState, useCallback, useEffect, useRef } from "react";
import SingleLeadForm from "./SingleLeadForm";
import LeadList from "./LeadList";
import leadApi from "../api/leadApi";
import { LeadRow } from "../../../../backend/models/Lead";

const LeadManagement = () => {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateSingleLeadModalOpen, setIsCreateSingleLeadModalOpen] =
    useState(false);
  const [leadLimitInfo, setLeadLimitInfo] = useState<{
    currentCount: number;
    limit: number;
    subscriptionPlan: string;
  } | null>(null);

  const singleLeadModalRef = useRef<HTMLDivElement>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await leadApi.getLeadsByUserId();
      setLeads(data);

      // Fetch lead limit info
      const limitInfo = await leadApi.getLeadLimitInfo();
      setLeadLimitInfo(limitInfo);
    } catch (err) {
      setError("Failed to fetch leads");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle click outside to close modals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isCreateSingleLeadModalOpen &&
        singleLeadModalRef.current &&
        !singleLeadModalRef.current.contains(event.target as Node)
      ) {
        setIsCreateSingleLeadModalOpen(false);
      }
    };

    if (isCreateSingleLeadModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCreateSingleLeadModalOpen]);

  const handleLeadCreated = useCallback(async (newLead: LeadRow) => {
    setLeads((prevLeads) => [newLead, ...prevLeads]);
    setIsCreateSingleLeadModalOpen(false); // Close modal after successful creation

    // Refresh lead limit info after creating a new lead
    try {
      const limitInfo = await leadApi.getLeadLimitInfo();
      setLeadLimitInfo(limitInfo);
    } catch (err) {
      console.error("Failed to update lead limit info:", err);
    }
  }, []);

  const handleAddLeadClick = () => {
    // Check if user has reached their lead limit
    if (leadLimitInfo && leadLimitInfo.currentCount >= leadLimitInfo.limit) {
      setError(
        `You've reached your lead limit (${leadLimitInfo.limit}). Please upgrade your plan to add more leads.`
      );
      return;
    }

    setIsCreateSingleLeadModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <div className="flex items-center gap-4">
          {leadLimitInfo && (
            <div className="text-sm">
              <span
                className={
                  leadLimitInfo.currentCount >= leadLimitInfo.limit
                    ? "text-red-600 font-bold"
                    : "text-gray-600"
                }
              >
                {leadLimitInfo.currentCount}/{leadLimitInfo.limit} leads
              </span>
              <span className="ml-1 text-xs text-gray-500">
                ({leadLimitInfo.subscriptionPlan.toLowerCase()} plan)
              </span>
            </div>
          )}
          <button
            onClick={handleAddLeadClick}
            className={`px-4 py-2 ${
              leadLimitInfo && leadLimitInfo.currentCount >= leadLimitInfo.limit
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-lg transition-colors`}
            disabled={
              leadLimitInfo && leadLimitInfo.currentCount >= leadLimitInfo.limit
            }
          >
            + Add New Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700">
            &times;
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Lead List Section */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Lead List
            </h2>
            <LeadList
              leads={leads}
              isLoading={isLoading}
              error={error}
              onLeadsChange={setLeads}
              onError={setError}
            />
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {isCreateSingleLeadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 overflow-y-auto py-8">
          <div
            ref={singleLeadModalRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">
                  Add New Lead
                </h2>
                <button
                  onClick={() => setIsCreateSingleLeadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <SingleLeadForm onLeadCreated={handleLeadCreated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagement;
