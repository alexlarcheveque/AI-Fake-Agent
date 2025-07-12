-- Clean up call analysis columns
-- Remove unused columns and improve the structure

-- Remove the columns we decided not to use
ALTER TABLE calls DROP COLUMN IF EXISTS key_topics;
ALTER TABLE calls DROP COLUMN IF EXISTS objections_raised;

-- Remove next_steps since it overlaps too much with action_items
ALTER TABLE calls DROP COLUMN IF EXISTS next_steps;

-- Replace commitment_made boolean with commitment_details text
ALTER TABLE calls DROP COLUMN IF EXISTS commitment_made;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS commitment_details TEXT;

-- Update comments
COMMENT ON COLUMN calls.action_items IS 'Array of specific action items and next steps from the call';
COMMENT ON COLUMN calls.commitment_details IS 'Description of any commitments made during the call (meetings, deadlines, etc.)';

-- Verify the final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name IN ('action_items', 'customer_interest_level', 'commitment_details')
ORDER BY column_name; 