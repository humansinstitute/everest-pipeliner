/**
 * Reels Generator Agent for Waterfall Pipeline
 *
 * Purpose: Create 2 YouTube Reels concepts per LinkedIn post (8 total) with production guidance
 * Model: openai/gpt-4.1 via openrouter, Temperature: 0.8
 *
 * Migrated to use agentLoader utility for consistency and maintainability.
 */

import {
  generateCallDetails,
  generateOriginObject,
} from "../../utils/agentLoader.js";

/**
 * Embedded Reels Format Guide - Complete specification from technical design
 */
const REELS_FORMAT_GUIDE = {
  structure: {
    hook: "First 3 seconds must grab attention",
    content: "15-30 seconds of value delivery",
    cta: "Clear next step or engagement request",
  },
  visual: {
    text: "Bold, readable fonts minimum 24pt",
    contrast: "High contrast colors",
    movement: "Dynamic visual elements",
    branding: "Consistent visual identity",
  },
  content: {
    pace: "Quick, engaging delivery",
    value: "One key insight per reel",
    hooks: "Question, surprising fact, or bold statement",
    length: "30-60 seconds optimal",
  },
};

/**
 * Reels Generator agent configuration generator
 * @param {string} message - JSON string of LinkedIn posts from LinkedIn Creator
 * @param {string} context - Generation context and format instructions
 * @param {Array} messageHistory - Previous conversation history (unused for this agent)
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function reelsGenerator(message, context, messageHistory = []) {
  // Sanitize input message
    if (!message) {
    throw new Error(
      "Reels Generator requires LinkedIn posts from LinkedIn Creator"
    );
  }

  // Parse LinkedIn posts
  let linkedinPosts;
  try {
    linkedinPosts = JSON.parse(message);
  } catch (error) {
    throw new Error("Reels Generator requires valid JSON LinkedIn posts");
  }

  // Complete system prompt as specified in technical design
  const systemPrompt = `You are a YOUTUBE REELS CONCEPT CREATOR specializing in short-form video content.

Your task:
1. Extract 2 distinct Reels concepts from each LinkedIn post (8 total)
2. Provide complete production guidance for each concept
3. Focus on engaging, shareable video ideas

For each Reel concept, provide:
- Compelling hook (first 3 seconds)
- Content structure and key points
- Visual suggestions and production notes
- Script outline with timing
- Engagement optimization tips

Reel Types to Consider:
- Quick tip/hack demonstration
- Behind-the-scenes insight
- Question and answer format
- Myth-busting or contrarian take
- Step-by-step tutorial
- Story-driven narrative

EMBEDDED REELS FORMAT GUIDE:
${JSON.stringify(REELS_FORMAT_GUIDE, null, 2)}

Return your response as a JSON object with this structure:
{
  "reelsConcepts": [
    {
      "id": 1,
      "sourcePostId": 1,
      "title": "Reel concept title",
      "type": "tip|insight|question|story|tutorial",
      "hook": "Opening 3-second hook",
      "script": {
        "timing": "0-3s: Hook, 3-15s: Content, 15-30s: CTA",
        "content": "Detailed script with timing markers"
      },
      "visualSuggestions": {
        "textOverlays": ["Text 1", "Text 2"],
        "visualElements": ["Visual element descriptions"],
        "transitions": "Transition suggestions"
      },
      "productionNotes": "Actionable filming and editing guidance",
      "estimatedEngagement": "high|medium|low prediction"
    }
  ],
  "generationSummary": "Overall variety and approach across concepts"
}

${context ? `Context: ${context}` : ""}`;

  // User prompt for Reels concept generation
  const userPrompt = `Please create 2 YouTube Reels concepts for each of these LinkedIn posts (8 total concepts), following the embedded format guide:

${message}

Return the concepts as a properly formatted JSON object with all required fields.`;

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
    conversationID: "waterfall-reels-generator",
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
  callDetails.callID = `reels-generator-${Date.now()}`;
  callDetails.origin = origin;
  callDetails.chat.messageHistory = []; // Reels generator doesn't use conversation history

  return callDetails;
}

export default reelsGenerator;
