import { useState } from "react";
import leadApi from "../api/leadApi";
import React from "react";
import { useNavigate } from "react-router-dom";
import { LeadRow, formatLeadPhone } from "../../../../backend/models/Lead";
import { LeadStatus } from "./SingleLeadForm";

interface LeadListProps {
  leads: LeadRow[];
  isLoading: boolean;
  error: string | null;
  onLeadsChange: (leads: LeadRow[]) => void;
  onError: (error: string | null) => void;
}

// Helper function to get status color classes
const getStatusColorClasses = (status: string | null | undefined): string => {
  if (!status) return "bg-gray-100 text-gray-800"; // Default for null/undefined

  console.log("status", status);

  switch (status) {
    case LeadStatus.NEW:
      return "bg-blue-100 text-blue-800";
    case LeadStatus.IN_CONVERSATION:
      return "bg-yellow-100 text-yellow-800";
    case LeadStatus.CONVERTED:
      return "bg-green-100 text-green-800";
    case LeadStatus.INACTIVE:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper function to properly capitalize status text
const formatStatusText = (status: string | null | undefined): string => {
  if (!status) return "";
  // Split by underscore or space and capitalize each word
  return status
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to get score color classes based on score value
const getScoreColorClasses = (score: number | null | undefined): string => {
  if (!score && score !== 0) return "text-gray-400"; // No score

  if (score >= 80) return "text-green-600 font-semibold"; // High score
  if (score >= 60) return "text-yellow-600 font-medium"; // Medium score
  if (score >= 40) return "text-orange-600"; // Low-medium score
  return "text-red-600"; // Low score
};

// Helper function to get score badge classes
const getScoreBadgeClasses = (score: number | null | undefined): string => {
  if (!score && score !== 0) return "bg-gray-100 text-gray-500"; // No score

  if (score >= 80) return "bg-green-100 text-green-800"; // High score
  if (score >= 60) return "bg-yellow-100 text-yellow-800"; // Medium score
  if (score >= 40) return "bg-orange-100 text-orange-800"; // Low-medium score
  return "bg-red-100 text-red-800"; // Low score
};

// Helper function to format score display
const formatScore = (score: number | null | undefined): string => {
  if (!score && score !== 0) return "—";
  return `${Math.round(score)}`;
};

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
        context: editingLead.context,
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

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 text-lg mt-4">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No leads found.</p>
        </div>
      ) : (
        <div className="relative rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 relative">
            <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-50 lg:hidden"></div>
            <table
              className="min-w-full divide-y divide-gray-200"
              style={{ minWidth: "980px" }}
            >
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] border-r border-gray-200">
                    Score
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-r border-gray-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-r border-gray-200">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] border-r border-gray-200">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-r border-gray-200">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] border-r border-gray-200">
                    Context
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px] border-r border-gray-200">
                    AI
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
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
                        <td className="px-3 py-2 align-top border-r border-gray-100">
                          <div className="py-2 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeClasses(
                                lead.overall_score
                              )}`}
                            >
                              {formatScore(lead.overall_score)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top border-r border-gray-100">
                          <div className="py-2">
                            <select
                              value={editingLead?.status || ""}
                              onChange={(e) =>
                                setEditingLead({
                                  ...editingLead,
                                  status: e.target.value,
                                })
                              }
                              className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs"
                              disabled={updateLoading === lead.id}
                            >
                              <option value={LeadStatus.NEW}>
                                {formatStatusText(LeadStatus.NEW)}
                              </option>
                              <option value={LeadStatus.IN_CONVERSATION}>
                                {formatStatusText(LeadStatus.IN_CONVERSATION)}
                              </option>
                              <option value={LeadStatus.CONVERTED}>
                                {formatStatusText(LeadStatus.CONVERTED)}
                              </option>
                              <option value={LeadStatus.INACTIVE}>
                                {formatStatusText(LeadStatus.INACTIVE)}
                              </option>
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top border-r border-gray-100">
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
                        <td className="px-4 py-2 align-top border-r border-gray-100">
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
                        <td className="px-4 py-2 align-top border-r border-gray-100">
                          <div className="py-2">
                            <input
                              type="tel"
                              value={editingLead.phone_number || ""}
                              onChange={(e) =>
                                setEditingLead({
                                  ...editingLead,
                                  phone_number: e.target.value
                                    ? parseInt(e.target.value) || 0
                                    : 0,
                                })
                              }
                              className="w-full h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                              disabled={updateLoading === lead.id}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-100">
                          <div className="py-2">
                            <textarea
                              value={editingLead.context || ""}
                              onChange={(e) =>
                                setEditingLead({
                                  ...editingLead,
                                  context: e.target.value,
                                })
                              }
                              className="w-full min-h-[32px] max-h-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm resize-none"
                              disabled={updateLoading === lead.id}
                              rows={2}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top border-r border-gray-100">
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
                              } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                              disabled={updateLoading === lead.id}
                            >
                              <span
                                className={`${
                                  editingLead.is_ai_enabled
                                    ? "translate-x-4"
                                    : "translate-x-0"
                                } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="py-2 flex justify-center space-x-1">
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
                                className="w-4 h-4"
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
                                className="w-4 h-4"
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
                      // View mode
                      <>
                        <td className="px-3 py-4 whitespace-nowrap align-top border-r border-gray-100">
                          <div className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeClasses(
                                lead.overall_score
                              )}`}
                              title={`Interest: ${formatScore(
                                lead.interest_score
                              )} | Sentiment: ${formatScore(
                                lead.sentiment_score
                              )}`}
                            >
                              {formatScore(lead.overall_score)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap align-top border-r border-gray-100">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColorClasses(
                              lead.status
                            )}`}
                          >
                            {formatStatusText(lead.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top border-r border-gray-100">
                          <div className="truncate">{lead.name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 align-top border-r border-gray-100">
                          <div className="truncate">{lead.email || "—"}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 align-top border-r border-gray-100">
                          <div className="truncate">
                            {lead.phone_number ? (
                              <div className="flex items-center space-x-2">
                                <svg
                                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                <span className="font-mono text-gray-900">
                                  {formatLeadPhone(lead)}
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 align-top border-r border-gray-100">
                          <div className="whitespace-pre-wrap break-words">
                            {lead.context || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center align-top border-r border-gray-100">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              lead.is_ai_enabled
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {lead.is_ai_enabled ? "On" : "Off"}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center align-top">
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(lead);
                              }}
                              className="p-1 rounded-full hover:bg-blue-100 text-blue-600"
                              title="Edit"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(lead.id);
                              }}
                              className="p-1 rounded-full hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <svg
                                className="w-4 h-4"
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
