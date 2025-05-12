import React, { useState, useEffect } from "react";
import settingsApi from "../api/settingsApi";
import { UserSettingsInsert } from "../../../../backend/models/UserSettings";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettingsInsert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getUserSettings();

      console.log("data", data);

      setSettings(data);
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      setError("Failed to fetch settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    setSettings((prev) => {
      // Handle number inputs for follow-up intervals
      if (name.startsWith("followUpInterval")) {
        return {
          ...prev,
          [name]: type === "number" ? parseInt(value) || 0 : value,
        };
      }

      return {
        ...prev,
        [name]:
          type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      // Pass empty string as userId - the backend will get the actual userId from the auth context
      const updatedSettings = await settingsApi.updateUserSettings(
        "",
        settings as UserSettingsInsert
      );
      setSettings(updatedSettings);

      setSuccess(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 text-green-700">
          Settings saved successfully!
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6 mb-8"
      >
        {/* Agent Information Section */}
        <h2 className="text-xl font-bold mb-4">Agent Information</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              name="agentName"
              value={settings?.agent_name || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              value={settings?.company_name || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <input
              type="text"
              name="agentState"
              value={settings?.agent_state || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Follow-up Intervals Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Follow-up Intervals</h2>
          <p className="text-sm text-gray-600 mb-4">
            Customize how many days to wait before sending follow-up messages to
            leads based on their status.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Lead <span className="text-gray-500">(days)</span>
              </label>
              <input
                type="number"
                name="followUpIntervalNew"
                value={settings?.follow_up_interval_new || ""}
                onChange={handleChange}
                min="1"
                max="90"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 2 days</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                In Conversation <span className="text-gray-500">(days)</span>
              </label>
              <input
                type="number"
                name="followUpIntervalInConversation"
                value={settings?.follow_up_interval_in_converesation || ""}
                onChange={handleChange}
                min="1"
                max="90"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 5 days</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inactive <span className="text-gray-500">(days)</span>
              </label>
              <input
                type="number"
                name="followUpIntervalInactive"
                value={settings?.follow_up_interval_inactive || ""}
                onChange={handleChange}
                min="1"
                max="90"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 30 days</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors 
              ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
