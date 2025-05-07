export interface Notification {
  id: number;
  lead_id: number;
  type: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean | null;
  created_at: Date;
  updated_at: Date | null;
} 