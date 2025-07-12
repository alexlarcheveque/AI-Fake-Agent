-- Fix duplicate calls with same twilio_call_sid
-- Keep the most recent call or the one with 'completed' status

-- First, let's see the duplicates
SELECT 
  id, 
  lead_id, 
  twilio_call_sid, 
  status, 
  duration, 
  created_at,
  started_at
FROM calls 
WHERE twilio_call_sid IN (
  SELECT twilio_call_sid 
  FROM calls 
  WHERE twilio_call_sid IS NOT NULL 
  GROUP BY twilio_call_sid 
  HAVING COUNT(*) > 1
)
ORDER BY twilio_call_sid, created_at;

-- Delete duplicate calls, keeping the best one for each twilio_call_sid
-- Priority: completed > in-progress > other statuses, then most recent
WITH ranked_calls AS (
  SELECT 
    id,
    twilio_call_sid,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY twilio_call_sid 
      ORDER BY 
        CASE 
          WHEN status = 'completed' THEN 1
          WHEN status = 'in-progress' THEN 2
          ELSE 3
        END,
        created_at DESC
    ) as rn
  FROM calls 
  WHERE twilio_call_sid IS NOT NULL
),
calls_to_delete AS (
  SELECT id 
  FROM ranked_calls 
  WHERE rn > 1
)
DELETE FROM calls 
WHERE id IN (SELECT id FROM calls_to_delete);

-- Add unique constraint to prevent future duplicates
ALTER TABLE calls 
ADD CONSTRAINT unique_twilio_call_sid 
UNIQUE (twilio_call_sid);

-- Verify the fix
SELECT 
  id, 
  lead_id, 
  twilio_call_sid, 
  status, 
  duration, 
  created_at
FROM calls 
WHERE lead_id = 55 
ORDER BY created_at DESC; 