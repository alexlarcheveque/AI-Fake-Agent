-- Migration for Conversational AI features
-- Run this in your Supabase SQL Editor

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence DECIMAL(3,2), -- STT confidence score (0.00 to 1.00)
  intent TEXT, -- AI-determined intent
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_call_id ON conversation_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role ON conversation_messages(role);

-- Add conversation-related columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS conversation_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS lead_interest_level TEXT CHECK (lead_interest_level IN ('high', 'medium', 'low', 'unknown'));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS next_action TEXT CHECK (next_action IN ('follow_up', 'schedule_appointment', 'send_listing', 'no_action'));

-- Add conversational settings to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS conversational_ai_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'professional' CHECK (conversation_style IN ('professional', 'casual', 'friendly'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS max_conversation_duration INTEGER DEFAULT 300; -- 5 minutes in seconds

-- Create a view for conversation analytics
CREATE OR REPLACE VIEW conversation_analytics AS
SELECT 
  c.id as call_id,
  c.lead_id,
  c.status,
  c.duration,
  c.conversation_enabled,
  c.lead_interest_level,
  c.next_action,
  COUNT(cm.id) as message_count,
  COUNT(CASE WHEN cm.role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN cm.role = 'assistant' THEN 1 END) as assistant_messages,
  AVG(cm.confidence) as avg_confidence,
  MIN(cm.timestamp) as conversation_start,
  MAX(cm.timestamp) as conversation_end,
  EXTRACT(EPOCH FROM (MAX(cm.timestamp) - MIN(cm.timestamp))) as conversation_duration_seconds
FROM calls c
LEFT JOIN conversation_messages cm ON c.id = cm.call_id
WHERE c.conversation_enabled = true
GROUP BY c.id, c.lead_id, c.status, c.duration, c.conversation_enabled, c.lead_interest_level, c.next_action;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON conversation_messages TO authenticated;
-- GRANT SELECT ON conversation_analytics TO authenticated;

-- Add some sample conversation intents for reference
COMMENT ON COLUMN conversation_messages.intent IS 'AI-determined conversation intent: greeting, qualifying, objection_handling, value_proposition, closing, scheduling, etc.';
COMMENT ON COLUMN calls.lead_interest_level IS 'AI-assessed interest level based on conversation: high, medium, low, unknown';
COMMENT ON COLUMN calls.next_action IS 'AI-suggested next action: follow_up, schedule_appointment, send_listing, no_action'; 