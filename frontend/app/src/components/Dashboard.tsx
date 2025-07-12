import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MessageCalendar from "./MessageCalendar";
import leadApi from "../api/leadApi";
import messageApi from "../api/messageApi";
import appointmentApi from "../api/appointmentApi";
import callApi from "../api/callApi";
import { useNotifications } from "../contexts/NotificationContext";
import { format, isToday, isTomorrow } from "date-fns";

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [scheduledMessages, setScheduledMessages] = useState(0);
  const [failedMessages, setFailedMessages] = useState(0);
  const [deliveredMessages, setDeliveredMessages] = useState(0);
  const [appointmentsScheduled, setAppointmentsScheduled] = useState(0);
  const [callingStats, setCallingStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [leadLimitInfo, setLeadLimitInfo] = useState<{
    canCreateLead: boolean;
    currentCount: number;
    limit: number;
    subscriptionPlan: string;
  } | null>(null);

  const navigate = useNavigate();
  const { notifications } = useNotifications();

  // Filter notifications for upcoming activities
  const upcomingActivities = notifications
    .filter(
      (notification) =>
        notification.type === "scheduled_message" ||
        notification.type === "upcoming_message" ||
        notification.type === "call_scheduled" ||
        notification.type === "upcoming_call"
    )
    .slice(0, 5); // Show only the 5 most recent

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get leads
        const leadsResponse = await leadApi.getLeadsByUserId();
        setTotalLeads(leadsResponse.length);

        // Get lead limit info
        const limitInfo = await leadApi.getLeadLimitInfo();
        setLeadLimitInfo(limitInfo);

        // Get messages
        const messageStats = await messageApi.getMessagesByLeadIdDescending(
          leadsResponse[0].id
        );
        setScheduledMessages(
          messageStats.filter(
            (message) => message.delivery_status === "scheduled"
          ).length
        );
        setDeliveredMessages(
          messageStats.filter(
            (message) => message.delivery_status === "delivered"
          ).length
        );
        setFailedMessages(
          messageStats.filter((message) => message.delivery_status === "failed")
            .length
        );

        // Get appointments
        const appointments = await appointmentApi.getAppointmentsByUserId();
        setAppointmentsScheduled(appointments.length);

        // Get calling stats
        setIsLoadingStats(true);
        try {
          const statsResponse = await callApi.getCallingStats();
          setCallingStats(statsResponse);
        } catch (error) {
          console.error("Error fetching calling stats:", error);
          // Set placeholder data if API fails
          setCallingStats({
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            successRate: 0,
          });
        } finally {
          setIsLoadingStats(false);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLeadSelect = (leadId: number) => {
    navigate(`/messages?leadId=${leadId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your AI agent's activity
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalLeads}
                </p>
                {leadLimitInfo?.limit && (
                  <p className="text-xs text-gray-500 mt-1">
                    of {leadLimitInfo.limit} max
                  </p>
                )}
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Appointments
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {appointmentsScheduled}
                </p>
                <p className="text-xs text-gray-500 mt-1">scheduled</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Messages Delivered */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Messages Sent
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {deliveredMessages}
                </p>
                <div className="flex items-center mt-1">
                  <p className="text-xs text-gray-500">
                    {scheduledMessages} pending
                  </p>
                  {failedMessages > 0 && (
                    <span className="ml-2 text-xs text-red-600">
                      • {failedMessages} failed
                    </span>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Calls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Voice Calls</p>
                {isLoadingStats ? (
                  <div className="flex items-center mt-1">
                    <div className="animate-spin rounded-full h-4 w-4 border border-gray-300 border-t-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500">
                      Loading...
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {callingStats?.totalCalls || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {callingStats?.successRate || 0}% success rate
                    </p>
                  </>
                )}
              </div>
              <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-indigo-600"
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
          </div>
        </div>

        {/* Detailed Stats - Only show if there's activity */}
        {(callingStats?.totalCalls > 0 || deliveredMessages > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Call Performance */}
            {callingStats?.totalCalls > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Call Performance
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Successful Calls
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {callingStats.successfulCalls}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Failed Calls</span>
                    <span className="text-sm font-medium text-gray-900">
                      {callingStats.failedCalls}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        Success Rate
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        {callingStats.successRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Performance */}
            {deliveredMessages > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Message Performance
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Messages Delivered
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {deliveredMessages}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Messages Pending
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {scheduledMessages}
                    </span>
                  </div>
                  {failedMessages > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Messages Failed
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {failedMessages}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Calendar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Communication Activity
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Messages and calls scheduled or completed
            </p>
          </div>
          <div className="p-6">
            <MessageCalendar onLeadSelect={handleLeadSelect} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
