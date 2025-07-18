/**
 * LinkedIn Creator Agent for Waterfall Pipeline
 *
 * Purpose: Transform topic chunks into optimized LinkedIn posts following embedded style guide
 * Model: openai/gpt-4.1 via openrouter, Temperature: 0.8
 *
 * Migrated to use agentLoader utility for consistency and maintainability.
 */

import {
  generateCallDetails,
  generateOriginObject,
} from "../../utils/agentLoader.js";

/**
 * Embedded LinkedIn Style Guide - Complete specification from technical design
 */
const LINKEDIN_STYLE_GUIDE = {
  voice: {
    conversational: "Write like talking to a smart friend over coffee",
    actionable: "Always include practical takeaways",
    authentic: "Share real experiences and lessons learned",
    curious: "Ask thought-provoking questions",
    confident: "Share insights without being preachy",
  },
  structure: {
    hook: "1-2 lines that grab attention",
    story: "2-3 sentences setting up insight",
    insight: "Main takeaway clearly stated",
    points: "2-3 bullet points or short paragraphs",
    cta: "Question or request for engagement",
  },
  formatting: {
    lineBreaks: "Use generously for readability",
    hashtags: "3-5 relevant hashtags at end",
    sentences: "Keep short and punchy",
    addressing: "Use 'you' to directly address reader",
  },
};

/**
 * LinkedIn Creator agent configuration generator
 * @param {string} message - JSON string of topic chunks from Content Analyzer
 * @param {string} context - Creation context and style instructions
 * @param {Array} messageHistory - Previous conversation history (unused for this agent)
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function linkedinCreator(message, context, messageHistory = []) {
  // Sanitize input message
    if (!message) {
    throw new Error(
      "LinkedIn Creator requires topic chunks from Content Analyzer"
    );
  }

  // Parse topic chunks
  let topicChunks;
  try {
    topicChunks = JSON.parse(message);
  } catch (error) {
    throw new Error("LinkedIn Creator requires valid JSON topic chunks");
  }

  // Complete system prompt as specified in technical design
  const systemPrompt = `You are a LINKEDIN CONTENT CREATOR specializing in professional social media posts.

Your task:
1. Transform each topic chunk into an optimized LinkedIn post
2. Follow the embedded style guide strictly
3. Create 4 distinct posts with different angles/styles
4. Ensure each post can stand alone effectively

For each topic, create a complete LinkedIn post including:
- Attention-grabbing hook (1-2 lines)
- Context or brief story (2-3 sentences)
- Key insight clearly stated
- 2-3 supporting points (bullets or paragraphs)
- Engaging call-to-action question
- 3-5 relevant hashtags

Vary your approach across the 4 posts:
- Post 1: Story-driven approach
- Post 2: Framework/educational approach
- Post 3: Question/discussion starter
- Post 4: Insight/revelation approach

EMBEDDED STYLE GUIDE:
${JSON.stringify(LINKEDIN_STYLE_GUIDE, null, 2)}

Return your response as a JSON object with this structure:
{
  "linkedinPosts": [
    {
      "id": 1,
      "sourceTopicId": 1,
      "title": "Post title/theme",
      "content": "Complete LinkedIn post text with formatting",
      "approach": "story-driven|framework|question|insight",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "estimatedEngagement": "high|medium|low prediction",
      "keyElements": {
        "hook": "The opening hook text",
        "insight": "Main insight presented",
        "cta": "Call to action used"
      }
    }
  ],
  "creationSummary": "Overall approach and variations used"
}

${context ? `Context: ${context}` : ""}`;

  // User prompt for LinkedIn post creation
  const userPrompt = `Please create 4 optimized LinkedIn posts from these topic chunks, following the embedded style guide and varying approaches:

${message}

Return the posts as a properly formatted JSON object with all required fields.`;

  // Agent configuration for waterfall-specific requirements
  const config = {
    provider: "openrouter",
    model: "openai/gpt-4.1",
    callType: "chat",
    type: "completion",
    temperature: 0.8,
    response_format: { type: "json_object" },
    systemPrompt,
  };

  // Generate origin with waterfall-specific overrides
  const origin = generateOriginObject({
    originID: "1111-2222-3333-4444",
    conversationID: "waterfall-linkedin-creator",
    channel: "waterfall-pipeline",
    gatewayUserID: "waterfall-user",
    gatewayMessageID: "waterfall-message",
    gatewayReplyTo: null,
    gatewayNpub: "waterfall-npub",
    response: "now",
    webhook_url: "https://hook.otherstuff.ai/hook",
    channelSpace: "WATERFALL",
    userID: "waterfall-pipeline-user",
    billingID: "testIfNotSet",
  });

  // Generate callDetails using agentLoader helper but with unsanitized userPrompt
  const callDetails = generateCallDetails(
    config,
    userPrompt,
    "",
    messageHistory
  );

  // Override with waterfall-specific values
  callDetails.callID = `linkedin-creator-${Date.now()}`;
  callDetails.origin = origin;
  callDetails.chat.messageHistory = []; // LinkedIn creator doesn't use conversation history

  return callDetails;
}

export default linkedinCreator;
