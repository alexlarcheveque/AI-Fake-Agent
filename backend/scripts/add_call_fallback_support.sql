-- Add call fallback support to messages table
-- This enables tracking of messages that are sent as fallbacks after failed calls

-- Add call_fallback_type column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS call_fallback_type VARCHAR(20) 
CHECK (call_fallback_type IN ('voicemail_followup', 'missed_call', NULL));

-- Add comment to document the new column
COMMENT ON COLUMN messages.call_fallback_type IS 'Type of call fallback: voicemail_followup when voicemail was left, missed_call when no voicemail left';

-- Create an index for performance when filtering by fallback type
CREATE INDEX IF NOT EXISTS idx_messages_call_fallback_type ON messages (call_fallback_type);

-- Add scheduled_at to calls table for scheduling new lead calls
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP DEFAULT NULL;

-- Add comment to document the scheduled_at column
COMMENT ON COLUMN calls.scheduled_at IS 'When the call is scheduled to be made (for call scheduling system)';

-- Create an index for performance when finding scheduled calls
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_at ON calls (scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Verify the new columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name = 'call_fallback_type';

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name = 'scheduled_at'; 