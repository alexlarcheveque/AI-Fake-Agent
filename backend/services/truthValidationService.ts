import OpenAI from "openai";
import logger from "../utils/logger.ts";

const apiKey = process.env.OPENAI_API_KEY || "your_api_key_here";
const openai = new OpenAI({ apiKey });

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  confidence: number;
  suggestedFixes?: string[];
}

/**
 * Validates that AI-generated content contains no fabricated claims
 * Uses a separate LLM call to fact-check the content with JSON output
 */
export const validateTruthfulness = async (
  content: string,
  context: {
    leadType?: string;
    agentName?: string;
    companyName?: string;
    agentState?: string;
  }
): Promise<ValidationResult> => {
  try {
    const validationPrompt = `You are a truth validator for real estate AI communications. Your job is to identify ANY potentially fabricated or unverifiable claims in the following message.

CONTEXT:
- Agent: ${context.agentName || "Unknown"} from ${
      context.companyName || "Unknown"
    }
- State: ${context.agentState || "Unknown"}
- Lead Type: ${context.leadType || "Unknown"}

CRITICAL: Flag ANY of these as FABRICATED:
1. Specific market statistics without data source
2. Claims about market performance ("homes selling well", "market is hot", etc.)
3. Specific dollar amounts or savings claims
4. Area-specific performance claims
5. Urgency tactics based on market conditions
6. Claims about having "news" or "opportunities" without specifics
7. Comparative market statements without data

ACCEPTABLE statements:
- General service offerings ("I can help you understand the market")
- Process education ("Here's how buying works")
- Availability and contact information
- General market education without specific claims
- Personal expertise without market predictions

ANALYZE THIS MESSAGE:
"${content}"

Be STRICT. If there's any doubt about verifiability, mark as INVALID.

Respond ONLY in this exact JSON format:
{
  "verdict": "VALID" or "INVALID",
  "confidence": number from 1-10,
  "issues": ["issue1", "issue2", ...],
  "suggestedFixes": ["fix1", "fix2", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: validationPrompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.1, // Low temperature for consistent validation
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content || "{}";

    try {
      const parsedResponse = JSON.parse(response);

      const isValid =
        parsedResponse.verdict?.toLowerCase() === "valid" ||
        parsedResponse.isValid === true;
      const confidence = parseInt(
        parsedResponse.confidence?.toString() || "5",
        10
      );
      const issues = Array.isArray(parsedResponse.issues)
        ? parsedResponse.issues
        : [];
      const suggestedFixes = Array.isArray(parsedResponse.suggestedFixes)
        ? parsedResponse.suggestedFixes
        : [];

      logger.info(
        `Truth validation: ${
          isValid ? "PASSED" : "FAILED"
        } (confidence: ${confidence}/10)`
      );

      if (!isValid) {
        logger.warn(
          `Truth validation failed for content: "${content.substring(
            0,
            100
          )}..."`
        );
        logger.warn(`Issues found: ${issues.join(", ")}`);
      }

      return {
        isValid,
        issues,
        confidence,
        suggestedFixes,
      };
    } catch (parseError) {
      logger.error(
        "Error parsing JSON response from truth validation:",
        parseError
      );
      logger.warn("Raw response:", response);

      // Fallback to pattern matching if JSON parsing fails
      return fallbackValidation(content);
    }
  } catch (error) {
    logger.error("Error in truth validation:", error);

    // If validation service fails, default to simple pattern matching
    return fallbackValidation(content);
  }
};

/**
 * Fallback validation using pattern matching when JSON parsing fails
 */
const fallbackValidation = (content: string): ValidationResult => {
  const fabricationPatterns = [
    {
      pattern: /market.*well|performing.*well/i,
      issue: "Market performance claims without data",
    },
    {
      pattern: /\$[\d,]+.*below.*market/i,
      issue: "Specific dollar amount savings claims",
    },
    {
      pattern: /conditions.*favorable/i,
      issue: "Market condition claims without data",
    },
    {
      pattern: /homes.*area.*moving/i,
      issue: "Area-specific market activity claims",
    },
    {
      pattern: /values.*area.*performing/i,
      issue: "Area-specific value performance claims",
    },
    {
      pattern: /exciting.*news.*market/i,
      issue: "False urgency about market news",
    },
    {
      pattern: /great.*opportunities.*area/i,
      issue: "Vague opportunity claims without specifics",
    },
    {
      pattern: /\$[\d,]+ below market/i,
      issue: "Specific savings claims without verification",
    },
  ];

  const foundIssues = fabricationPatterns
    .filter(({ pattern }) => pattern.test(content))
    .map(({ issue }) => issue);

  return {
    isValid: foundIssues.length === 0,
    issues: foundIssues,
    confidence: 7,
    suggestedFixes:
      foundIssues.length > 0
        ? [
            "Remove specific market claims and replace with general service offerings",
          ]
        : [],
  };
};

/**
 * Regenerate content with truth validation feedback
 */
export const regenerateWithTruthValidation = async (
  originalContent: string,
  validationResult: ValidationResult,
  systemPrompt: string,
  messageHistory: any[]
): Promise<string> => {
  try {
    const regenerationPrompt = `${systemPrompt}

CRITICAL: The previous response contained fabricated claims that must be fixed:

ISSUES TO FIX:
${validationResult.issues.map((issue) => `- ${issue}`).join("\n")}

SUGGESTED FIXES:
${
  validationResult.suggestedFixes?.map((fix) => `- ${fix}`).join("\n") ||
  "Replace with truthful, verifiable statements only"
}

REWRITE RULES:
1. Remove ALL market statistics and performance claims
2. Replace with service-based value propositions
3. Focus on availability, expertise, and process help
4. No dollar amounts or savings claims
5. No area-specific market performance statements

Rewrite the response to be completely truthful and verifiable.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: regenerationPrompt,
        },
        ...messageHistory,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || originalContent;
  } catch (error) {
    logger.error("Error regenerating content:", error);
    return originalContent;
  }
};
