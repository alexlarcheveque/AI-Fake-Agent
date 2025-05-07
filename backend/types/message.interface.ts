export interface Message {
  id: number;
  lead_id: number;
  text: string | null;
  delivery_status: string | null;
  error_code: string | null;
  error_message: string | null;
  is_ai_generated: boolean | null;
  created_at: Date | null;
  scheduled_at: Date | null;
  updated_at: Date | null;
} 