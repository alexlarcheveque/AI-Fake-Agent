import axios from "axios";
import { UserSettings } from "../types/userSettings";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const settingsApi = {
  // Get user settings
  async getSettings(): Promise<UserSettings> {
    console.log("fetching settings");

    const token = localStorage.getItem("token");
    const response = await axios.get(`${BASE_URL}/api/user-settings`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return response.data;
  },

  // Update user settings
  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${BASE_URL}/api/user-settings`, settings, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return response.data;
  },
};

export default settingsApi;
