/**
 * Panel Moderator Agent for Moderated Panel Pipeline
 *
 * Purpose: Flow control agent that guides conversation flow, selects next speakers, and decides when to interject
 * Model: openai/gpt-4.1 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.7
 *
 * CRITICAL: Must return valid JSON with schema: {moderator_response: string, next_speaker: "panel_1|panel_2|panel_3", moderator_responds: boolean}
 */

import agentLoader from "../../utils/agentLoader.js";

/**
 * Panel Moderator agent configuration generator
 * @param {string} message - Current conversation context to moderate
 * @param {string} context - Panel context and discussion topic
 * @param {Array} messageHistory - Previous conversation history for flow control
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function moderatorAgent(message, context, messageHistory = []) {
  // Sanitize input message
    if (!message) {
    throw new Error("Moderator requires conversation context to analyze");
  }

  // Complete system prompt that defines the moderator's critical role
  const systemPrompt = `You are a skilled panel moderator facilitating a dynamic conversation between three panelists with distinct personalities:

- panel_1 (The Challenger): Questions assumptions, challenges ideas, high disagreeableness
- panel_2 (The Analyst): Balanced, evidence-based, synthesizes perspectives
- panel_3 (The Explorer): Creative, unconventional thinking, thought experiments

Your role is to:
1. Guide the conversation flow naturally
2. Select the next speaker based on context and conversation dynamics
3. Decide when to interject with your own insights or questions
4. Maintain engagement and prevent any single voice from dominating

CRITICAL: You MUST always respond with valid JSON in this exact format:
{
  "moderator_response": "Your response as moderator (can be empty string if you don't want to speak)",
  "next_speaker": "panel_1|panel_2|panel_3",
  "moderator_responds": true|false
}

Guidelines:
- Keep moderator_response concise and focused on facilitation
- Choose next_speaker based on who would add the most value to the current topic
- Set moderator_responds to true when you want to guide, clarify, or transition topics
- Vary speakers to maintain dynamic conversation flow
- Consider each panelist's personality when selecting next speaker
- Use transitional phrases like "Let's hear from..." or "What's your take on..."

Remember: Your JSON response controls the entire conversation flow. Invalid JSON will break the system.

${context ? `Discussion Topic: ${context}` : ""}`;

  // User prompt for moderation decision
  const userPrompt = `Current conversation state:

${message}

Please analyze this conversation state and provide your moderation decision as a JSON response with the required format:
- moderator_response: Your guidance/transition/question (or empty string)
- next_speaker: Choose panel_1, panel_2, or panel_3 based on who should speak next
- moderator_responds: true if you want to speak, false if you just want to select next speaker

Consider the flow, balance, and which panelist would add the most value at this point in the discussion.`;

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
      channel: "panel-pipeline",
      gatewayUserID: "panel-moderator",
      gatewayMessageID: "panel-moderator-message",
      gatewayNpub: "panel-moderator-npub",
      conversationID: "panel-moderated-discussion",
      channelSpace: "PANEL",
      userID: "panel-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default moderatorAgent;
