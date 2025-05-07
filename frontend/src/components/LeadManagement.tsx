import React, { useState, useCallback, useEffect, useRef } from "react";
import SingleLeadForm from "./SingleLeadForm";
import LeadList from "./LeadList";
import leadApi from "../api/leadApi";
import { Lead } from "../types/lead";

const LeadManagement = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateSingleLeadModalOpen, setIsCreateSingleLeadModalOpen] =
    useState(false);

  console.log("leads -- lead management", leads);

  const singleLeadModalRef = useRef<HTMLDivElement>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await leadApi.getLeads();
      setLeads(data);
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

  const handleLeadCreated = useCallback(async (newLead: Lead) => {
    console.log("newLead", newLead);

    setLeads((prevLeads) => [newLead, ...prevLeads]);
    setIsCreateSingleLeadModalOpen(false); // Close modal after successful creation
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <button
          onClick={() => setIsCreateSingleLeadModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add New Lead
        </button>
      </div>

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
