import React, { useEffect, useState } from "react";
import settingsApi, { AgentSettings } from "../api/settingsApi";

// US States array
const US_STATES = [
  { value: "CA", label: "California" },
  { value: "FL", label: "Florida" },
  { value: "TX", label: "Texas" },
];

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AgentSettings>({
    AGENT_NAME: "",
    COMPANY_NAME: "",
    AGENT_CITY: "",
    AGENT_STATE: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getSettings();
      setSettings(data);
    } catch (error) {
      setMessage("Failed to load settings");
      setShowMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange =
    (key: keyof AgentSettings) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSettings((prev) => ({
        ...prev,
        [key]: event.target.value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await settingsApi.updateSettings(settings);
      setMessage("Settings updated successfully");
      setShowMessage(true);
    } catch (error) {
      setMessage("Failed to update settings");
      setShowMessage(true);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Message Toast */}
      {showMessage && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes("Failed")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{message}</span>
            <button
              onClick={() => setShowMessage(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Agent Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agent Name */}
              <div>
                <label
                  htmlFor="agentName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Agent Name
                </label>
                <input
                  type="text"
                  id="agentName"
                  value={settings.AGENT_NAME}
                  onChange={handleChange("AGENT_NAME")}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Company Name */}
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={settings.COMPANY_NAME}
                  onChange={handleChange("COMPANY_NAME")}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* City */}
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={settings.AGENT_CITY}
                  onChange={handleChange("AGENT_CITY")}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* State */}
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  State
                </label>
                <select
                  id="state"
                  value={settings.AGENT_STATE}
                  onChange={handleChange("AGENT_STATE")}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
