import axios from "axios";
import { getAuthHeader } from "../utils/auth";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface UserSettings {
  id: number;
  userId: string;
  agentName: string;
  companyName: string;
  agentCity: string;
  agentState: string;
  aiAssistantEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const settingsApi = {
  // Get settings for current user
  async getSettings(): Promise<UserSettings> {
    const response = await axios.get(`${BASE_URL}/api/settings`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Update settings for current user
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await axios.put(`${BASE_URL}/api/settings`, settings, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async toggleAiAssistant(enabled: boolean): Promise<UserSettings> {
    return this.updateSettings({ aiAssistantEnabled: enabled });
  },
};

export default settingsApi;
