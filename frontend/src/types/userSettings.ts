export interface UserSettings {
  id?: string;
  userId?: string;
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
  // Agent prompt settings
  agentPrompt?: string;
  buyerLeadPrompt?: string;
  sellerLeadPrompt?: string;
  followUpPrompt?: string;
  firstFollowUpDelay?: number;
  subsequentFollowUpDelay?: number;
  maxFollowUps?: number;
  theme?: string;
  updatedAt?: string;
  createdAt?: string;
}
