-- Cleanup script for calls stuck in "in-progress" status
-- This fixes calls that started but never got proper completion status

-- First, let's see what we have
SELECT 
  id, 
  lead_id, 
  status, 
  started_at, 
  ended_at,
  duration,
  created_at,
  twilio_call_sid
FROM calls 
WHERE lead_id = 55 
ORDER BY created_at DESC;

-- Update calls that are stuck in "in-progress" for more than 30 minutes
-- These are likely calls that started but never got completion callbacks
UPDATE calls 
SET 
  status = 'failed',
  ended_at = COALESCE(ended_at, started_at + interval '1 minute', created_at + interval '1 minute'),
  updated_at = NOW()
WHERE 
  status = 'in-progress' 
  AND (
    started_at < NOW() - interval '30 minutes' 
    OR (started_at IS NULL AND created_at < NOW() - interval '30 minutes')
  );

-- Also update any "initiated" calls that are older than 10 minutes
UPDATE calls 
SET 
  status = 'failed',
  ended_at = COALESCE(started_at, created_at) + interval '1 minute',
  updated_at = NOW()
WHERE 
  status = 'initiated'
  AND created_at < NOW() - interval '10 minutes';

-- Check the results
SELECT 
  id, 
  lead_id, 
  status, 
  started_at, 
  ended_at,
  duration,
  created_at,
  updated_at
FROM calls 
WHERE lead_id = 55 
ORDER BY created_at DESC; 