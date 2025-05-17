import { useState } from "react";
import leadApi from "../api/leadApi";
import React from "react";
import { useNavigate } from "react-router-dom";
import { LeadRow } from "../../../../backend/models/Lead";

interface LeadListProps {
  leads: LeadRow[];
  isLoading: boolean;
  error: string | null;
  onLeadsChange: (leads: LeadRow[]) => void;
  onError: (error: string | null) => void;
}

const LeadList: React.FC<LeadListProps> = ({
  leads = [],
  isLoading,
  error,
  onLeadsChange,
  onError,
}) => {
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [updateLoading, setUpdateLoading] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleEdit = (lead: LeadRow) => {
    onError(null);
    setEditingLead({ ...lead });
  };

  const handleUpdate = async () => {
    if (!editingLead) return;

    try {
      onError(null);
      setUpdateLoading(Number(editingLead.id));

      // Get the original lead to compare AI assistant status
      const originalLead = leads.find((lead) => lead.id === editingLead.id);
      const wasAiEnabled = originalLead?.is_ai_enabled;
      const isTogglingOn = !wasAiEnabled && editingLead.is_ai_enabled;

      // Only send the fields that can be updated
      const updateData = {
        name: editingLead.name,
        email: editingLead.email,
        phone_number: editingLead.phone_number,
        status: editingLead.status,
        is_ai_enabled: editingLead.is_ai_enabled,
      };

      // If we're turning off AI assistant, clear the next scheduled message
      if (wasAiEnabled && !editingLead.is_ai_enabled) {
        Object.assign(updateData, { next_scheduled_message: null });
      }

      const updatedLead = await leadApi.updateLead(
        Number(editingLead.id),
        updateData
      );

      // Update the local state using the server response to ensure we have the complete updated lead
      onLeadsChange(
        leads.map((lead) => (lead.id === editingLead.id ? updatedLead : lead))
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

  const handleViewMessages = (leadId: number, e: React.MouseEvent) => {
    if (editingLead || e.target instanceof HTMLButtonElement) {
      return;
    }

    navigate(`/messages?leadId=${leadId}`);
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
        <div className="relative rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    AI Enabled
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr
                    key={`lead-${lead.id}`}
                    className={`hover:bg-gray-50 ${
                      editingLead?.id !== lead.id ? "cursor-pointer" : ""
                    }`}
                    onClick={(e) =>
                      editingLead?.id !== lead.id &&
                      handleViewMessages(lead.id, e)
                    }
                  >
                    {editingLead?.id === lead.id ? (
                      // Edit mode
                      <>
                        <td className="px-6 h-[52px]">
                          <div className="py-2">
                            <select
                              value={editingLead?.status || ""}
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
                              value={editingLead.email || ""}
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
                              value={editingLead.phone_number || ""}
                              onChange={(e) =>
                                setEditingLead({
                                  ...editingLead,
                                  phone_number: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                              disabled={updateLoading === lead.id}
                            />
                          </div>
                        </td>
                        <td className="px-6 h-[52px]">
                          <div className="py-2 flex justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLead({
                                  ...editingLead,
                                  is_ai_enabled: !editingLead.is_ai_enabled,
                                });
                              }}
                              className={`${
                                editingLead.is_ai_enabled
                                  ? "bg-blue-600"
                                  : "bg-gray-200"
                              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                              disabled={updateLoading === lead.id}
                            >
                              <span
                                className={`${
                                  editingLead.is_ai_enabled
                                    ? "translate-x-5"
                                    : "translate-x-0"
                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 h-[52px]">
                          <div className="py-2 flex justify-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdate();
                              }}
                              className={`p-1 rounded-full hover:bg-green-100 text-green-600 ${
                                updateLoading === lead.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={updateLoading === lead.id}
                              title="Save"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel();
                              }}
                              className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                              disabled={updateLoading === lead.id}
                              title="Cancel"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
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
                              {lead.status &&
                                lead.status?.charAt(0).toUpperCase() +
                                  lead.status?.slice(1)}
                            </span>
                          </div>
                        </td>
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
                              {lead.phone_number}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 h-[52px]">
                          <div className="py-2 flex justify-center">
                            <div className="flex flex-col space-y-1">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  lead.is_ai_enabled
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                AI:{" "}
                                {lead.is_ai_enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 h-[52px]">
                          <div className="py-2 flex justify-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(lead);
                              }}
                              className="p-1 rounded-full hover:bg-blue-100 text-blue-600"
                              disabled={isLoading}
                              title="Edit"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(lead.id);
                              }}
                              className="p-1 rounded-full hover:bg-red-100 text-red-600"
                              disabled={isLoading}
                              title="Delete"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadList;
