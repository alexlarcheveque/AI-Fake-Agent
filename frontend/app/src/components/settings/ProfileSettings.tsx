import React from "react";
import { UserSettingsInsert } from "../../../../../backend/models/UserSettings";

interface ProfileSettingsProps {
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

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  settings,
  handleChange,
  handleSubmit,
  isSaving,
  error,
  success,
}) => {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Profile Settings
        </h2>
        <p className="text-gray-600 mt-2">
          Configure your agent information and basic account details.
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

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="agentName"
                value={settings?.agent_name || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will be used in all communications with leads
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={settings?.company_name || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your company name"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your real estate company or brokerage name
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              name="agentState"
              value={settings?.agent_state || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-xs"
              placeholder="e.g., California"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The state where you primarily operate
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-blue-400 mt-0.5 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Profile Information
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Your profile information is used to personalize communications
                  with leads and ensure compliance with local real estate
                  regulations.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
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

export default ProfileSettings;
