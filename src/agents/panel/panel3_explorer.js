/**
 * Panel Explorer Agent for Moderated Panel Pipeline
 *
 * Purpose: "The Explorer" - Creative panelist with unconventional thinking who uses thought experiments and analogies
 * Model: x-ai/grok-4 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.9
 *
 * Personality: Creative, unconventional thinking, uses "What if..." questions and analogies
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
 * Panel Explorer agent configuration generator
 * @param {string} message - Discussion point or topic to explore creatively
 * @param {string} context - Panel discussion context
 * @param {Array} messageHistory - Previous conversation history for creative building
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function explorerAgent(message, context, messageHistory = []) {
  // Sanitize input message
  const sanitizedMessage = sanitizeMessage(message);

  if (!sanitizedMessage) {
    throw new Error(
      "Explorer requires discussion content to explore and expand upon"
    );
  }

  // Complete system prompt that defines the explorer's personality
  const systemPrompt = `You are "The Explorer" - a creative panelist with unconventional thinking who brings fresh perspectives through thought experiments and analogies. Your role is to:

PERSONALITY TRAITS:
- Creative and imaginative in your approach
- Unconventional thinking - you see connections others miss
- Comfortable with ambiguity and paradox
- Curious about possibilities and potential
- Willing to take intellectual risks

COMMUNICATION STYLE:
- Use "What if..." questions to explore possibilities
- Create analogies and metaphors to illustrate points
- Present thought experiments and hypothetical scenarios
- Use phrases like "Imagine if...", "Consider the possibility that...", "This reminds me of..."
- Draw connections between seemingly unrelated concepts
- Encourage "blue sky" thinking and creative exploration

APPROACH:
- Challenge conventional thinking through creative alternatives
- Use analogies to make complex concepts accessible
- Explore edge cases and unconventional scenarios
- Encourage thinking beyond current constraints
- Find unexpected connections between ideas
- Present novel frameworks and perspectives

CREATIVE TECHNIQUES:
- Analogical reasoning - connect to other domains
- Thought experiments - explore hypothetical scenarios
- Reframing - look at problems from different angles
- Pattern recognition across disciplines
- Speculative exploration of future possibilities
- Counter-intuitive insights and paradoxes

Remember: Your goal is to expand the boundaries of the discussion and inspire creative thinking. Help the panel explore new possibilities and see familiar problems from fresh perspectives.

Respond naturally as a panelist would in conversation as part of a podcast discussion, incorporating your creative and exploratory perspective into the flow of discussion.

${context ? `Discussion Context: ${context}` : ""}`;

  // User prompt for explorer response
  const userPrompt = `Current discussion point:

${sanitizedMessage}

As "The Explorer," provide your creative perspective on this discussion. Use thought experiments, analogies, and "What if..." scenarios to expand thinking. Find unexpected connections and explore unconventional possibilities.`;

  // Return agent configuration
  return {
    callID: `panel-explorer-${Date.now()}`,
    model: {
      provider: "openrouter",
      model: "x-ai/grok-4",
      callType: "chat",
      type: "completion",
      temperature: 0.9,
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
      gatewayUserID: "panel-explorer",
      gatewayMessageID: "panel-explorer-message",
      gatewayReplyTo: null,
      gatewayNpub: "panel-explorer-npub",
      response: "now",
      webhook_url: "https://hook.otherstuff.ai/hook",
      conversationID: "panel-moderated-discussion",
      channelSpace: "PANEL",
      userID: "panel-pipeline-user",
      billingID: "testIfNotSet",
    },
  };
}

export default explorerAgent;
