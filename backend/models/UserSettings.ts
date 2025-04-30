export interface UserSettings {
  id?: number;
  created_at?: Date;
  user_id?: number;
  agent_name?: string;
  company_name?: string;
  agent_city?: string;
  agent_state?: string;
  follow_up_interval_new?: number;
  follow_up_interval_in_conversation?: number;
  follow_up_interval_nurture?: number;
  follow_up_interval_inactive?: number;
}