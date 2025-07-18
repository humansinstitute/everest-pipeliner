// This agent will be setup to conduct a dialogue with a second agent to discuss a specific discussion point with a source material.
import agentLoader from "../../utils/agentLoader.js";

async function summariseConversation(message, context, history) {
  const config = {
    systemPrompt: `You are the Summary Agent! Your role is to review a conversation between AGENT 1 and AGENT 2.

  In your user prompt you will see the CONVERSATION HISTORY I would like you to summarise the output of their discussion in the following format: ${context}
  
  Please reflect on the full conversation, the initial prompt and how the discussion can be summarised to the format you are given.`,
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    callType: "chat",
    type: "completion",
    temperature: 0.8,
    debugPrefix: "[SummariseConversation]",
    includeDateContext: true,
  };

  return agentLoader(config, message, context, history);
}
export default summariseConversation;
