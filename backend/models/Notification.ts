export interface Notification {
  id?: number;
  lead_id?: number;
  type?: string;
  title?: string;
  message?: string;
  is_read?: boolean;
  created_at?: Date;
  updated_at?: Date;
}