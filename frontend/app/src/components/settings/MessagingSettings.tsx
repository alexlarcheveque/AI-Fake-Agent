import React from "react";
import { UserSettingsInsert } from "../../../../../backend/models/UserSettings";

interface MessagingSettingsProps {
  settings: UserSettingsInsert | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettingsInsert | null>>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isSaving: boolean;
  error: string | null;
  success: boolean;
}

const MessagingSettings: React.FC<MessagingSettingsProps> = ({
  settings,
  handleChange,
  handleSubmit,
  isSaving,
  error,
  success,
}) => {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Messaging Settings
        </h2>
        <p className="text-gray-600 mt-2">
          Configure follow-up intervals and communication settings.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-md">
          <p className="text-green-700 text-sm">Settings saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Lead Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">New Lead</h3>
              <p className="text-gray-500 text-sm">First interaction</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Interval (hours)
              </label>
              <input
                type="number"
                name="newLeadInterval"
                value={settings?.new_lead_interval || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="168"
                placeholder="24"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Time between first contact and first follow-up
              </p>
            </div>
          </div>

          {/* In Conversation Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                In Conversation
              </h3>
              <p className="text-gray-500 text-sm">Active engagement</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Interval (hours)
              </label>
              <input
                type="number"
                name="inConversationInterval"
                value={settings?.in_conversation_interval || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="168"
                placeholder="48"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Time between messages during active conversations
              </p>
            </div>
          </div>

          {/* Inactive Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Inactive</h3>
              <p className="text-gray-500 text-sm">Re-engagement</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Interval (hours)
              </label>
              <input
                type="number"
                name="inactiveInterval"
                value={settings?.inactive_interval || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="168"
                placeholder="72"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Time before attempting to re-engage inactive leads
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessagingSettings;
