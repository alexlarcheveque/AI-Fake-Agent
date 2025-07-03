import React from "react";
import { UserSettingsInsert } from "../../../../../backend/models/UserSettings";
import { Voice } from "../../api/callApi";

interface VoiceSettingsProps {
  settings: UserSettingsInsert | null;
  setSettings: React.Dispatch<React.SetStateAction<UserSettingsInsert | null>>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isSaving: boolean;
  error: string | null;
  success: boolean;
  availableVoices: Voice[];
  isLoadingVoices: boolean;
  isTestingVoice: boolean;
  voiceTestResult: string | null;
  callingStats: any;
  isLoadingStats: boolean;
  handleTestVoice: (voiceId: string) => Promise<void>;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  settings,
  setSettings,
  handleChange,
  handleSubmit,
  isSaving,
  error,
  success,
  availableVoices,
  isLoadingVoices,
  isTestingVoice,
  voiceTestResult,
  callingStats,
  isLoadingStats,
  handleTestVoice,
}) => {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Voice Calling Settings
        </h2>
        <p className="text-gray-600 mt-2">
          Configure AI voice calling and analytics settings.
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

      <div className="space-y-6">
        {/* Voice Calling Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Enable Voice Calling
                </h3>
                <p className="text-sm text-gray-500">
                  Allow AI agent to make voice calls to leads
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.voice_calling_enabled || false}
                onChange={(e) => {
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          voice_calling_enabled: e.target.checked,
                        }
                      : prev
                  );
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {settings?.voice_calling_enabled && (
          <>
            {/* Calling Schedule */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Calling Schedule
                </h3>
                <p className="text-gray-500">
                  Configure when the AI agent can make calls
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="callStartTime"
                    value={settings?.call_start_time || "09:00"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="callEndTime"
                    value={settings?.call_end_time || "17:00"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Allowed Days */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Allowed Days
                </h3>
                <p className="text-gray-500">
                  Select which days the AI agent can make calls
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].map((day) => (
                  <label key={day} className="relative cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings?.[`call_${day}` as keyof typeof settings] ||
                        false
                      }
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          [`call_${day}`]: e.target.checked,
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-full px-3 py-2 text-center border border-gray-300 rounded-md text-sm font-medium transition-colors peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 hover:border-gray-400">
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Voice Selection and Call Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Voice Selection */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Voice Selection
                  </h3>
                  <p className="text-gray-500">Choose the AI voice for calls</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Voice
                    </label>
                    <select
                      name="selectedVoice"
                      value={settings?.selected_voice || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a voice</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  {settings?.selected_voice && (
                    <button
                      type="button"
                      onClick={() => handleTestVoice(settings.selected_voice)}
                      disabled={isTestingVoice}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isTestingVoice ? "Testing Voice..." : "Test Voice"}
                    </button>
                  )}
                </div>
              </div>

              {/* Call Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Call Settings
                  </h3>
                  <p className="text-gray-500">
                    Configure call behavior and limits
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Call Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="maxCallDuration"
                      value={settings?.max_call_duration || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="60"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      name="callRetryAttempts"
                      value={settings?.call_retry_attempts || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="5"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Dashboard */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Call Statistics
                </h3>
                <p className="text-gray-500">
                  Performance metrics for voice calls
                </p>
              </div>

              {isLoadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Total Calls
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {callingStats.totalCalls}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Successful
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {callingStats.successfulCalls}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Failed
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {callingStats.failedCalls}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Success Rate
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {callingStats.successRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;
