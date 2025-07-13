// This agent will be setup to conduct a dialogue with a second agent to disucss a specific discussion point with a source material.
import { v4 as uuidv4 } from "uuid";

// Get current date in a readable format if required for agent.
const dayToday = new Date().toLocaleDateString("en-AU", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * Sanitizes message content to prevent JSON serialization issues
 * @param {string} message - The message content to sanitize
 * @returns {string} - Sanitized message content
 */
function sanitizeMessageContent(message) {
  if (typeof message !== "string") {
    return message;
  }

  // Escape backslashes and other problematic characters for JSON
  return message
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
}

async function conversationAgent(message, context, history) {
  //FILL IN VARIABLES

  // Sanitize the message content to prevent JSON serialization issues
  const sanitizedMessage = sanitizeMessageContent(message);
  console.log(
    "[ConversationAgent] DEBUG - Original message:",
    JSON.stringify(message)
  );
  console.log(
    "[ConversationAgent] DEBUG - Sanitized message:",
    JSON.stringify(sanitizedMessage)
  );

  const systemPromptInput = `You are a conversation facilitator.     Your role is to observe and adjust the direction of two agents who are having a discussion. They will be given source material and a discussion topic to kick off then they will conduct a dialogue about the topic. 

They have a habit of agreeing with each other and alway jumping on the newest idea. your job is to keep them on track. Review the conversation history assess the current thrust of the discussion and make a call wether to bring them back to an earlier thread that may have been abandoned. 

For example they may have started with idea 1, moved to 2, then 3. But in your view idea 2 was the most promising. Here you should be direct and respond as a senior facilitator and b clear that the conversation should explore topic 2 (if that is the best option). Interjectas though this is a real conversation. 

If you think the team are going well, provide positive encouragement and let them carry on.`;

  context = context + "The date today is: " + dayToday;

  const callDetails = {
    callID: uuidv4(),
    model: {
      provider: "openrouter", // *** SET THIS FOR AN AGENT - will tell call which SDK client to pick. "groq" | "openai | openrouter"
      // model: "meta-llama/llama-4-scout-17b-16e-instruct",
      model: "anthropic/claude-sonnet-4", // // *** SET THIS FOR AN AGENT "gpt-4o" "meta-llama/llama-4-scout-17b-16e-instruct" default model can be overridden at run time.
      callType: "chat", // *** SET THIS FOR AN AGENT
      type: "completion",
      // max_tokens: 4096,
      temperature: 0.8, // *** SET THIS FOR AN AGENT
    },
    chat: {
      // *** THIS IS SET ON THE FLY per CHAT - except for system input
      userPrompt: sanitizedMessage,
      systemPrompt: systemPromptInput, // *** SET THIS FOR AN AGENT
      messageContext: context,
      messageHistory: history,
    },
    origin: {
      originID: "1111-2222-3333-4444",
      callTS: new Date().toISOString(),
      channel: "string",
      gatewayUserID: "string",
      gatewayMessageID: "string",
      gatewayReplyTo: "string|null",
      gatewayNpub: "string",
      response: "now",
      webhook_url: "https://hook.otherstuff.ai/hook",
      conversationID: "mock-1738", // mock data for quick inegration
      channel: "mock", // mock data for quick inegration
      channelSpace: "MOCK", // mock data for quick inegration
      userID: "mock user", // mock data for quick inegration
      billingID: "testIfNotSet", // Represents the billing identity
    },
  };

  // console.log(callDetails);
  return callDetails;
}
export default conversationAgent;
