import apiClient from "./apiClient";
import { UserSettings } from "../types/userSettings";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

const settingsApi = {
  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings> {
    console.log("Fetching settings for user:", userId);
    return await apiClient.get(`/api/user-settings/${userId}`);
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

  // Get current user settings - no userId needed as it's determined by auth
  async getSettings(): Promise<UserSettings> {
    try {
      return await apiClient.get(`/api/user-settings/current`);
    } catch (error) {
      console.warn("Error fetching user settings, using defaults:", error);
      // Return default settings instead of throwing an error
      return {
        aiAssistantEnabled: true,
        // Add other default settings as needed
      } as UserSettings;
    }
  },

  // Update current user settings - no userId needed as it's determined by auth
  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    try {
      return await apiClient.put(`/api/user-settings/current`, settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
  },
};

export default settingsApi;
