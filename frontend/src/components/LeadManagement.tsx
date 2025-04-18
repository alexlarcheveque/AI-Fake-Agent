import { useState, useCallback, useEffect, useRef } from "react";
import SingleLeadForm from "./SingleLeadForm";
import BulkLeadForm from "./BulkLeadForm";
import LeadList from "./LeadList";
import leadApi from "../api/leadApi";
import { Lead } from "../types/lead";

const LeadManagement = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateSingleLeadModalOpen, setIsCreateSingleLeadModalOpen] = useState(false);
  const [isCreateBulkLeadModalOpen, setIsCreateBulkLeadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState({
    name: true,
    email: true,
    phone: true,
    status: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  
  const singleLeadModalRef = useRef<HTMLDivElement>(null);
  const bulkLeadModalRef = useRef<HTMLDivElement>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await leadApi.getLeads(
        currentPage,
        10,
        searchQuery,
        searchFilters
      );
      setLeads(data.leads);
      setTotalPages(data.totalPages);
      setTotalLeads(data.totalLeads);
    } catch (err) {
      setError("Failed to fetch leads");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, searchFilters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);
  
  // Handle click outside to close modals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCreateSingleLeadModalOpen && 
          singleLeadModalRef.current && 
          !singleLeadModalRef.current.contains(event.target as Node)) {
        setIsCreateSingleLeadModalOpen(false);
      }
      
      if (isCreateBulkLeadModalOpen && 
          bulkLeadModalRef.current && 
          !bulkLeadModalRef.current.contains(event.target as Node)) {
        setIsCreateBulkLeadModalOpen(false);
      }
    };

    if (isCreateSingleLeadModalOpen || isCreateBulkLeadModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreateSingleLeadModalOpen, isCreateBulkLeadModalOpen]);

  const handleLeadCreated = useCallback(async (newLead: Lead) => {
    setLeads((prevLeads) => [newLead, ...prevLeads]);
    setIsCreateSingleLeadModalOpen(false); // Close modal after successful creation
  }, []);

  const handleBulkUploadCreated = useCallback(async (newLeads: Lead[]) => {
    setLeads((prevLeads) => [...newLeads, ...prevLeads]);
    setIsCreateBulkLeadModalOpen(false); // Close modal after successful creation
  }, []);

  const toggleFilter = (filter: keyof typeof searchFilters) => {
    setSearchFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }));
    setCurrentPage(1); // Reset to first page when changing filters
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchLeads();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFilters]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        {/* Add gap in between buttons */}
        <div className="flex space-x-4">  
        <button
          onClick={() => setIsCreateSingleLeadModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add New Lead
        </button>
        <button
          onClick={() => setIsCreateBulkLeadModalOpen(true)}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Bulk Add Leads
        </button>
        </div>
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

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500">
                  Showing page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="w-80">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Lead Search
            </h2>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Search Filters */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Search in:
              </h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={searchFilters.name}
                  onChange={() => toggleFilter("name")}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Name</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={searchFilters.email}
                  onChange={() => toggleFilter("email")}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Email</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={searchFilters.phone}
                  onChange={() => toggleFilter("phone")}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Phone</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={searchFilters.status}
                  onChange={() => toggleFilter("status")}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Status</span>
              </label>
            </div>

            {/* Search Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Found {totalLeads} matching leads
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {isCreateSingleLeadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 overflow-y-auto py-8">
          <div ref={singleLeadModalRef} className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto">
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

      {/* Bulk Lead Modal */}
      {isCreateBulkLeadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 overflow-y-auto py-8">
          <div ref={bulkLeadModalRef} className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">
                  Add Bulk Leads
                </h2>
                <button
                  onClick={() => setIsCreateBulkLeadModalOpen(false)}
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
              <BulkLeadForm onLeadsCreated={handleBulkUploadCreated} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadManagement;
