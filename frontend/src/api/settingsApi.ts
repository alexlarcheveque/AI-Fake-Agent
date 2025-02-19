import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface AgentSettings {
  AGENT_NAME: string;
  COMPANY_NAME: string;
  AGENT_CITY: string;
  AGENT_STATE: string;
  AI_ASSISTANT_ENABLED: boolean;
}

const settingsApi = {
  // Get all settings
  async getSettings(): Promise<AgentSettings> {
    const response = await axios.get(`${BASE_URL}/api/settings`);
    return response.data;
  },

  // Update settings
  async updateSettings(
    settings: Partial<AgentSettings>
  ): Promise<AgentSettings> {
    const response = await axios.put(`${BASE_URL}/api/settings`, settings);
    return response.data;
  },

  async toggleAiAssistant(enabled: boolean): Promise<AgentSettings> {
    return this.updateSettings({ AI_ASSISTANT_ENABLED: enabled });
  },
};

export default settingsApi;
