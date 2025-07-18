/**
 * Tech Review Panel Summary Agent
 *
 * Purpose: Summarizes tech review panel discussions with focus on actionable technical recommendations
 * Model: openai/gpt-4.1 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.5 (balanced for comprehensive yet focused summaries)
 */

import agentLoader from "../../../utils/agentLoader.js";

/**
 * Tech Review Panel Summary agent configuration generator
 * @param {string} conversation - Complete panel conversation to summarize
 * @param {string} context - Tech review context and focus areas
 * @param {Array} messageHistory - Previous conversation history (optional)
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function techReviewSummaryAgent(
  conversation,
  context,
  messageHistory = []
) {
  // Sanitize input
  if (!conversation) {
    throw new Error(
      "Tech review summary requires conversation content to analyze"
    );
  }

  // Complete system prompt for tech review summarization
  const systemPrompt = `You are a Technical Review Summary Specialist responsible for creating comprehensive, actionable summaries of technical architecture review panel discussions.

Your role is to synthesize the technical review conversation between:
- Tech Lead (Moderator): Technical review coordination and guidance
- System Architect: Design patterns, best practices, maintainability focus
- Performance Engineer: Code quality, performance, reliability focus  
- Innovation Engineer: Creative solutions and alternative approaches

Summary structure and focus:
1. **Executive Summary**: High-level technical assessment and key findings
2. **Architecture Recommendations**: Specific design patterns and architectural guidance
3. **Performance & Quality**: Code quality, performance, and reliability recommendations
4. **Innovation Opportunities**: Creative alternatives and emerging technology considerations
5. **Implementation Priorities**: Actionable next steps ranked by importance
6. **Technical Debt Assessment**: Identified technical debt and mitigation strategies
7. **Risk Analysis**: Technical risks and recommended mitigation approaches

Key principles for tech review summaries:
- Focus on actionable technical recommendations
- Balance 70% proven best practices with 30% innovative alternatives
- Provide specific, implementable guidance
- Prioritize recommendations by impact and feasibility
- Include concrete examples and implementation details
- Counter "vibe coding" with structured technical analysis
- Ensure recommendations are practical and production-ready

Summary quality standards:
- Clear, technical language appropriate for engineering teams
- Specific recommendations with implementation guidance
- Balanced perspective reflecting the 70/30 conservative/innovation split
- Actionable next steps with clear priorities
- Technical depth appropriate for architecture decisions
- Focus on practical implementation over theoretical discussions

Remember: Your summary should provide clear, actionable technical guidance that engineering teams can immediately implement to improve their architecture, performance, and code quality.

${context ? `Technical Review Context: ${context}` : ""}`;

  // User prompt for summarization
  const userPrompt = `Please provide a comprehensive technical review summary of the following panel discussion:

${conversation}

Create a structured summary that includes:
1. Executive summary of key technical findings
2. Specific architecture and design pattern recommendations
3. Performance and code quality improvements
4. Innovation opportunities and alternative approaches
5. Prioritized implementation roadmap
6. Technical debt assessment and mitigation strategies
7. Risk analysis and recommended safeguards

Focus on actionable technical recommendations that balance proven best practices (70%) with innovative alternatives (30%). Ensure all recommendations are specific, implementable, and provide clear value to the engineering team.`;

  // Agent configuration for agentLoader
  const agentConfig = {
    systemPrompt,
    provider: "openrouter",
    model: "openai/gpt-4.1",
    callType: "chat",
    type: "completion",
    temperature: 0.5,
    includeDateContext: false,
    originOverrides: {
      channel: "techreview-panel-pipeline",
      gatewayUserID: "techreview-summarizer",
      gatewayMessageID: "techreview-summary-message",
      gatewayNpub: "techreview-summarizer-npub",
      conversationID: "techreview-panel-summary",
      channelSpace: "TECHREVIEW_PANEL",
      userID: "techreview-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default techReviewSummaryAgent;
