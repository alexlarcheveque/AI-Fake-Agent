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
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Agent Settings</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Agent Name Setting */}
            <div className="grid grid-cols-12 items-center gap-4">
              <label
                htmlFor="agent-name"
                className="col-span-3 text-sm font-medium text-gray-700"
              >
                Agent Name
              </label>
              <input
                id="agent-name"
                type="text"
                value={settings.AGENT_NAME}
                onChange={handleChange("AGENT_NAME")}
                required
                className="col-span-9 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Company Name Setting */}
            <div className="grid grid-cols-12 items-center gap-4">
              <label
                htmlFor="company-name"
                className="col-span-3 text-sm font-medium text-gray-700"
              >
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                value={settings.COMPANY_NAME}
                onChange={handleChange("COMPANY_NAME")}
                required
                className="col-span-9 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* City Setting */}
            <div className="grid grid-cols-12 items-center gap-4">
              <label
                htmlFor="city"
                className="col-span-3 text-sm font-medium text-gray-700"
              >
                Main City Served
              </label>
              <input
                id="city"
                type="text"
                value={settings.AGENT_CITY}
                onChange={handleChange("AGENT_CITY")}
                required
                className="col-span-9 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* State Setting */}
            <div className="grid grid-cols-12 items-center gap-4">
              <label
                htmlFor="state"
                className="col-span-3 text-sm font-medium text-gray-700"
              >
                Main State Served
              </label>
              <select
                id="state"
                value={settings.AGENT_STATE}
                onChange={handleChange("AGENT_STATE")}
                required
                className="col-span-9 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

          <div className="mt-6">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>

      {showMessage && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
            message.includes("Failed")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
          role="alert"
        >
          <div className="flex justify-between items-center">
            <span>{message}</span>
            <button
              onClick={() => setShowMessage(false)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
