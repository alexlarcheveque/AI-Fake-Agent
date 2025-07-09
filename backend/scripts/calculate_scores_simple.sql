-- Simple lead scoring based on message content keywords
-- This gives a basic score to existing leads until the full scoring system kicks in

-- Update interest scores based on message keywords
UPDATE leads 
SET 
  interest_score = CASE 
    -- High interest keywords (80-100 score)
    WHEN EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.lead_id = leads.id 
      AND m.sender = 'lead' 
      AND LOWER(m.text) ~ '.*(asap|immediately|urgent|now|today|ready to buy|ready to move|need to find|must find|pre-approved|cash buyer|within 30 days|this month|next month|looking to close|ready to make an offer|want to see|schedule a showing|book a viewing|set up appointment|actively looking|seriously considering|definitely interested|very interested|love this|perfect for us|fits our budget|meets our needs|exactly what we want).*'
    ) THEN 85
    
    -- Medium interest keywords (40-70 score)  
    WHEN EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.lead_id = leads.id 
      AND m.sender = 'lead'
      AND LOWER(m.text) ~ '.*(within 60 days|within 90 days|next few months|spring|summer|fall|winter|thinking about|considering|might be interested|could work|looks good|nice property|tell me more|more information|learn more|details|interested).*'
    ) THEN 55
    
    -- Low interest keywords (10-30 score)
    WHEN EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.lead_id = leads.id 
      AND m.sender = 'lead'
      AND LOWER(m.text) ~ '.*(just browsing|just looking|not ready yet|maybe next year|in the future|eventually|someday|just curious|getting ideas|exploring options|no rush|taking our time).*'
    ) THEN 20
    
    -- Default for leads who have responded (base engagement)
    WHEN EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.lead_id = leads.id 
      AND m.sender = 'lead'
    ) THEN 35
    
    -- No response yet
    ELSE 10
  END,
  
  sentiment_score = CASE
    -- Positive sentiment (60-80 score)
    WHEN EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.lead_id = leads.id 
      AND m.sender = 'lead'
      AND LOWER(m.text) ~ '.*(love|perfect|amazing|excellent|great|fantastic|wonderful|beautiful|interested|excited|yes|definitely|sounds good|looks good|thank you|appreciate|helpful).*'
    ) THEN 70
    
    -- Negative sentiment (20-40 score)
    WHEN EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.lead_id = leads.id 
      AND m.sender = 'lead'
      AND LOWER(m.text) ~ '.*(not interested|not for us|too expensive|cant afford|dont like|not what we want|wrong area|too far|no|not suitable|disappointing|waste of time|unhappy).*'
    ) THEN 30
    
    -- Neutral sentiment (default)
    ELSE 50
  END,
  
  last_score_update = NOW()
  
WHERE is_archived = false 
AND status != 'converted'
AND (overall_score IS NULL OR overall_score = 0);

-- Calculate overall scores (70% interest + 30% sentiment)
UPDATE leads 
SET overall_score = ROUND((interest_score * 0.7 + sentiment_score * 0.3), 0)
WHERE is_archived = false 
AND status != 'converted'
AND interest_score IS NOT NULL 
AND sentiment_score IS NOT NULL;

-- Show results
SELECT 
  id,
  name,
  interest_score,
  sentiment_score,
  overall_score,
  (SELECT COUNT(*) FROM messages WHERE lead_id = leads.id AND sender = 'lead') as response_count
FROM leads 
WHERE is_archived = false 
AND status != 'converted'
AND overall_score > 0
ORDER BY overall_score DESC; 