import axios from "axios";
import { UserSettings } from "../types/userSettings";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const settingsApi = {
  // Get user settings
  async getSettings(): Promise<UserSettings> {
    console.log("fetching settings");

    const response = await axios.get(`${BASE_URL}/api/user-settings`);
    return response.data;
  },

  // Update user settings
  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    const response = await axios.put(`${BASE_URL}/api/user-settings`, settings);
    return response.data;
  },
};

export default settingsApi;
