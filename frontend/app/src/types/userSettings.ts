export interface UserSettings {
  id?: string;
  agentName: string;
  companyName: string;
  agentState: string;
  followUpIntervalNew?: number;
  followUpIntervalInConversation?: number;
  followUpIntervalInactive?: number;
}
