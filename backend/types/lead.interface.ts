export interface Lead {
  id: number;
  name: string | null;
  email: string | null;
  phone_number: number | null;
  status: string | null;
  lead_type: string | null;
  last_message_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  is_ai_enabled: boolean | null;
  is_archived: boolean | null;
  user_id: number;
} 