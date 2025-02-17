import React, { useState, useEffect } from "react";
import leadApi from "../api/leadApi";
import { Lead } from "../types/lead";
import LeadModal from "./LeadModal";

const LeadManagement: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleArchive = async (id: number) => {
    try {
      await leadApi.archiveLead(id.toString());
      fetchLeads(); // Refresh the list
    } catch (err) {
      setError("Failed to archive lead");
      console.error("Error archiving lead:", err);
    }
  };

  const handleLeadCreated = (newLead: Lead) => {
    setLeads((prevLeads) => [newLead, ...prevLeads]);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {showArchived ? "Show Active Leads" : "Show Archived Leads"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Add New Lead
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {lead.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lead.email}</div>
                  <div className="text-sm text-gray-500">
                    {lead.phoneNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!lead.archived && (
                    <button
                      onClick={() => handleArchive(lead.id)}
                      className="text-indigo-600 hover:text-indigo-900 ml-4"
                    >
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm bg-white border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm bg-white border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLeadCreated={handleLeadCreated}
      />
    </div>
  );
};

export default LeadManagement;
