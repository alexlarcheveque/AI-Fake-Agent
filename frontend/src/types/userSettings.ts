export interface UserSettings {
  agentName: string;
  companyName: string;
  agentState: string;
  agentCity: string;
  aiAssistantEnabled: boolean;
  // Follow-up interval settings (in days)
  followUpIntervalNew?: number;
  followUpIntervalInConversation?: number;
  followUpIntervalQualified?: number;
  followUpIntervalAppointmentSet?: number;
  followUpIntervalConverted?: number;
  followUpIntervalInactive?: number;
}
