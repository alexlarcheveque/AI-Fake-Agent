export interface Message {
  id?: number;
  lead_id?: number;
  text?: string;
  delivery_status?: string;
  error_code?: string;
  error_message?: string;
  is_ai_generated?: boolean;
  created_at?: Date;
  scheduled_at?: Date;
  updated_at?: Date;
}