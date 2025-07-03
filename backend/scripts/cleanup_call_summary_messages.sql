-- Cleanup redundant call summary messages
-- These are no longer needed since call summaries are shown in the call records themselves

-- First, let's see how many call summary messages we have
SELECT 
  COUNT(*) as total_call_summaries,
  sender,
  lead_id
FROM messages 
WHERE text LIKE '%Call Summary%' 
  AND sender = 'system'
  AND is_ai_generated = true
GROUP BY sender, lead_id
ORDER BY total_call_summaries DESC;

-- Show some examples of what we're about to delete
SELECT 
  id,
  lead_id,
  sender,
  LEFT(text, 100) as preview,
  created_at
FROM messages 
WHERE text LIKE '%Call Summary%' 
  AND sender = 'system'
  AND is_ai_generated = true
ORDER BY created_at DESC
LIMIT 10;

-- Delete all call summary messages
-- These are redundant since the summary is already in the calls table
DELETE FROM messages 
WHERE text LIKE '%Call Summary%' 
  AND sender = 'system'
  AND is_ai_generated = true;

-- Verify cleanup
SELECT COUNT(*) as remaining_call_summaries
FROM messages 
WHERE text LIKE '%Call Summary%' 
  AND sender = 'system'; 