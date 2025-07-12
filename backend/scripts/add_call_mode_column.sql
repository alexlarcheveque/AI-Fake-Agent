-- Add call_mode column to distinguish between manual and AI calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_mode VARCHAR(10) CHECK (call_mode IN ('manual', 'ai'));

-- Add comment to document the new column
COMMENT ON COLUMN calls.call_mode IS 'Whether the call was made manually by user or automatically by AI';

-- Update existing calls to have a default mode
-- We can infer based on whether they have realtime transcripts or not
UPDATE calls 
SET call_mode = 'ai' 
WHERE call_mode IS NULL;

-- Verify the new column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name = 'call_mode'; 