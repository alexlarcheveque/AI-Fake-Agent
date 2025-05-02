import axios from "axios";
import { UserSettings } from "../types/userSettings";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const settingsApi = {
  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings> {
    console.log("Fetching settings for user:", userId);
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${BASE_URL}/api/user-settings/${userId}`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );
    return response.data;
  },

  // Create user settings
  async createUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${BASE_URL}/api/user-settings`,
      {
        userId,
        settings,
      },
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );
    return response.data;
  },

  // Update user settings
  async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    const token = localStorage.getItem("token");
    const response = await axios.put(
      `${BASE_URL}/api/user-settings`,
      {
        userId,
        settings,
      },
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );
    return response.data;
  },

  // Delete user settings
  async deleteUserSettings(userId: string): Promise<void> {
    const token = localStorage.getItem("token");
    await axios.delete(`${BASE_URL}/api/user-settings/${userId}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
  },

  // Backward compatibility method
  async getSettings(): Promise<UserSettings> {
    console.log("Using deprecated getSettings() method");
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    if (!userId) {
      throw new Error("No userId found in localStorage");
    }
    return this.getUserSettings(userId);
  },

  // Backward compatibility method
  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    console.log("Using deprecated updateSettings() method");
    const userId = localStorage.getItem("userId");
    if (!userId) {
      throw new Error("No userId found in localStorage");
    }
    return this.updateUserSettings(userId, settings);
  },
};

export default settingsApi;
