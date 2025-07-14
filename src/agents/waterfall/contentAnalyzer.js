/**
 * Content Analyzer Agent for Waterfall Pipeline
 *
 * Purpose: Extract exactly 4 distinct topics from source material with context and insights
 * Model: anthropic/claude-sonnet-4, Temperature: 0.7
 *
 * Phase 2 Implementation: Complete logic with embedded system prompt as specified
 * in the technical design document.
 */

/**
 * Simple message sanitization function
 * @param {string} message - Message to sanitize
 * @returns {string} - Sanitized message
 */
function sanitizeMessage(message) {
  if (typeof message !== "string") return "";
  return message.trim().replace(/[\r\n]+/g, "\n");
}

/**
 * Content Analyzer agent configuration generator
 * @param {string} message - Source material text to analyze
 * @param {string} context - Analysis context and focus instructions
 * @param {Array} messageHistory - Previous conversation history (unused for this agent)
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function contentAnalyzer(message, context, messageHistory = []) {
  // Sanitize input message
  const sanitizedMessage = sanitizeMessage(message);

  if (!sanitizedMessage) {
    throw new Error("Content Analyzer requires source material text");
  }

  // Complete system prompt as specified in technical design
  const systemPrompt = `You are a CONTENT ANALYZER specializing in extracting key topics from long-form content for social media repurposing.

Your task:
1. Analyze the provided source material thoroughly
2. Identify exactly 4 distinct, compelling topics
3. For each topic, provide:
   - Topic title and category (story-driven, framework-based, data-heavy, insight-driven)
   - Key insights and main points
   - Relevant quotes from source material
   - Recommended angle for LinkedIn post
   - Context and supporting details

Focus on topics that:
- Have clear value for professional audiences
- Can stand alone as individual posts
- Offer actionable insights or thought-provoking ideas
- Maintain diversity across the 4 selections

Return your response as a JSON object with this structure:
{
  "topics": [
    {
      "id": 1,
      "title": "Topic Title",
      "category": "framework-based|story-driven|data-heavy|insight-driven",
      "keyInsights": ["insight1", "insight2", "insight3"],
      "relevantQuotes": ["quote1", "quote2"],
      "recommendedAngle": "LinkedIn post angle recommendation",
      "context": "Supporting context and details",
      "sourceReferences": "Specific parts of source material"
    }
  ],
  "extractionSummary": "Overall analysis of source material themes"
}

${context ? `Focus Areas: ${context}` : ""}`;

  // User prompt for content analysis
  const userPrompt = `Please analyze this source material and extract exactly 4 distinct topics following the specified structure:

${sanitizedMessage}

Return the analysis as a properly formatted JSON object with all required fields.`;

  // Return agent configuration
  return {
    callID: `content-analyzer-${Date.now()}`,
    model: {
      provider: "openrouter",
      model: "openai/gpt-4.1",
      callType: "chat",
      type: "completion",
      temperature: 0.7,
      response_format: { type: "json_object" },
    },
    chat: {
      systemPrompt,
      userPrompt,
      messageHistory: [], // Content analyzer doesn't use conversation history
    },
    origin: {
      originID: "1111-2222-3333-4444",
      callTS: new Date().toISOString(),
      channel: "waterfall-pipeline",
      gatewayUserID: "waterfall-user",
      gatewayMessageID: "waterfall-message",
      gatewayReplyTo: null,
      gatewayNpub: "waterfall-npub",
      response: "now",
      webhook_url: "https://hook.otherstuff.ai/hook",
      conversationID: "waterfall-content-analyzer",
      channelSpace: "WATERFALL",
      userID: "waterfall-pipeline-user",
      billingID: "testIfNotSet",
    },
  };
}

export default contentAnalyzer;
