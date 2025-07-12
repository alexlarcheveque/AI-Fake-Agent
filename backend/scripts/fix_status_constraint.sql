-- Fix calls status constraint to include 'initiated'
ALTER TABLE calls DROP CONSTRAINT calls_status_check;

ALTER TABLE calls ADD CONSTRAINT calls_status_check 
CHECK (status IN ('queued', 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled')); 