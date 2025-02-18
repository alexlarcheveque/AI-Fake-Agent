export interface Lead {
  id: number;
  name: string;
  phoneNumber: string;
  email: string;
  status: string;
  aiAssistantEnabled: boolean;
  archived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
