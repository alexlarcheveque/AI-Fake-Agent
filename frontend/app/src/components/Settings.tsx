import React, { useState, useEffect, useCallback } from "react";
import settingsApi from "../api/settingsApi";
import subscriptionApi, {
  CurrentSubscription,
  SubscriptionPlans,
} from "../api/subscriptionApi";
import callApi, { Voice } from "../api/callApi";
import { UserSettingsInsert } from "../../../../backend/models/UserSettings";

// Section components
import ProfileSettings from "./settings/ProfileSettings";
import MessagingSettings from "./settings/MessagingSettings";
import VoiceSettings from "./settings/VoiceSettings";
import SubscriptionSettings from "./settings/SubscriptionSettings";

type SettingsSection = "profile" | "messaging" | "voice" | "subscription";

interface SidebarMenuItem {
  id: SettingsSection;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");
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

  const sidebarMenuItems: SidebarMenuItem[] = [
    {
      id: "profile",
      name: "Profile",
      description: "Agent information and basic settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      id: "messaging",
      name: "Messaging",
      description: "Follow-up intervals and communication settings",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      id: "voice",
      name: "Voice Calling",
      description: "AI voice calling configuration and analytics",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      id: "subscription",
      name: "Subscription",
      description: "Billing and plan management",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
  ];

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await settingsApi.getUserSettings();
      setSettings(data);
    } catch (err: any) {
      setError("Failed to fetch settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setIsLoadingSubscription(true);
      const [currentSub, plans] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        subscriptionApi.getSubscriptionPlans(),
      ]);
      setSubscription(currentSub);
      setSubscriptionPlans(plans);
    } catch (err: any) {
      console.error("fetchSubscriptionData: Error", err);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, []);

  const fetchAvailableVoices = useCallback(async () => {
    try {
      setIsLoadingVoices(true);
      // TODO: Implement getAvailableVoices in callApi
      // const voices = await callApi.getAvailableVoices();
      // setAvailableVoices(voices);
      setAvailableVoices([]);
    } catch (err: any) {
      console.error("fetchAvailableVoices: Error", err);
    } finally {
      setIsLoadingVoices(false);
    }
  }, []);

  const handleTestVoice = async (voiceId: string) => {
    try {
      setIsTestingVoice(true);
      setVoiceTestResult(null);
      // TODO: Implement testVoice in callApi
      // const result = await callApi.testVoice(voiceId);
      // if (result.success) {
      //   setVoiceTestResult("Voice test successful! ✓");
      // } else {
      //   setVoiceTestResult(`Voice test failed: ${result.error}`);
      // }
      setVoiceTestResult("Voice testing coming soon! ✓");
      setTimeout(() => setVoiceTestResult(null), 3000);
    } catch (err: any) {
      setVoiceTestResult("Voice test failed: Network error");
      setTimeout(() => setVoiceTestResult(null), 3000);
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleUpgrade = async (planType: "PRO" | "UNLIMITED") => {
    try {
      const { url } = await subscriptionApi.createCheckoutSession(planType);
      window.location.href = url;
    } catch (err: any) {
      setError("Failed to start checkout process. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await subscriptionApi.createCustomerPortalSession();
      window.location.href = url;
    } catch (err: any) {
      setError("Failed to open subscription management. Please try again.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    setSettings((prev) => {
      if (!prev) return prev;

      const fieldMappings: Record<string, string> = {
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

      if (name === "voiceCallingDays") {
        const days = prev.voice_calling_days || [];
        const updatedDays = (e.target as HTMLInputElement).checked
          ? [...days, value]
          : days.filter((day) => day !== value);
        return { ...prev, voice_calling_days: updatedDays };
      }

      const fieldValue =
        type === "number"
          ? parseInt(value) || 0
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value;

      return { ...prev, [dbFieldName]: fieldValue };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);
      const updatedSettings = await settingsApi.updateUserSettings(
        "",
        settings as UserSettingsInsert
      );
      setSettings(updatedSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchSettings();
      await fetchSubscriptionData();
    };
    loadData();
  }, [fetchSettings, fetchSubscriptionData]);

  // Load voice-related data when voice tab is selected
  useEffect(() => {
    if (activeSection === "voice") {
      fetchAvailableVoices();
    }
  }, [activeSection, fetchAvailableVoices]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    const commonProps = {
      settings,
      setSettings,
      handleChange,
      handleSubmit,
      isSaving,
      error,
      success,
    };

    switch (activeSection) {
      case "profile":
        return <ProfileSettings {...commonProps} />;
      case "messaging":
        return <MessagingSettings {...commonProps} />;
      case "voice":
        return (
          <VoiceSettings
            {...commonProps}
            availableVoices={availableVoices}
            isLoadingVoices={isLoadingVoices}
            isTestingVoice={isTestingVoice}
            voiceTestResult={voiceTestResult}
            handleTestVoice={handleTestVoice}
          />
        );
      case "subscription":
        return (
          <SubscriptionSettings
            subscription={subscription}
            subscriptionPlans={subscriptionPlans}
            isLoadingSubscription={isLoadingSubscription}
            handleUpgrade={handleUpgrade}
            handleManageSubscription={handleManageSubscription}
            error={error}
          />
        );
      default:
        return <ProfileSettings {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your preferences</p>
          </div>

          <nav>
            {sidebarMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  activeSection === item.id
                    ? "bg-gray-100 text-gray-900 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span
                  className={`mr-3 ${
                    activeSection === item.id
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  {item.icon}
                </span>
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">{renderActiveSection()}</div>
      </div>
    </div>
  );
};

export default Settings;
