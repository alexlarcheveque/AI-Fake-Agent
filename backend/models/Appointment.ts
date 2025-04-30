export interface Appointment {
  id: number;
  lead_id: number;
  timestamp: Date;
  description: string | null;
  status: string | null;
  created_at: Date;
}