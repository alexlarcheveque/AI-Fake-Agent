-- Fix duplicate call_recordings records
-- Merge realtime transcript records with Twilio recording records

-- First, let's see the duplicates
SELECT 
  call_id,
  COUNT(*) as record_count,
  STRING_AGG(id::text, ', ') as record_ids,
  STRING_AGG(
    CASE 
      WHEN recording_url IS NOT NULL THEN 'recording'
      WHEN transcription IS NOT NULL THEN 'transcript'
      ELSE 'empty'
    END, 
    ', '
  ) as types
FROM call_recordings 
GROUP BY call_id 
HAVING COUNT(*) > 1
ORDER BY call_id;

-- Merge duplicate records for each call_id
-- Keep the record with recording_url, update it with transcription from other record
WITH duplicate_calls AS (
  SELECT call_id
  FROM call_recordings 
  GROUP BY call_id 
  HAVING COUNT(*) > 1
),
merged_data AS (
  SELECT 
    cr.call_id,
    -- Prefer the record with recording_url, fallback to first record
    FIRST_VALUE(cr.id) OVER (
      PARTITION BY cr.call_id 
      ORDER BY 
        CASE WHEN cr.recording_url IS NOT NULL THEN 1 ELSE 2 END,
        cr.created_at
    ) as keep_id,
    -- Get the best values from all records
    COALESCE(
      MAX(CASE WHEN cr.recording_url IS NOT NULL THEN cr.recording_url END),
      MAX(cr.recording_url)
    ) as best_recording_url,
    COALESCE(
      MAX(CASE WHEN cr.transcription IS NOT NULL THEN cr.transcription END),
      MAX(cr.transcription)
    ) as best_transcription,
    COALESCE(
      MAX(CASE WHEN cr.duration IS NOT NULL THEN cr.duration END),
      MAX(cr.duration)
    ) as best_duration
  FROM call_recordings cr
  WHERE cr.call_id IN (SELECT call_id FROM duplicate_calls)
  GROUP BY cr.call_id
)
-- Update the record we're keeping with the best data
UPDATE call_recordings 
SET 
  recording_url = merged_data.best_recording_url,
  transcription = merged_data.best_transcription,
  duration = merged_data.best_duration,
  updated_at = NOW()
FROM merged_data
WHERE call_recordings.id = merged_data.keep_id;

-- Delete the duplicate records (keep only the updated one)
WITH duplicate_calls AS (
  SELECT call_id
  FROM call_recordings 
  GROUP BY call_id 
  HAVING COUNT(*) > 1
),
records_to_delete AS (
  SELECT cr.id
  FROM call_recordings cr
  WHERE cr.call_id IN (SELECT call_id FROM duplicate_calls)
    AND cr.id NOT IN (
      SELECT FIRST_VALUE(cr2.id) OVER (
        PARTITION BY cr2.call_id 
        ORDER BY 
          CASE WHEN cr2.recording_url IS NOT NULL THEN 1 ELSE 2 END,
          cr2.created_at
      )
      FROM call_recordings cr2
      WHERE cr2.call_id = cr.call_id
    )
)
DELETE FROM call_recordings 
WHERE id IN (SELECT id FROM records_to_delete);

-- Add unique constraint to prevent future duplicates
ALTER TABLE call_recordings 
ADD CONSTRAINT unique_call_id 
UNIQUE (call_id);

-- Verify the fix
SELECT 
  call_id,
  COUNT(*) as record_count,
  recording_url IS NOT NULL as has_recording_url,
  transcription IS NOT NULL as has_transcription,
  duration
FROM call_recordings 
WHERE call_id IN (179, 178, 177)  -- Check recent calls
GROUP BY call_id, recording_url, transcription, duration
ORDER BY call_id DESC; 