-- Add downgrade support to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS downgrade_grace_period_until TIMESTAMPTZ;

-- Add archival fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create scheduled_tasks table for background job processing
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  parameters JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create index for efficient task processing
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_pending 
ON scheduled_tasks (scheduled_for, status) 
WHERE status = 'pending';

-- Create index for user grace periods
CREATE INDEX IF NOT EXISTS idx_user_settings_grace_period 
ON user_settings (downgrade_grace_period_until) 
WHERE downgrade_grace_period_until IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.downgrade_grace_period_until IS 'Grace period end date for users who have downgraded and exceed their new plan limits';
COMMENT ON COLUMN leads.archived_reason IS 'Reason why lead was archived (e.g., subscription_downgrade, manual, inactive)';
COMMENT ON COLUMN leads.archived_at IS 'Timestamp when lead was archived';
COMMENT ON TABLE scheduled_tasks IS 'Background tasks to be processed by cron jobs';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scheduled_tasks
CREATE TRIGGER scheduled_tasks_update_updated_at
  BEFORE UPDATE ON scheduled_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_tasks_updated_at(); 