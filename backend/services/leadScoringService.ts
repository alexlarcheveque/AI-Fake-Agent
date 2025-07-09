import supabase from "../config/supabase.ts";
import { LeadRow } from "../models/Lead.ts";
import { getMessagesByLeadIdDescending } from "./messageService.ts";
import logger from "../utils/logger.ts";
import { format } from "date-fns";

export interface LeadScoreComponents {
  interestScore: number;
  sentimentScore: number;
  overallScore: number;
}

export interface InterestIndicators {
  urgencyKeywords: string[];
  timelineKeywords: string[];
  decisionKeywords: string[];
  readinessKeywords: string[];
}

// Interest/urgency keyword patterns with weights
const INTEREST_PATTERNS = {
  high: [
    // Immediate urgency (90-100 points)
    "asap",
    "immediately",
    "urgent",
    "now",
    "today",
    "this week",
    "ready to buy",
    "ready to move",
    "need to find",
    "must find",
    "closing soon",
    "pre-approved",
    "cash buyer",
    "approved for",

    // Strong timeline (80-90 points)
    "within 30 days",
    "this month",
    "next month",
    "by the end of",
    "looking to close",
    "ready to make an offer",
    "want to see",
    "schedule a showing",
    "book a viewing",
    "set up appointment",

    // Active searching (70-80 points)
    "actively looking",
    "seriously considering",
    "definitely interested",
    "very interested",
    "love this property",
    "perfect for us",
    "fits our budget",
    "meets our needs",
    "exactly what we want",
  ],
  medium: [
    // Moderate interest (40-60 points)
    "within 60 days",
    "within 90 days",
    "next few months",
    "spring",
    "summer",
    "fall",
    "winter",
    "thinking about",
    "considering",
    "might be interested",
    "could work",
    "looks good",
    "nice property",
    "tell me more",
    "more information",
    "learn more",
    "details",
  ],
  low: [
    // Casual interest (10-30 points)
    "just browsing",
    "just looking",
    "not ready yet",
    "maybe next year",
    "in the future",
    "eventually",
    "someday",
    "just curious",
    "getting ideas",
    "exploring options",
    "no rush",
    "taking our time",
  ],
};

// Sentiment analysis patterns
const SENTIMENT_PATTERNS = {
  positive: [
    "love",
    "perfect",
    "amazing",
    "excellent",
    "great",
    "fantastic",
    "wonderful",
    "beautiful",
    "interested",
    "excited",
    "yes",
    "definitely",
    "sounds good",
    "looks good",
    "thank you",
    "appreciate",
    "helpful",
  ],
  negative: [
    "not interested",
    "not for us",
    "too expensive",
    "can't afford",
    "don't like",
    "not what we want",
    "wrong area",
    "too far",
    "no",
    "not suitable",
    "disappointing",
    "waste of time",
    "unhappy",
  ],
};

/**
 * Analyzes message content for interest level indicators
 */
export const analyzeInterestLevel = (messages: any[]): number => {
  if (!messages || messages.length === 0) return 0;

  let totalScore = 0;
  let messageCount = 0;
  let responseCount = 0;

  // Analyze each message from the lead
  const leadMessages = messages.filter((msg) => msg.sender === "lead");

  for (const message of leadMessages) {
    if (!message.text) continue;

    const text = message.text.toLowerCase();
    messageCount++;

    let messageScore = 0;

    // Check for high interest patterns
    for (const pattern of INTEREST_PATTERNS.high) {
      if (text.includes(pattern.toLowerCase())) {
        messageScore = Math.max(messageScore, 85 + Math.random() * 15); // 85-100
      }
    }

    // Check for medium interest patterns
    for (const pattern of INTEREST_PATTERNS.medium) {
      if (text.includes(pattern.toLowerCase())) {
        messageScore = Math.max(messageScore, 40 + Math.random() * 20); // 40-60
      }
    }

    // Check for low interest patterns
    for (const pattern of INTEREST_PATTERNS.low) {
      if (text.includes(pattern.toLowerCase())) {
        messageScore = Math.max(messageScore, 10 + Math.random() * 20); // 10-30
      }
    }

    // If lead is responding, give some base interest points
    if (messageScore === 0) {
      responseCount++;
      messageScore = 30; // Base score for responding
    }

    totalScore += messageScore;
  }

  // Calculate engagement bonus
  const engagementBonus = Math.min(responseCount * 5, 20); // Up to 20 bonus points

  if (messageCount === 0) return 0;

  const averageScore = totalScore / messageCount;
  return Math.min(averageScore + engagementBonus, 100);
};

/**
 * Analyzes message content for sentiment
 */
export const analyzeSentiment = (messages: any[]): number => {
  if (!messages || messages.length === 0) return 50; // Neutral baseline

  let positiveCount = 0;
  let negativeCount = 0;
  let totalMessages = 0;

  // Analyze lead messages for sentiment
  const leadMessages = messages.filter((msg) => msg.sender === "lead");

  for (const message of leadMessages) {
    if (!message.text) continue;

    const text = message.text.toLowerCase();
    totalMessages++;

    // Check for positive sentiment
    for (const pattern of SENTIMENT_PATTERNS.positive) {
      if (text.includes(pattern.toLowerCase())) {
        positiveCount++;
        break;
      }
    }

    // Check for negative sentiment
    for (const pattern of SENTIMENT_PATTERNS.negative) {
      if (text.includes(pattern.toLowerCase())) {
        negativeCount++;
        break;
      }
    }
  }

  if (totalMessages === 0) return 50;

  // Calculate sentiment score (0-100)
  const positiveRatio = positiveCount / totalMessages;
  const negativeRatio = negativeCount / totalMessages;

  // Base score of 50 (neutral), adjust based on positive/negative ratio
  let sentimentScore = 50;
  sentimentScore += positiveRatio * 40; // Up to +40 for positive sentiment
  sentimentScore -= negativeRatio * 35; // Up to -35 for negative sentiment

  return Math.max(0, Math.min(100, sentimentScore));
};

/**
 * Gets sentiment score from call data
 */
export const getCallSentimentScore = async (
  leadId: number
): Promise<number> => {
  try {
    const { data: calls, error } = await supabase
      .from("calls")
      .select("sentiment_score")
      .eq("lead_id", leadId)
      .eq("status", "completed") // Only consider completed calls
      .not("sentiment_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(10); // Get last 10 completed calls with sentiment (increased for better average)

    if (error || !calls || calls.length === 0) {
      return 50; // Neutral baseline
    }

    // Sum all sentiment scores and convert from 0-1 scale to 0-100 scale
    const totalSentiment = calls.reduce(
      (sum, call) => sum + (call.sentiment_score || 0),
      0
    );
    const avgSentiment = totalSentiment / calls.length;
    return Math.min(100, Math.max(0, avgSentiment * 100));
  } catch (error) {
    logger.error(
      `Error getting call sentiment for lead ${leadId}: ${error.message}`
    );
    return 50;
  }
};

/**
 * Calculates overall lead score based on interest and sentiment
 */
export const calculateOverallScore = (
  interestScore: number,
  sentimentScore: number
): number => {
  // Primary: Interest (70% weight), Secondary: Sentiment (30% weight)
  const overall = interestScore * 0.7 + sentimentScore * 0.3;
  return Math.round(Math.min(100, Math.max(0, overall)));
};

/**
 * Updates lead scores in the database
 */
export const updateLeadScores = async (
  leadId: number,
  scores: LeadScoreComponents
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("leads")
      .update({
        interest_score: scores.interestScore,
        sentiment_score: scores.sentimentScore,
        overall_score: scores.overallScore,
        last_score_update: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) {
      throw new Error(`Failed to update lead scores: ${error.message}`);
    }

    logger.info(
      `Updated scores for lead ${leadId}: Interest=${scores.interestScore}, Sentiment=${scores.sentimentScore}, Overall=${scores.overallScore}`
    );
  } catch (error) {
    logger.error(
      `Error updating lead scores for lead ${leadId}: ${error.message}`
    );
    throw error;
  }
};

/**
 * Calculates and updates all scores for a lead
 */
export const calculateLeadScores = async (
  leadId: number
): Promise<LeadScoreComponents> => {
  try {
    logger.info(`Calculating scores for lead ${leadId}`);

    // Get all messages for this lead
    const messages = await getMessagesByLeadIdDescending(leadId);

    // Calculate interest score from messages
    const interestScore = analyzeInterestLevel(messages);

    // Calculate sentiment from messages
    const messageSentimentScore = analyzeSentiment(messages);

    // Get sentiment from calls
    const callSentimentScore = await getCallSentimentScore(leadId);

    // Combine message and call sentiment (prioritize calls if available)
    const sentimentScore =
      callSentimentScore !== 50
        ? Math.round(callSentimentScore * 0.6 + messageSentimentScore * 0.4)
        : messageSentimentScore;

    // Calculate overall score
    const overallScore = calculateOverallScore(interestScore, sentimentScore);

    const scores: LeadScoreComponents = {
      interestScore: Math.round(interestScore),
      sentimentScore: Math.round(sentimentScore),
      overallScore,
    };

    // Update scores in database
    await updateLeadScores(leadId, scores);

    return scores;
  } catch (error) {
    logger.error(
      `Error calculating lead scores for lead ${leadId}: ${error.message}`
    );
    throw error;
  }
};

/**
 * Batch update scores for multiple leads
 */
export const batchUpdateLeadScores = async (
  leadIds: number[]
): Promise<void> => {
  logger.info(`Batch updating scores for ${leadIds.length} leads`);

  for (const leadId of leadIds) {
    try {
      await calculateLeadScores(leadId);
    } catch (error) {
      logger.error(
        `Failed to update scores for lead ${leadId}: ${error.message}`
      );
      // Continue with other leads
    }
  }

  logger.info(`Completed batch score update for ${leadIds.length} leads`);
};

/**
 * Get score explanation for a lead
 */
export const getScoreExplanation = (scores: LeadScoreComponents): string => {
  let explanation = `Overall Score: ${scores.overallScore}/100\n`;
  explanation += `• Interest Level: ${scores.interestScore}/100 (70% weight)\n`;
  explanation += `• Sentiment: ${scores.sentimentScore}/100 (30% weight)\n\n`;

  if (scores.interestScore >= 80) {
    explanation += "🔥 High Interest - Lead shows strong buying intent";
  } else if (scores.interestScore >= 50) {
    explanation += "⚡ Moderate Interest - Lead is engaged but not urgent";
  } else {
    explanation += "💭 Low Interest - Lead needs nurturing";
  }

  return explanation;
};
