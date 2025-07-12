import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
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
    canCreateLead: boolean;
    currentCount: number;
    limit: number;
    subscriptionPlan: string;
  } | null>(null);

  // Score filtering states
  const [scoreFilter, setScoreFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [sortBy, setSortBy] = useState<"score" | "name" | "created">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const singleLeadModalRef = useRef<HTMLDivElement>(null);

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = [...leads];

    // Apply score filter
    if (scoreFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const score = lead.overall_score || 0;
        switch (scoreFilter) {
          case "high":
            return score >= 70;
          case "medium":
            return score >= 40 && score < 70;
          case "low":
            return score < 40;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "score":
          comparison = (a.overall_score || 0) - (b.overall_score || 0);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [leads, scoreFilter, sortBy, sortOrder]);

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

  // Listen for call completion events to refresh lead count and lead data
  useEffect(() => {
    const handleCallCompleted = () => {
      console.log("Call completed event received, refreshing lead data...");

      // Refresh both lead limit info and lead list to get updated scores
      const refreshAfterCall = async () => {
        try {
          // Refresh lead limit info
          const limitInfo = await leadApi.getLeadLimitInfo();
          setLeadLimitInfo(limitInfo);

          // Refresh lead list to get updated scores
          await fetchLeads();
          console.log("✅ Refreshed lead data after call completion");
        } catch (err) {
          console.error("Failed to refresh lead data after call:", err);
        }
      };

      refreshAfterCall();
    };

    // Listen for call completion events
    window.addEventListener("call-completed", handleCallCompleted);

    return () => {
      window.removeEventListener("call-completed", handleCallCompleted);
    };
  }, [fetchLeads]);

  // Refresh lead data when user returns to the page (page visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Page became visible, refreshing lead data...");
        // Refresh both lead limit info and lead list when user returns to the page
        const refreshOnVisibilityChange = async () => {
          try {
            const limitInfo = await leadApi.getLeadLimitInfo();
            setLeadLimitInfo(limitInfo);

            // Also refresh lead list to get updated scores
            await fetchLeads();
            console.log("✅ Refreshed lead data on visibility change");
          } catch (err) {
            console.error(
              "Failed to refresh lead data on visibility change:",
              err
            );
          }
        };

        refreshOnVisibilityChange();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
              !!leadLimitInfo &&
              leadLimitInfo.currentCount >= leadLimitInfo.limit
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Lead List ({filteredAndSortedLeads.length})
              </h2>

              {/* Filters and Sorting */}
              <div className="flex items-center gap-4">
                {/* Score Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    Filter:
                  </label>
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Scores</option>
                    <option value="high">High (70+)</option>
                    <option value="medium">Medium (40-69)</option>
                    <option value="low">Low (&lt;40)</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    Sort by:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="score">Score</option>
                    <option value="name">Name</option>
                    <option value="created">Created Date</option>
                  </select>
                </div>

                {/* Sort Order */}
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                  title={
                    sortOrder === "asc" ? "Sort Descending" : "Sort Ascending"
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sortOrder === "asc" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 15l7-7 7 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <LeadList
              leads={filteredAndSortedLeads}
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
