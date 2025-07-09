-- Add voice-specific follow-up interval columns to user_settings table
-- These will be separate from the messaging follow-up intervals

ALTER TABLE user_settings 
ADD COLUMN voice_follow_up_interval_new INTEGER DEFAULT 2,
ADD COLUMN voice_follow_up_interval_inactive INTEGER DEFAULT 60;

-- Add comments to explain the columns
COMMENT ON COLUMN user_settings.voice_follow_up_interval_new IS 'Days between first contact and first voice follow-up call for new leads';
COMMENT ON COLUMN user_settings.voice_follow_up_interval_inactive IS 'Days before attempting to re-engage inactive leads with voice calls'; 