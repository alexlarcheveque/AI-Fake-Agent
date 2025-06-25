import React, { useState, useEffect } from "react";
import callApi from "../api/callApi";

interface CallStats {
  quarterTotal: number;
  quarterCompleted: number;
  todayTotal: number;
  todayCompleted: number;
  callTypes: {
    new_lead: number;
    follow_up: number;
    reactivation: number;
  };
}

const CallAnalytics: React.FC = () => {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await callApi.getCallingStats();
      setStats(data);
    } catch (err: any) {
      console.error("Error fetching call stats:", err);
      setError("Failed to load call analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Call Analytics
        </h3>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Call Analytics
        </h3>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const quarterSuccessRate =
    stats.quarterTotal > 0
      ? ((stats.quarterCompleted / stats.quarterTotal) * 100).toFixed(1)
      : "0.0";

  const todaySuccessRate =
    stats.todayTotal > 0
      ? ((stats.todayCompleted / stats.todayTotal) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Call Analytics</h3>
        <button
          onClick={fetchStats}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-600">Today's Calls</p>
          <p className="text-2xl font-bold text-blue-900">{stats.todayTotal}</p>
          <p className="text-xs text-blue-700">{todaySuccessRate}% success</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-600">Completed Today</p>
          <p className="text-2xl font-bold text-green-900">
            {stats.todayCompleted}
          </p>
          <p className="text-xs text-green-700">
            {stats.todayTotal - stats.todayCompleted} failed
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-purple-600">Quarter Total</p>
          <p className="text-2xl font-bold text-purple-900">
            {stats.quarterTotal}
          </p>
          <p className="text-xs text-purple-700">
            {quarterSuccessRate}% success
          </p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-orange-600">
            Quarter Completed
          </p>
          <p className="text-2xl font-bold text-orange-900">
            {stats.quarterCompleted}
          </p>
          <p className="text-xs text-orange-700">
            {stats.quarterTotal - stats.quarterCompleted} incomplete
          </p>
        </div>
      </div>

      {/* Call Types Breakdown */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Call Types (This Quarter)
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {stats.callTypes.new_lead}
            </p>
            <p className="text-xs text-gray-600">New Leads</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {stats.callTypes.follow_up}
            </p>
            <p className="text-xs text-gray-600">Follow-ups</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M15.707 4.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0zm0 6a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {stats.callTypes.reactivation}
            </p>
            <p className="text-xs text-gray-600">Reactivations</p>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-6 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Performance</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Today's Success Rate</span>
              <span className="font-medium">{todaySuccessRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${todaySuccessRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Quarter Success Rate</span>
              <span className="font-medium">{quarterSuccessRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${quarterSuccessRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallAnalytics;
