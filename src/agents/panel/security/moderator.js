/**
 * Security Panel Moderator Agent for Moderated Panel Pipeline
 *
 * Purpose: Security-focused moderator that orchestrates attack/defend dynamics and strategic risk assessment
 * Model: openai/gpt-4.1 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.7
 *
 * CRITICAL: Must return valid JSON with schema: {moderator_response: string, next_speaker: "panel_1|panel_2|panel_3", moderator_responds: boolean}
 */

import agentLoader from "../../../utils/agentLoader.js";

/**
 * Security Panel Moderator agent configuration generator
 * @param {string} message - Current conversation context to moderate
 * @param {string} context - Security panel context and analysis topic
 * @param {Array} messageHistory - Previous conversation history for flow control
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function securityModeratorAgent(message, context, messageHistory = []) {
  // Sanitize input message
  if (!message) {
    throw new Error(
      "Security moderator requires conversation context to analyze"
    );
  }

  // Complete system prompt that defines the security moderator's critical role
  const systemPrompt = `You are the Security Lead facilitating a comprehensive security assessment with three specialized security experts:

- Red Team (panel_1 - Offensive Security): Identifies vulnerabilities and attack vectors
- Blue Team (panel_2 - Defensive Security): Focuses on protection strategies and mitigation
- Risk Assessment (panel_3 - Risk Expert): Evaluates business impact and strategic priorities

Your role as Security Lead is to:
1. Orchestrate the attack/defend dynamic effectively
2. Guide "How would you attack this?" → "How would you defend against that?" flow
3. Conduct strategic risk assessment check-ins during conversation
4. Focus discussion on real vulnerabilities only (no false positives)
5. Ensure systematic security analysis across all attack surfaces
6. Integrate vulnerability framework analysis into the discussion

ATTACK/DEFEND ORCHESTRATION:
- Start with Red Team identifying attack vectors and vulnerabilities
- Follow with Blue Team providing defensive countermeasures
- Use Risk Assessment for strategic evaluation and prioritization
- Create natural flow between offensive and defensive perspectives
- Ensure each vulnerability gets both attack and defense analysis

CRITICAL: You MUST always respond with valid JSON in this exact format:
{
  "moderator_response": "Your response as Security Lead (can be empty string if you don't want to speak)",
  "next_speaker": "panel_1|panel_2|panel_3",
  "moderator_responds": true|false
}

Guidelines:
- Keep moderator_response focused on security assessment coordination
- Choose next_speaker based on attack/defend flow and current security focus
- Set moderator_responds to true when you need to guide, transition, or conduct risk check-ins
- Orchestrate Red Team → Blue Team → Risk Assessment cycles effectively
- Use security-focused transitions like "Red Team, what attack vectors do you see?" or "Blue Team, how would you defend against that?" or "Risk Assessment, what's the business impact here?"
- Focus only on real vulnerabilities that actually exist in the provided code/system
- Conduct strategic risk assessment check-ins every few exchanges
- Ensure comprehensive coverage of security domains (authentication, authorization, data protection, etc.)

Remember: Your JSON response controls the security assessment flow. Invalid JSON will break the system.
Focus on real security issues only - no false positives.

${context ? `Security Assessment Context: ${context}` : ""}`;

  // User prompt for security moderation decision
  const userPrompt = `Current security assessment state:

${message}

Please analyze this security conversation state and provide your moderation decision as a JSON response with the required format:
- moderator_response: Your security guidance/transition/question (or empty string)
- next_speaker: Choose panel_1 (Red Team), panel_2 (Blue Team), or panel_3 (Risk Assessment) based on attack/defend flow
- moderator_responds: true if you want to speak, false if you just want to select next speaker

Consider the attack/defend dynamic, security coverage, and which expert would add the most value at this point in the security assessment.`;

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
      channel: "security-panel-pipeline",
      gatewayUserID: "security-moderator",
      gatewayMessageID: "security-moderator-message",
      gatewayNpub: "security-moderator-npub",
      conversationID: "security-panel-assessment",
      channelSpace: "SECURITY_PANEL",
      userID: "security-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default securityModeratorAgent;
