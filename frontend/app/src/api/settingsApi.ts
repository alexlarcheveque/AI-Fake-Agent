import apiClient from "./apiClient";
import {
  UserSettingsInsert,
  UserSettingsRow,
} from "../../../../backend/models/UserSettings";

const settingsApi = {
  // Get user settings
  async getUserSettings(): Promise<UserSettingsRow> {
    console.log("Fetching settings for user:");
    return await apiClient.get(`/user-settings`);
  },

  // Alias for getUserSettings for backward compatibility
  async getSettings(): Promise<UserSettingsRow> {
    return this.getUserSettings();
  },

  // Create user settings
  async createUserSettings(
    userId: string,
    settings: UserSettingsInsert
  ): Promise<UserSettingsRow> {
    return await apiClient.post(`/user-settings`, {
      userId,
      settings,
    });
  },

  // Update user settings
  async updateUserSettings(
    userId: string,
    settings: UserSettingsInsert
  ): Promise<UserSettingsRow> {
    return await apiClient.put(`/user-settings`, {
      userId,
      settings,
    });
  },

  // Delete user settings
  async deleteUserSettings(userId: string): Promise<void> {
    await apiClient.delete(`/user-settings/${userId}`);
  },
};

export default settingsApi;
