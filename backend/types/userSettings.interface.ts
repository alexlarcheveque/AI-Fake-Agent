export interface UserSettings {
  id: number;
  created_at: Date;
  user_id: number;
  agent_name: string | null;
  company_name: string | null;
  agent_city: string | null;
  agent_state: string | null;
  follow_up_interval_new: number | null;
  follow_up_interval_in_conversation: number | null;
  follow_up_interval_nurture: number | null;
  follow_up_interval_inactive: number | null;
} 