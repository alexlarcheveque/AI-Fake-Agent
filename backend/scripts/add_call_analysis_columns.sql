-- Add structured call analysis columns and remove legacy unused columns
-- This migrates from old ad-hoc fields to proper structured analysis

-- First, check what views depend on the columns we want to drop
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition ILIKE '%conversation_enabled%' 
   OR definition ILIKE '%conversation_summary%'
   OR definition ILIKE '%next_action%';

-- Drop dependent views first (they can be recreated if needed)
DROP VIEW IF EXISTS conversation_analytics CASCADE;

-- Now safely remove legacy unused columns
ALTER TABLE calls DROP COLUMN IF EXISTS conversation_enabled CASCADE;
ALTER TABLE calls DROP COLUMN IF EXISTS conversation_summary CASCADE;
ALTER TABLE calls DROP COLUMN IF EXISTS next_action CASCADE;

-- Add new structured call analysis columns
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS action_items TEXT[], 
ADD COLUMN IF NOT EXISTS next_steps TEXT[],
ADD COLUMN IF NOT EXISTS customer_interest_level VARCHAR(10) CHECK (customer_interest_level IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS commitment_made BOOLEAN DEFAULT FALSE;

-- Add comments to document the new columns
COMMENT ON COLUMN calls.action_items IS 'Array of specific action items identified during the call';
COMMENT ON COLUMN calls.next_steps IS 'Array of next steps for future calls or follow-ups';
COMMENT ON COLUMN calls.customer_interest_level IS 'Overall customer interest level: high, medium, or low';
COMMENT ON COLUMN calls.commitment_made IS 'Whether the customer made any commitment during the call';

-- Show the updated table structure
\d calls;

-- Verify the new columns exist and old ones are removed
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name IN ('action_items', 'next_steps', 'customer_interest_level', 'commitment_made')
ORDER BY column_name;

-- Verify legacy columns are removed
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name IN ('conversation_enabled', 'conversation_summary', 'next_action');

-- Show any remaining views that might need to be updated
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname LIKE '%call%' OR viewname LIKE '%conversation%';

-- Add action items and commitment tracking columns to calls table
-- This migration adds fields for storing detailed call analysis results

-- Add action_items as a JSON array to store urgent action items
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb;

-- Add customer interest level to track lead engagement
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS customer_interest_level TEXT DEFAULT 'medium' 
CHECK (customer_interest_level IN ('low', 'medium', 'high'));

-- Add commitment details to track specific commitments made during calls
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS commitment_details TEXT DEFAULT '';

-- Create an index on action_items for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_action_items ON calls USING GIN (action_items);

-- Create an index on customer_interest_level for filtering
CREATE INDEX IF NOT EXISTS idx_calls_interest_level ON calls (customer_interest_level);

-- Add a comment to document these fields
COMMENT ON COLUMN calls.action_items IS 'Array of urgent action items extracted from call analysis';
COMMENT ON COLUMN calls.customer_interest_level IS 'Customer engagement level: low, medium, or high';
COMMENT ON COLUMN calls.commitment_details IS 'Specific commitments made by the customer during the call';

-- Update existing calls to have default values
UPDATE calls 
SET 
  action_items = '[]'::jsonb,
  customer_interest_level = 'medium',
  commitment_details = ''
WHERE 
  action_items IS NULL 
  OR customer_interest_level IS NULL 
  OR commitment_details IS NULL; 