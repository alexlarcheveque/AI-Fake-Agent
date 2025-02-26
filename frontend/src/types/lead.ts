export interface Lead {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  aiAssistantEnabled: boolean;
  enableFollowUps: boolean;
  nextScheduledMessage?: string; // ISO date string
  lastMessageDate?: string;
  messageCount: number;
  archived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
