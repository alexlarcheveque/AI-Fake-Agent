import { useState } from "react";
import leadApi from "../src/api/leadApi";
import { Lead } from "../src/types/lead";
import React from "react";

interface LeadListProps {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  onLeadsChange: (leads: Lead[]) => void;
  onError: (error: string | null) => void;
}

const LeadList: React.FC<LeadListProps> = ({
  leads,
  isLoading,
  error,
  onLeadsChange,
  onError,
}) => {
  console.log("leads", leads);

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [updateLoading, setUpdateLoading] = useState<number | null>(null);

  const handleEdit = (lead: Lead) => {
    onError(null);
    setEditingLead({ ...lead });
  };

  const handleUpdate = async () => {
    if (!editingLead) return;

    try {
      onError(null);
      setUpdateLoading(editingLead.id);

      // Only send the fields that can be updated
      const updateData = {
        name: editingLead.name,
        email: editingLead.email,
        phoneNumber: editingLead.phoneNumber,
        status: editingLead.status,
      };

      await leadApi.updateLead(editingLead.id, updateData);

      // Update the local state optimistically
      onLeadsChange(
        leads.map((lead) =>
          lead.id === editingLead.id ? { ...lead, ...updateData } : lead
        )
      );

      setEditingLead(null);
    } catch (err: any) {
      console.error("Update error:", err);
      onError(err.response?.data?.error || "Failed to update lead");
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;

    try {
      onError(null);
      setUpdateLoading(id);
      await leadApi.deleteLead(id);
      onLeadsChange(leads.filter((lead) => lead.id !== id));
    } catch (err: any) {
      console.error("Delete error:", err);
      onError(err.response?.data?.error || "Failed to delete lead");
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleCancel = () => {
    onError(null);
    setEditingLead(null);
  };

  if (isLoading && leads?.length === 0) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {leads.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No leads found</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                {editingLead?.id === lead.id ? (
                  // Edit mode
                  <>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <input
                          type="text"
                          value={editingLead.name}
                          onChange={(e) =>
                            setEditingLead({
                              ...editingLead,
                              name: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                          disabled={updateLoading === lead.id}
                        />
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <input
                          type="email"
                          value={editingLead.email}
                          onChange={(e) =>
                            setEditingLead({
                              ...editingLead,
                              email: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                          disabled={updateLoading === lead.id}
                        />
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <input
                          type="tel"
                          value={editingLead.phoneNumber}
                          onChange={(e) =>
                            setEditingLead({
                              ...editingLead,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                          disabled={updateLoading === lead.id}
                        />
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <select
                          value={editingLead.status}
                          onChange={(e) =>
                            setEditingLead({
                              ...editingLead,
                              status: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none"
                          disabled={updateLoading === lead.id}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2 flex space-x-2">
                        <button
                          onClick={handleUpdate}
                          className={`text-green-600 hover:text-green-900 ${
                            updateLoading === lead.id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          disabled={updateLoading === lead.id}
                        >
                          {updateLoading === lead.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-gray-600 hover:text-gray-900"
                          disabled={updateLoading === lead.id}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <div className="text-sm text-gray-900 leading-8">
                          {lead.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <div className="text-sm text-gray-900 leading-8">
                          {lead.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <div className="text-sm text-gray-900 leading-8">
                          {lead.phoneNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lead.status === "new"
                              ? "bg-blue-100 text-blue-800"
                              : lead.status === "contacted"
                              ? "bg-yellow-100 text-yellow-800"
                              : lead.status === "qualified"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {lead.status.charAt(0).toUpperCase() +
                            lead.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 h-[52px]">
                      <div className="py-2 flex space-x-2">
                        <button
                          onClick={() => handleEdit(lead)}
                          className="text-indigo-600 hover:text-indigo-900"
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LeadList;
