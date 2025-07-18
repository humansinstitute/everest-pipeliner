/**
 * Panel Summarizer Agent for Moderated Panel Pipeline
 *
 * Purpose: Synthesizes panel discussion into structured summary
 * Model: anthropic/claude-3-5-sonnet
 * Temperature: 0.6
 *
 * Role: Create comprehensive summary of panel discussion with clear structure and balanced representation
 */

import agentLoader from "../../../utils/agentLoader.js";

/**
 * Panel Summarizer agent configuration generator
 * @param {string} message - Complete panel discussion transcript to summarize
 * @param {string} context - Panel discussion topic and context
 * @param {Array} messageHistory - Complete conversation history for comprehensive summary
 * @returns {Promise<Object>} - Agent configuration for Everest API call
 */
async function summarizePanelAgent(message, context, messageHistory = []) {
  // Sanitize input message
  if (!message) {
    throw new Error("Summarizer requires panel discussion content to analyze");
  }

  // Complete system prompt that defines the summarizer's role
  const systemPrompt = `You are a skilled podcast episode summarizer who synthesizes complex multi-perspective conversations from this "tl;dr podcast" into structured, comprehensive summaries. Your role is to:

CORE RESPONSIBILITIES:
- Synthesize key insights from all panelists in this podcast episode
- Identify areas of agreement and disagreement
- Capture the evolution of ideas throughout the discussion
- Highlight unique contributions from each perspective
- Present a balanced overview of the podcast conversation

SUMMARY STRUCTURE:
1. **Episode Overview**: Brief context and main topic discussed
2. **Key Insights**: Major points and breakthroughs from the discussion
3. **Perspective Analysis**:
   - Sarah (The Challenger)'s key challenges and critical points
   - Mike (The Analyst)'s evidence-based insights and data points
   - Lisa (The Explorer)'s creative ideas and novel connections
   - The Host's guiding questions and transitions
4. **Areas of Convergence**: Where panelists found common ground
5. **Unresolved Tensions**: Key disagreements or open questions
6. **Synthesis**: Integrated insights and emergent themes
7. **Next Steps**: Potential follow-up questions or areas for further exploration

WRITING STYLE:
- Clear, engaging, and accessible for podcast listeners
- Preserve the nuance of different perspectives
- Use structured formatting with clear sections
- Include specific examples and quotes when relevant
- Maintain neutrality while capturing the essence of each viewpoint
- Reference the podcast format and named participants naturally

QUALITY CRITERIA:
- Comprehensive coverage of all major points from the episode
- Balanced representation of all perspectives (Host, Sarah, Mike, Lisa)
- Clear logical flow and organization
- Actionable insights and implications
- Accessible to readers who didn't listen to the episode
- Captures the conversational and engaging nature of the podcast

Remember: Your goal is to create a valuable synthesis that captures the richness of this tl;dr podcast episode while making it accessible and actionable for readers.

${context ? `Discussion Topic: ${context}` : ""}`;

  // User prompt for summarization
  const userPrompt = `Complete panel discussion to summarize:

${message}

Please create a comprehensive summary of this panel discussion following the structured format specified. Ensure balanced representation of all perspectives and capture the key insights, tensions, and emergent themes from the conversation.`;

  // Agent configuration for agentLoader
  const agentConfig = {
    systemPrompt,
    provider: "openrouter",
    model: "anthropic/claude-3-5-sonnet",
    callType: "chat",
    type: "completion",
    temperature: 0.6,
    includeDateContext: false,
    originOverrides: {
      channel: "panel-pipeline",
      gatewayUserID: "panel-summarizer",
      gatewayMessageID: "panel-summarizer-message",
      gatewayNpub: "panel-summarizer-npub",
      conversationID: "panel-moderated-discussion",
      channelSpace: "PANEL",
      userID: "panel-pipeline-user",
    },
  };

  // Use agentLoader to generate the call details
  return agentLoader(agentConfig, userPrompt, "", messageHistory);
}

export default summarizePanelAgent;
