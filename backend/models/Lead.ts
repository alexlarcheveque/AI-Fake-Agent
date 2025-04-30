export interface Lead {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: number;
  status?: string;
  lead_type?: string;
  last_message_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  is_ai_enabled?: boolean;
  is_archived?: boolean;
  user_id?: number;
}