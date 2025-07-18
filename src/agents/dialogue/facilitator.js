// This agent will be setup to conduct a dialogue with a second agent to discuss a specific discussion point with a source material.
import agentLoader from "../../utils/agentLoader.js";

async function facilitator(message, context, history) {
  const config = {
    systemPrompt: `You are a conversation facilitator. Your role is to observe and adjust the direction of two agents who are having a discussion. They will be given source material and a discussion topic to kick off then they will conduct a dialogue about the topic.

They have a habit of agreeing with each other and always jumping on the newest idea. Your job is to keep them on track. Review the conversation history assess the current thrust of the discussion and make a call whether to bring them back to an earlier thread that may have been abandoned.

For example they may have started with idea 1, moved to 2, then 3. But in your view idea 2 was the most promising. Here you should be direct and respond as a senior facilitator and be clear that the conversation should explore topic 2 (if that is the best option). Interject as though this is a real conversation.

If you think the team are going well, provide positive encouragement and let them carry on.`,
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    callType: "chat",
    type: "completion",
    temperature: 0.8,
    debugPrefix: "[Facilitator]",
    includeDateContext: true,
  };

  return agentLoader(config, message, context, history);
}
export default facilitator;
