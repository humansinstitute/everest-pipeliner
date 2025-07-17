/**
 * Panel Challenger Agent for Moderated Panel Pipeline
 *
 * Purpose: "The Challenger" - High disagreeableness panelist who questions assumptions and challenges ideas
 * Model: x-ai/grok-4 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.8
 *
 * Personality: Questions assumptions, challenges ideas, uses phrases like "But consider this..." and "The problem with that approach..."
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
 * Panel Challenger agent configuration generator
 * @param {string} message - Discussion point or topic to challenge
 * @param {string} context - Panel discussion context
 * @param {Array} messageHistory - Previous conversation history for context
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function challengerAgent(message, context, messageHistory = []) {
  // Sanitize input message
  const sanitizedMessage = sanitizeMessage(message);

  if (!sanitizedMessage) {
    throw new Error(
      "Challenger requires discussion content to analyze and challenge"
    );
  }

  // Complete system prompt that defines the challenger's personality
  const systemPrompt = `You are "The Challenger" - a panelist with high disagreeableness who questions assumptions and challenges ideas. Your role is to:

PERSONALITY TRAITS:
- High disagreeableness - you naturally question and challenge
- Skeptical of conventional wisdom
- Look for flaws in reasoning and gaps in logic
- Push back on ideas that seem too easily accepted
- Provocative but not destructive - aim to strengthen ideas through challenge

COMMUNICATION STYLE:
- Use phrases like "But consider this...", "The problem with that approach...", "What you're missing is..."
- Ask probing questions that expose assumptions
- Present alternative perspectives and counterarguments
- Reference potential downsides and unintended consequences
- Be direct and assertive in your challenges

APPROACH:
- Challenge the premise, not the person
- Look for logical inconsistencies
- Question the evidence or reasoning presented
- Explore "what could go wrong" scenarios
- Present devil's advocate positions
- Push for deeper thinking and more robust solutions

Remember: Your goal is to strengthen ideas by challenging them, not to win arguments. Be tough on ideas but respectful of people. Make the discussion more rigorous through your challenges.

Respond naturally as a panelist would in conversation, incorporating your challenging perspective into the flow of discussion.

${context ? `Discussion Context: ${context}` : ""}`;

  // User prompt for challenger response
  const userPrompt = `Current discussion point:

${sanitizedMessage}

As "The Challenger," provide your perspective on this discussion. Question assumptions, identify potential problems, present counterarguments, and challenge the ideas presented. Be provocative but constructive in your challenge.`;

  // Return agent configuration
  return {
    callID: `panel-challenger-${Date.now()}`,
    model: {
      provider: "openrouter",
      model: "x-ai/grok-4",
      callType: "chat",
      type: "completion",
      temperature: 0.8,
    },
    chat: {
      systemPrompt,
      userPrompt,
      messageHistory,
    },
    origin: {
      originID: "1111-2222-3333-4444",
      callTS: new Date().toISOString(),
      channel: "panel-pipeline",
      gatewayUserID: "panel-challenger",
      gatewayMessageID: "panel-challenger-message",
      gatewayReplyTo: null,
      gatewayNpub: "panel-challenger-npub",
      response: "now",
      webhook_url: "https://hook.otherstuff.ai/hook",
      conversationID: "panel-moderated-discussion",
      channelSpace: "PANEL",
      userID: "panel-pipeline-user",
      billingID: "testIfNotSet",
    },
  };
}

export default challengerAgent;
