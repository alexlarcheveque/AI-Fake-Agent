import apiClient from "./apiClient";
import { UserSettings } from "../types/userSettings";

const settingsApi = {
  // Get user settings
  async getUserSettings(): Promise<UserSettings> {
    console.log("Fetching settings for user:");
    return await apiClient.get(`/api/user-settings`);
  },

  // Create user settings
  async createUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    return await apiClient.post(`/api/user-settings`, {
      userId,
      settings,
    });
  },

  // Update user settings
  async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    return await apiClient.put(`/api/user-settings`, {
      userId,
      settings,
    });
  },

  // Delete user settings
  async deleteUserSettings(userId: string): Promise<void> {
    await apiClient.delete(`/api/user-settings/${userId}`);
  },
};

export default settingsApi;
