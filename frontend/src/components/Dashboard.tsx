import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MessageCalendar from "./MessageCalendar";
import leadApi from "../api/leadApi";
import messageApi from "../api/messageApi";

interface DashboardStats {
  totalLeads: number;
  activeConversations: number;
  scheduledMessages: number;
  messagesSent: number;
  deliveredMessages: number;
  failedMessages: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeConversations: 0,
    scheduledMessages: 0,
    messagesSent: 0,
    deliveredMessages: 0,
    failedMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch leads data
        const leadsResponse = await leadApi.getLeads();

        // Count leads with scheduled messages
        const leadsWithScheduledMessages = leadsResponse.leads.filter(
          (lead) => lead.nextScheduledMessage
        ).length;

        // Get message stats with enhanced data
        const messageStats = await messageApi.getMessageStats();

        setStats({
          totalLeads: leadsResponse.totalLeads,
          activeConversations: messageStats.activeConversations || 0,
          scheduledMessages: leadsWithScheduledMessages,
          messagesSent: messageStats.totalMessages || 0,
          deliveredMessages: messageStats.deliveredMessages || 0,
          failedMessages: messageStats.failedMessages || 0,
        });
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
                  <p className="text-gray-500 text-sm">Total Leads</p>
                  <p className="text-2xl font-bold">{stats.totalLeads}</p>
                </div>
              </div>
            </div>

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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Active Conversations</p>
                  <p className="text-2xl font-bold">
                    {stats.activeConversations}
                  </p>
                </div>
              </div>
            </div>

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
                  <p className="text-2xl font-bold">
                    {stats.scheduledMessages}
                  </p>
                </div>
              </div>
            </div>

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
                  <p className="text-gray-500 text-sm">Messages Sent</p>
                  <p className="text-2xl font-bold">{stats.messagesSent}</p>
                  <div className="flex text-xs mt-1">
                    <span className="text-green-600 mr-2">
                      {stats.deliveredMessages} delivered
                    </span>
                    {stats.failedMessages > 0 && (
                      <span className="text-red-600">
                        {stats.failedMessages} failed
                      </span>
                    )}
                  </div>
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
