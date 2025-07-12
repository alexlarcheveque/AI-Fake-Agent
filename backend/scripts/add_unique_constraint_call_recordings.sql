-- Add unique constraint to prevent duplicate call recording records
-- This ensures each call can only have one recording record

-- First, clean up any existing duplicates (should already be done)
WITH duplicates AS (
  SELECT call_id, MIN(id) as keep_id
  FROM call_recordings
  GROUP BY call_id
  HAVING COUNT(*) > 1
)
DELETE FROM call_recordings 
WHERE call_id IN (SELECT call_id FROM duplicates)
  AND id NOT IN (SELECT keep_id FROM duplicates);

-- Add the unique constraint
ALTER TABLE call_recordings 
ADD CONSTRAINT call_recordings_call_id_unique 
UNIQUE (call_id);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT call_recordings_call_id_unique ON call_recordings 
IS 'Ensures each call can only have one recording record'; 