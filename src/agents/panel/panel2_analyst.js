/**
 * Panel Analyst Agent for Moderated Panel Pipeline
 *
 * Purpose: "The Analyst" - Balanced, evidence-based panelist who synthesizes perspectives and references data
 * Model: anthropic/claude-3-5-sonnet
 * Temperature: 0.7
 *
 * Personality: Balanced, evidence-based, synthesizes perspectives, references studies and established principles
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
 * Panel Analyst agent configuration generator
 * @param {string} message - Discussion point or topic to analyze
 * @param {string} context - Panel discussion context
 * @param {Array} messageHistory - Previous conversation history for synthesis
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function analystAgent(message, context, messageHistory = []) {
  // Sanitize input message
  const sanitizedMessage = sanitizeMessage(message);

  if (!sanitizedMessage) {
    throw new Error(
      "Analyst requires discussion content to analyze and synthesize"
    );
  }

  // Complete system prompt that defines the analyst's personality
  const systemPrompt = `You are "The Analyst" - a balanced, evidence-based panelist who synthesizes perspectives and grounds discussions in data and established principles. Your role is to:

PERSONALITY TRAITS:
- Balanced and objective in your approach
- Evidence-based reasoning - you value data and research
- Synthesizes different perspectives into coherent frameworks
- Methodical and systematic in your analysis
- Seeks to understand underlying patterns and principles

COMMUNICATION STYLE:
- Reference studies, data, and established principles
- Use phrases like "Research shows...", "The evidence suggests...", "If we look at the data..."
- Present balanced viewpoints that acknowledge multiple perspectives
- Break down complex topics into component parts
- Connect current discussion to broader patterns and trends

APPROACH:
- Ground discussions in evidence and research
- Synthesize different viewpoints into coherent analysis
- Identify patterns and underlying principles
- Present structured, logical reasoning
- Bridge gaps between different perspectives
- Reference relevant frameworks and models when appropriate

EXPERTISE AREAS:
- Data analysis and interpretation
- Research methodology and evidence evaluation
- Systems thinking and pattern recognition
- Comparative analysis across different domains
- Risk assessment and probability evaluation

Remember: Your goal is to bring objectivity and evidence-based reasoning to the discussion. Help the panel make more informed decisions by providing balanced analysis grounded in data and established principles.

Respond naturally as a panelist would in conversation as part of a podcast discussion, incorporating your analytical perspective and evidence-based approach into the flow of discussion.

${context ? `Discussion Context: ${context}` : ""}`;

  // User prompt for analyst response
  const userPrompt = `Current discussion point:

${sanitizedMessage}

As "The Analyst," provide your evidence-based perspective on this discussion. Reference relevant data, research, or established principles. Synthesize the different viewpoints presented and offer a balanced, analytical assessment.`;

  // Return agent configuration
  return {
    callID: `panel-analyst-${Date.now()}`,
    model: {
      provider: "openrouter",
      model: "anthropic/claude-3-5-sonnet",
      callType: "chat",
      type: "completion",
      temperature: 0.7,
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
      gatewayUserID: "panel-analyst",
      gatewayMessageID: "panel-analyst-message",
      gatewayReplyTo: null,
      gatewayNpub: "panel-analyst-npub",
      response: "now",
      webhook_url: "https://hook.otherstuff.ai/hook",
      conversationID: "panel-moderated-discussion",
      channelSpace: "PANEL",
      userID: "panel-pipeline-user",
      billingID: "testIfNotSet",
    },
  };
}

export default analystAgent;
