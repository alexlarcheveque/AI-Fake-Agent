-- Voice Calling Feature Migration
-- Run this script in your Supabase SQL editor to add voice calling functionality

-- Add voice calling fields to leads table
ALTER TABLE leads ADD COLUMN last_call_attempt TIMESTAMP;
ALTER TABLE leads ADD COLUMN voice_calling_enabled BOOLEAN DEFAULT true;

-- Add voice calling fields to user_settings table
ALTER TABLE user_settings ADD COLUMN voice_calling_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN voice_calling_hours_start INTEGER DEFAULT 11; -- 11 AM
ALTER TABLE user_settings ADD COLUMN voice_calling_hours_end INTEGER DEFAULT 19; -- 7 PM
ALTER TABLE user_settings ADD COLUMN voice_calling_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
ALTER TABLE user_settings ADD COLUMN elevenlabs_voice_id TEXT;
ALTER TABLE user_settings ADD COLUMN call_retry_attempts INTEGER DEFAULT 2;
ALTER TABLE user_settings ADD COLUMN quarterly_call_limit INTEGER DEFAULT 1;

-- Create calls table
CREATE TABLE calls (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
    twilio_call_sid TEXT,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    status TEXT CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled')),
    duration INTEGER, -- duration in seconds
    from_number TEXT,
    to_number TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    ai_summary TEXT,
    sentiment_score DECIMAL(3,2), -- score between -1.00 and 1.00
    call_type TEXT CHECK (call_type IN ('new_lead', 'follow_up', 'reactivation')),
    attempt_number INTEGER DEFAULT 1,
    is_voicemail BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create call_recordings table
CREATE TABLE call_recordings (
    id BIGSERIAL PRIMARY KEY,
    call_id BIGINT REFERENCES calls(id) ON DELETE CASCADE,
    recording_url TEXT,
    recording_sid TEXT, -- Twilio recording SID
    duration INTEGER, -- duration in seconds
    file_size BIGINT, -- file size in bytes
    storage_path TEXT, -- path in Supabase storage
    transcription TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_call_recordings_call_id ON call_recordings(call_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_recordings_updated_at BEFORE UPDATE ON call_recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) 
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- Users can only access calls for their own leads
CREATE POLICY "Users can access their own calls" ON calls
    FOR ALL USING (
        lead_id IN (
            SELECT id FROM leads WHERE user_uuid = auth.uid()
        )
    );

-- Users can only access recordings for their own calls
CREATE POLICY "Users can access their own call recordings" ON call_recordings
    FOR ALL USING (
        call_id IN (
            SELECT c.id FROM calls c
            JOIN leads l ON c.lead_id = l.id
            WHERE l.user_uuid = auth.uid()
        )
    );

-- Grant permissions to authenticated users
GRANT ALL ON calls TO authenticated;
GRANT ALL ON call_recordings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE calls_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE call_recordings_id_seq TO authenticated; 