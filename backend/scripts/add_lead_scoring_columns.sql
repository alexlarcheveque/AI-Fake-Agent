-- Add lead scoring columns to the leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS interest_score DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(5,2) DEFAULT 0.0, 
ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_score_update TIMESTAMP DEFAULT NOW();

-- Add comments for clarity
COMMENT ON COLUMN leads.interest_score IS 'Lead interest/urgency score (0-100) - primary scoring factor';
COMMENT ON COLUMN leads.sentiment_score IS 'Lead sentiment score (0-100) - secondary scoring factor';
COMMENT ON COLUMN leads.overall_score IS 'Overall lead score (0-100) - computed from interest and sentiment';
COMMENT ON COLUMN leads.last_score_update IS 'When the lead score was last calculated';

-- Create an index for performance when filtering by score
CREATE INDEX IF NOT EXISTS idx_leads_overall_score ON leads(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_interest_score ON leads(interest_score DESC); 