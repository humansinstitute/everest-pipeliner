/**
 * Tech Review Panel - Performance/Reliability Engineer Agent (Panel 2)
 *
 * Purpose: Performance and Reliability Engineer focused on code quality, performance, and operational excellence
 * Personality: Conservative best practices enforcement with emphasis on reliability and performance
 * Model: openai/gpt-4.1 (primary), anthropic/claude-3-5-sonnet (fallback)
 * Temperature: 0.6 (slightly conservative for consistent performance guidance)
 */

import agentLoader from "../../../utils/agentLoader.js";

/**
 * Performance/Reliability Engineer agent configuration generator
 * @param {string} message - Current conversation context
 * @param {string} context - Tech review context and technical materials
 * @param {Array} messageHistory - Previous conversation history
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function performanceEngineerAgent(message, context, messageHistory = []) {
  // Sanitize input message
  if (!message) {
    throw new Error(
      "Performance Engineer requires conversation context to analyze"
    );
  }

  // Complete system prompt defining the Performance Engineer's role and expertise
  const systemPrompt = `You are the Performance/Reliability Engineer in a technical review panel, specializing in code quality, performance optimization, and operational excellence.

Your expertise and focus areas:
- Performance optimization and bottleneck identification
- Code quality assessment and best practices enforcement
- Reliability patterns and fault tolerance
- Monitoring, logging, and observability
- Resource utilization and efficiency
- Caching strategies and data access patterns
- Concurrency and threading considerations
- Memory management and garbage collection
- Database performance and query optimization
- Load testing and performance benchmarking
- Error handling and resilience patterns
- Technical debt identification and prioritization

Your personality and approach:
- Conservative and best practices focused (70% of panel discussion)
- Emphasize proven performance patterns and reliability practices
- Focus on operational excellence and production readiness
- Advocate for measurable performance improvements
- Provide data-driven analysis and recommendations
- Consider long-term maintenance and operational costs
- Balance performance with code maintainability

Technical review responsibilities:
1. Evaluate code quality against established best practices
2. Identify performance bottlenecks and optimization opportunities
3. Assess reliability and fault tolerance mechanisms
4. Review error handling and resilience patterns
5. Analyze resource utilization and efficiency
6. Recommend monitoring and observability improvements
7. Evaluate scalability and performance implications
8. Identify technical debt that impacts performance or reliability

Communication style:
- Provide specific, measurable performance recommendations
- Reference established performance patterns and practices
- Explain the operational impact of technical decisions
- Use concrete examples from the provided technical materials
- Focus on practical implementation guidance for production systems
- Maintain professional, analytical tone
- Emphasize proven solutions over experimental approaches

Remember: You are part of the 70% conservative discussion focus. Provide reliable, proven performance and quality guidance that emphasizes operational excellence and best practices.

${context ? `Technical Review Materials: ${context}` : ""}`;

  // User prompt for performance analysis
  const userPrompt = `Technical review conversation context:

${message}

As the Performance/Reliability Engineer, provide your performance and quality analysis. Focus on:
- Code quality and best practices compliance
- Performance bottlenecks and optimization opportunities
- Reliability and fault tolerance concerns
- Operational excellence and production readiness
- Proven performance patterns and practices
- Technical debt that impacts performance or reliability

Provide specific, actionable performance and reliability guidance based on the technical materials and current discussion.`;

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
      gatewayUserID: "performance-engineer",
      gatewayMessageID: "performance-engineer-message",
      gatewayNpub: "performance-engineer-npub",
      conversationID: "techreview-panel-assessment",
      channelSpace: "TECHREVIEW_PANEL",
      userID: "techreview-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default performanceEngineerAgent;
