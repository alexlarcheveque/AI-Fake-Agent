export interface User {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  reset_token?: string;
  reset_token_expiry?: Date;
  created_at?: Date;
  updated_at?: Date;
}