-- Fix manual call issues
-- 1. Remove duplicate lead_interest_level column (keep customer_interest_level)
-- 2. Fix missing ended_at timestamp for call 188

-- First, let's see what we have for call 188
SELECT 
  id, 
  status, 
  started_at, 
  ended_at, 
  duration, 
  created_at, 
  updated_at,
  customer_interest_level,
  lead_interest_level
FROM calls 
WHERE id = 188;

-- Check for duplicate interest level columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name LIKE '%interest%'
ORDER BY column_name;

-- Fix call 188 - set ended_at based on started_at + duration
UPDATE calls 
SET 
  ended_at = started_at + interval '8 seconds',  -- Based on 8-second recording duration
  status = 'completed',
  updated_at = NOW()
WHERE id = 188 
AND ended_at IS NULL;

-- Remove the duplicate lead_interest_level column
ALTER TABLE calls DROP COLUMN IF EXISTS lead_interest_level;

-- Verify the fixes
SELECT 
  id, 
  status, 
  started_at, 
  ended_at, 
  duration, 
  created_at, 
  updated_at,
  customer_interest_level
FROM calls 
WHERE id = 188;

-- Check remaining interest level columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name LIKE '%interest%'
ORDER BY column_name; 