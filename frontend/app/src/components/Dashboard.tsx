import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MessageCalendar from "./MessageCalendar";
import leadApi, { LeadLimitInfo } from "../api/leadApi";
import messageApi from "../api/messageApi";
import appointmentApi from "../api/appointmentApi";
import { useNotifications } from "../contexts/NotificationContext";
import { format, isToday, isTomorrow } from "date-fns";

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [scheduledMessages, setScheduledMessages] = useState(0);
  const [failedMessages, setFailedMessages] = useState(0);
  const [deliveredMessages, setDeliveredMessages] = useState(0);
  const [appointmentsScheduled, setAppointmentsScheduled] = useState(0);
  const [leadLimitInfo, setLeadLimitInfo] = useState<LeadLimitInfo | null>(
    null
  );

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Leads Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">
                    Total Leads (Free Tier)
                  </p>
                  <p className="text-2xl font-bold">
                    {totalLeads} / {leadLimitInfo?.limit || 10}
                  </p>
                </div>
              </div>
            </div>

            {/* Scheduled Messages Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Scheduled Messages</p>
                  <p className="text-2xl font-bold">{scheduledMessages}</p>
                </div>
              </div>
            </div>

            {/* Messages Sent Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-500 mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Messages Delivered</p>
                  <p className="text-2xl font-bold">{deliveredMessages}</p>
                  <div className="flex text-xs mt-1">
                    {failedMessages > 0 && (
                      <span className="text-red-600">
                        {failedMessages} failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Appointments Scheduled Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">
                    Appointments Scheduled
                  </p>
                  <p className="text-2xl font-bold">{appointmentsScheduled}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div id="calendar-section" className="mt-8">
            <h2 className="text-xl font-bold mb-4">Message Calendar</h2>
            <MessageCalendar onLeadSelect={handleLeadSelect} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
