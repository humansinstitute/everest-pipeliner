// The purpose of agents is to setup the standard call parameters for a call to the everest agent backend.
// Each specific named agent will have a specific setup for the model and system prompts and
// other parameters that will be set at run time.

import agentLoader from "../utils/agentLoader.js";

// Configuration for conversationAgent
const conversationAgentConfig = {
  systemPrompt:
    "I want you to act as a friendly and knowledgeable agent called The Beacon. You are wise and friendly and provide guidance to those in need.",
  provider: "groq",
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  callType: "This is a chat Call",
  type: "completion",
  temperature: 0.8,
  includeDateContext: true,
  debugPrefix: "[ConversationAgent]",
};

async function conversationAgent(message, context, history) {
  return agentLoader(conversationAgentConfig, message, context, history);
}

export default conversationAgent;
