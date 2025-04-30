export interface User {
  id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  created_at: Date;
  updated_at: Date | null;
} 