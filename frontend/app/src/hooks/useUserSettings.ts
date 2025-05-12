import { useState, useEffect } from "react";
import settingsApi from "../api/settingsApi";
import { UserSettingsRow } from "../../../../backend/models/UserSettings";

export interface UseUserSettingsResult {
  userSettings: UserSettingsRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserSettings = (): UseUserSettingsResult => {
  const [userSettings, setUserSettings] = useState<UserSettingsRow | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsApi.getUserSettings();
      setUserSettings(data);
    } catch (err: any) {
      console.error("Error fetching user settings:", err);
      setError("Failed to load user settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSettings();
  }, []);

  return {
    userSettings,
    loading,
    error,
    refetch: fetchUserSettings,
  };
};
