import React, { useState, useEffect } from "react";
import settingsApi from "../api/settingsApi";
import subscriptionApi, {
  CurrentSubscription,
  SubscriptionPlans,
} from "../api/subscriptionApi";
import callApi, { Voice } from "../api/callApi";
import { UserSettingsInsert } from "../../../../backend/models/UserSettings";

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettingsInsert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(
    null
  );
  const [subscriptionPlans, setSubscriptionPlans] =
    useState<SubscriptionPlans | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  // Voice calling state
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceTestResult, setVoiceTestResult] = useState<string | null>(null);
  const [callingStats, setCallingStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Load settings and subscription data on component mount
  useEffect(() => {
    fetchSettings();
    fetchSubscriptionData();
    fetchAvailableVoices();
    fetchCallingStats();
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

  const fetchSubscriptionData = async () => {
    try {
      setIsLoadingSubscription(true);
      const [currentSub, plans] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        subscriptionApi.getSubscriptionPlans(),
      ]);
      setSubscription(currentSub);
      setSubscriptionPlans(plans);
    } catch (err: any) {
      console.error("Error fetching subscription data:", err);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      setIsLoadingVoices(true);
      const voices = await callApi.getAvailableVoices();
      setAvailableVoices(voices);
    } catch (err: any) {
      console.error("Error fetching available voices:", err);
      // Don't set error for voice fetching as it's not critical
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleTestVoice = async (voiceId: string) => {
    try {
      setIsTestingVoice(true);
      setVoiceTestResult(null);

      const result = await callApi.testVoice(voiceId);

      if (result.success) {
        setVoiceTestResult("Voice test successful! ✓");
      } else {
        setVoiceTestResult(`Voice test failed: ${result.error}`);
      }

      // Clear test result after 3 seconds
      setTimeout(() => {
        setVoiceTestResult(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error testing voice:", err);
      setVoiceTestResult("Voice test failed: Network error");
      setTimeout(() => {
        setVoiceTestResult(null);
      }, 3000);
    } finally {
      setIsTestingVoice(false);
    }
  };

  const fetchCallingStats = async () => {
    try {
      setIsLoadingStats(true);
      const stats = await callApi.getCallingStats();
      setCallingStats(stats);
    } catch (err: any) {
      console.error("Error fetching calling stats:", err);
      // Don't set error for stats fetching as it's not critical
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleUpgrade = async (planType: "PRO" | "UNLIMITED") => {
    try {
      const { url } = await subscriptionApi.createCheckoutSession(planType);
      window.location.href = url;
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      setError("Failed to start checkout process. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await subscriptionApi.createCustomerPortalSession();
      window.location.href = url;
    } catch (err: any) {
      console.error("Error creating portal session:", err);
      setError("Failed to open subscription management. Please try again.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    setSettings((prev) => {
      if (!prev) return prev;

      // Map form field names to database field names
      const fieldMappings = {
        agentName: "agent_name",
        companyName: "company_name",
        agentState: "agent_state",
        followUpIntervalNew: "follow_up_interval_new",
        followUpIntervalInConversation: "follow_up_interval_in_converesation",
        followUpIntervalInactive: "follow_up_interval_inactive",
        voiceCallingEnabled: "voice_calling_enabled",
        voiceCallingHoursStart: "voice_calling_hours_start",
        voiceCallingHoursEnd: "voice_calling_hours_end",
        elevenlabsVoiceId: "elevenlabs_voice_id",
        callRetryAttempts: "call_retry_attempts",
        quarterlyCallLimit: "quarterly_call_limit",
      };

      const dbFieldName = fieldMappings[name] || name;

      // Handle special cases
      if (name === "voiceCallingDays") {
        // Handle checkbox array for calling days
        const days = prev.voice_calling_days || [];
        const updatedDays = (e.target as HTMLInputElement).checked
          ? [...days, value]
          : days.filter((day) => day !== value);

        return {
          ...prev,
          voice_calling_days: updatedDays,
        };
      }

      // Handle number inputs
      const fieldValue =
        type === "number"
          ? parseInt(value) || 0
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value;

      return {
        ...prev,
        [dbFieldName]: fieldValue,
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

        {/* Voice Calling Settings Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Voice Calling Settings
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure AI voice calling for automated lead outreach. Voice calls
            will be made using ElevenLabs AI voices.
          </p>

          {/* Global Voice Calling Enable/Disable */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Enable Voice Calling
                </h3>
                <p className="text-sm text-gray-500">
                  Allow the system to make automated voice calls to leads
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          voice_calling_enabled: !prev.voice_calling_enabled,
                        }
                      : prev
                  );
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings?.voice_calling_enabled
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.voice_calling_enabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Voice Calling Configuration */}
          {settings?.voice_calling_enabled && (
            <div className="space-y-6">
              {/* Calling Hours */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Calling Hours
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <select
                      name="voiceCallingHoursStart"
                      value={settings?.voice_calling_hours_start || 11}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0
                            ? "12:00 AM"
                            : i < 12
                            ? `${i}:00 AM`
                            : i === 12
                            ? "12:00 PM"
                            : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <select
                      name="voiceCallingHoursEnd"
                      value={settings?.voice_calling_hours_end || 19}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0
                            ? "12:00 AM"
                            : i < 12
                            ? `${i}:00 AM`
                            : i === 12
                            ? "12:00 PM"
                            : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Calls will only be made during these hours (based on lead's
                  local time)
                </p>
              </div>

              {/* Allowed Days */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Allowed Days
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                  ].map((day) => (
                    <label key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        name="voiceCallingDays"
                        value={day}
                        checked={
                          settings?.voice_calling_days?.includes(day) ?? true
                        }
                        onChange={handleChange}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {day.slice(0, 3)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Voice Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  AI Voice Selection
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <select
                      name="elevenlabsVoiceId"
                      value={settings?.elevenlabs_voice_id || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoadingVoices}
                    >
                      <option value="">Select a voice...</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}{" "}
                          {voice.labels?.gender
                            ? `(${voice.labels.gender})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {settings?.elevenlabs_voice_id && (
                    <button
                      type="button"
                      onClick={() =>
                        handleTestVoice(settings.elevenlabs_voice_id!)
                      }
                      disabled={isTestingVoice}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isTestingVoice ? "Testing..." : "Test Voice"}
                    </button>
                  )}
                </div>
                {voiceTestResult && (
                  <p
                    className={`text-xs mt-2 ${
                      voiceTestResult.includes("successful")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {voiceTestResult}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Choose the AI voice that will represent you in automated calls
                </p>
              </div>

              {/* Call Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    name="callRetryAttempts"
                    value={settings?.call_retry_attempts || 2}
                    onChange={handleChange}
                    min="1"
                    max="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How many times to retry if call fails (1-5)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quarterly Call Limit (Inactive Leads)
                  </label>
                  <input
                    type="number"
                    name="quarterlyCallLimit"
                    value={settings?.quarterly_call_limit || 1}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max calls per inactive lead per quarter (1-10)
                  </p>
                </div>
              </div>

              {/* Voice Calling Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      How Voice Calling Works
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          <strong>New leads</strong> are called automatically
                          within 1 hour
                        </li>
                        <li>
                          <strong>Inactive leads</strong> are called once per
                          quarter for reactivation
                        </li>
                        <li>
                          Calls include <strong>AI-generated scripts</strong>{" "}
                          based on lead type (buyer/seller)
                        </li>
                        <li>
                          All calls are{" "}
                          <strong>recorded and transcribed</strong> with AI
                          summaries
                        </li>
                        <li>
                          If calls fail, <strong>SMS fallback</strong> messages
                          are sent automatically
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* Voice Calling Statistics */}
      {settings?.voice_calling_enabled && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Voice Calling Statistics
          </h2>

          {isLoadingStats ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : callingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Today's Stats */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-900">Today</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {callingStats.todayTotal}
                    </p>
                    <p className="text-sm text-blue-700">
                      {callingStats.todayCompleted} completed
                    </p>
                  </div>
                </div>
              </div>

              {/* Quarter Stats */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-900">
                      This Quarter
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {callingStats.quarterTotal}
                    </p>
                    <p className="text-sm text-green-700">
                      {callingStats.quarterCompleted} completed
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-900">
                      Success Rate
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {callingStats.quarterTotal > 0
                        ? Math.round(
                            (callingStats.quarterCompleted /
                              callingStats.quarterTotal) *
                              100
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-purple-700">Completion rate</p>
                  </div>
                </div>
              </div>

              {/* Call Types Breakdown */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg
                      className="w-6 h-6 text-orange-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-900">
                      Call Types
                    </p>
                    <div className="mt-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-orange-700">New:</span>
                        <span className="font-medium text-orange-900">
                          {callingStats.callTypes.new_lead}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-orange-700">Follow-up:</span>
                        <span className="font-medium text-orange-900">
                          {callingStats.callTypes.follow_up}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-orange-700">Reactivation:</span>
                        <span className="font-medium text-orange-900">
                          {callingStats.callTypes.reactivation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No calling statistics available yet.</p>
              <p className="text-sm">
                Statistics will appear once you start making voice calls.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subscription Management Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Subscription Management</h2>

        {isLoadingSubscription ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {/* Current Plan */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Current Plan</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium capitalize">
                    {subscription?.plan?.toLowerCase()} Plan
                  </p>
                  {subscription?.status && (
                    <p className="text-sm text-gray-600 capitalize">
                      Status: {subscription.status.replace("_", " ")}
                    </p>
                  )}
                  {subscriptionPlans && subscription && (
                    <p className="text-sm text-gray-600">
                      Lead Limit:{" "}
                      {subscriptionPlans[subscription.plan]?.leadLimit ===
                      Infinity
                        ? "Unlimited"
                        : subscriptionPlans[
                            subscription.plan
                          ]?.leadLimit?.toLocaleString()}
                    </p>
                  )}
                </div>

                {subscription?.plan !== "FREE" &&
                  subscription?.subscriptionId && (
                    <button
                      onClick={handleManageSubscription}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Manage Subscription
                    </button>
                  )}
              </div>
            </div>

            {/* Upgrade Options */}
            {subscription?.plan === "FREE" && subscriptionPlans && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Upgrade Your Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pro Plan */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-gray-900">
                      Pro Plan
                    </h4>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      ${subscriptionPlans.PRO.price}/year
                    </p>
                    <ul className="mt-4 space-y-2">
                      <li className="flex items-center text-sm">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Up to {subscriptionPlans.PRO.leadLimit.toLocaleString()}{" "}
                        leads
                      </li>
                      <li className="flex items-center text-sm">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Advanced AI features
                      </li>
                      <li className="flex items-center text-sm">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Priority support
                      </li>
                    </ul>
                    <button
                      onClick={() => handleUpgrade("PRO")}
                      className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upgrade to Pro
                    </button>
                  </div>

                  {/* Unlimited Plan */}
                  <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                    <h4 className="text-lg font-bold text-gray-900">
                      Unlimited Plan
                    </h4>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      ${subscriptionPlans.UNLIMITED.price}/year
                    </p>
                    <ul className="mt-4 space-y-2">
                      <li className="flex items-center text-sm">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Unlimited leads
                      </li>
                      <li className="flex items-center text-sm">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        All Pro features
                      </li>
                      <li className="flex items-center text-sm">
                        <svg
                          className="h-4 w-4 text-green-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Premium support
                      </li>
                    </ul>
                    <button
                      onClick={() => handleUpgrade("UNLIMITED")}
                      className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Upgrade to Unlimited
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
