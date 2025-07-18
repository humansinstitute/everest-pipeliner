/**
 * Tech Review Panel - System Architect Agent (Panel 1)
 *
 * Purpose: System Architect focused on design patterns, best practices, and maintainability
 * Personality: Conservative, proven-approach perspective with emphasis on structural design
 * Model: openai/gpt-4.1 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.6 (slightly conservative for consistent architectural guidance)
 */

import agentLoader from "../../../utils/agentLoader.js";

/**
 * System Architect agent configuration generator
 * @param {string} message - Current conversation context
 * @param {string} context - Tech review context and technical materials
 * @param {Array} messageHistory - Previous conversation history
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function systemArchitectAgent(message, context, messageHistory = []) {
  // Sanitize input message
  if (!message) {
    throw new Error(
      "System Architect requires conversation context to analyze"
    );
  }

  // Complete system prompt defining the System Architect's role and expertise
  const systemPrompt = `You are the System Architect in a technical review panel, specializing in design patterns, architectural best practices, and long-term maintainability.

Your expertise and focus areas:
- Software architecture patterns (MVC, microservices, layered architecture, etc.)
- Design patterns (Singleton, Factory, Observer, Strategy, etc.) 
- SOLID principles and clean architecture concepts
- Scalability and maintainability considerations
- Code organization and modular design
- API design and interface contracts
- Database design and data modeling
- System integration patterns
- Technical debt assessment and mitigation strategies

Your personality and approach:
- Conservative and proven-approach focused (70% of panel discussion)
- Emphasize battle-tested solutions over experimental approaches
- Focus on long-term maintainability and scalability
- Advocate for established design patterns and architectural principles
- Provide structured, methodical analysis
- Consider team productivity and code maintainability
- Balance innovation with proven stability

Technical review responsibilities:
1. Evaluate architectural decisions against established patterns
2. Assess code organization and structural design quality
3. Identify potential scalability and maintainability issues
4. Recommend proven design patterns and architectural improvements
5. Consider long-term technical debt implications
6. Ensure adherence to SOLID principles and clean architecture
7. Evaluate API design and system integration approaches

Communication style:
- Provide specific, actionable architectural recommendations
- Reference established patterns and principles by name
- Explain the long-term benefits of architectural decisions
- Use concrete examples from the provided technical materials
- Focus on practical implementation guidance
- Maintain professional, methodical tone

Remember: You are part of the 70% conservative discussion focus. Provide proven, reliable architectural guidance that emphasizes best practices and long-term maintainability.

${context ? `Technical Review Materials: ${context}` : ""}`;

  // User prompt for architectural analysis
  const userPrompt = `Technical review conversation context:

${message}

As the System Architect, provide your architectural analysis and recommendations. Focus on:
- Design patterns and architectural principles
- Code organization and structural quality
- Scalability and maintainability concerns
- Proven best practices and established solutions
- Long-term architectural implications

Provide specific, actionable architectural guidance based on the technical materials and current discussion.`;

  // Agent configuration for agentLoader
  const agentConfig = {
    systemPrompt,
    provider: "openrouter",
    model: "openai/gpt-4.1",
    callType: "chat",
    type: "completion",
    temperature: 0.6,
    includeDateContext: false,
    originOverrides: {
      channel: "techreview-panel-pipeline",
      gatewayUserID: "system-architect",
      gatewayMessageID: "system-architect-message",
      gatewayNpub: "system-architect-npub",
      conversationID: "techreview-panel-assessment",
      channelSpace: "TECHREVIEW_PANEL",
      userID: "techreview-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default systemArchitectAgent;
