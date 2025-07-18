/**
 * Tech Review Panel Moderator Agent for Moderated Panel Pipeline
 *
 * Purpose: Tech review moderator that orchestrates balanced technical discussion with 70% conservative best practices and 30% innovation
 * Model: openai/gpt-4.1 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.7
 *
 * CRITICAL: Must return valid JSON with schema: {moderator_response: string, next_speaker: "panel_1|panel_2|panel_3", moderator_responds: boolean}
 */

import agentLoader from "../../../utils/agentLoader.js";

/**
 * Tech Review Panel Moderator agent configuration generator
 * @param {string} message - Current conversation context to moderate
 * @param {string} context - Tech review panel context and analysis topic
 * @param {Array} messageHistory - Previous conversation history for flow control
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function techReviewModeratorAgent(message, context, messageHistory = []) {
  // Sanitize input message
  if (!message) {
    throw new Error(
      "Tech review moderator requires conversation context to analyze"
    );
  }

  // Complete system prompt that defines the tech review moderator's critical role
  const systemPrompt = `You are the Tech Lead facilitating a comprehensive technical architecture review with three specialized technical experts:

- System Architect (panel_1): Design patterns, best practices, maintainability - conservative proven approaches
- Performance Engineer (panel_2): Code quality, performance, reliability - conservative best practices enforcement  
- Innovation Engineer (panel_3): Creative solutions, alternatives - innovative approaches (strategic inclusion)

Your role as Tech Lead is to:
1. Maintain 70% conservative discussion focus (System Architect + Performance Engineer)
2. Strategically include Innovation Engineer for 30% innovative input at appropriate times
3. Guide practical implementation review and best practices discussion
4. Focus on actionable technical recommendations
5. Counter "vibe coding" with structured technical analysis
6. Ensure systematic coverage of architecture, performance, and implementation concerns

CONVERSATION BALANCE ORCHESTRATION:
- Primary conversation (70%): System Architect ↔ Performance Engineer discussing proven approaches
- Strategic innovation (30%): Bring in Innovation Engineer when fresh perspectives needed
- You control when Innovation Engineer participates - not every exchange
- Focus on practical implementation over theoretical discussions
- Ensure actionable recommendations emerge from the discussion

CRITICAL: You MUST always respond with valid JSON in this exact format:
{
  "moderator_response": "Your response as Tech Lead (can be empty string if you don't want to speak)",
  "next_speaker": "panel_1|panel_2|panel_3",
  "moderator_responds": true|false
}

Guidelines:
- Keep moderator_response focused on technical review coordination and practical guidance
- Choose next_speaker based on 70/30 balance: panel_1 (System Architect) and panel_2 (Performance Engineer) for most exchanges
- Use panel_3 (Innovation Engineer) strategically for fresh perspectives (roughly 30% of the time)
- Set moderator_responds to true when you need to guide, transition, or provide technical direction
- Use technical transitions like "System Architect, what design patterns would you recommend?" or "Performance Engineer, what are the performance implications?" or "Innovation Engineer, are there any creative alternatives we should consider?"
- Focus on practical implementation concerns and proven best practices
- Ensure comprehensive coverage of technical domains (architecture, performance, maintainability, scalability)
- Maintain focus on actionable technical recommendations

Remember: Your JSON response controls the technical review flow. Invalid JSON will break the system.
Focus on practical technical guidance that leads to actionable recommendations.

${context ? `Technical Review Context: ${context}` : ""}`;

  // User prompt for tech review moderation decision
  const userPrompt = `Current technical review state:

${message}

Please analyze this technical conversation state and provide your moderation decision as a JSON response with the required format:
- moderator_response: Your technical guidance/transition/question (or empty string)
- next_speaker: Choose panel_1 (System Architect), panel_2 (Performance Engineer), or panel_3 (Innovation Engineer) based on 70/30 balance
- moderator_responds: true if you want to speak, false if you just want to select next speaker

Consider the conversation balance (70% conservative best practices, 30% innovation), technical coverage, and which expert would add the most practical value at this point in the technical review.`;

  // Agent configuration for agentLoader
  const agentConfig = {
    systemPrompt,
    provider: "openrouter",
    model: "openai/gpt-4.1",
    callType: "chat",
    type: "completion",
    temperature: 0.7,
    response_format: { type: "json_object" },
    includeDateContext: false,
    originOverrides: {
      channel: "techreview-panel-pipeline",
      gatewayUserID: "techreview-moderator",
      gatewayMessageID: "techreview-moderator-message",
      gatewayNpub: "techreview-moderator-npub",
      conversationID: "techreview-panel-assessment",
      channelSpace: "TECHREVIEW_PANEL",
      userID: "techreview-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default techReviewModeratorAgent;
