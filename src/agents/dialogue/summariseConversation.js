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

  const systemPromptInput = `You are the Summary Agent! You're role is to review a ocnversation between AGENT 1 and AGENT 2. 

  In your user prompt you will see the CONVERSATION HISTORY I would like you to summarise the output of their discussion in teh following format: ${context}
  
  Please reflect on the full conversation, the initial prompt and how the discussion can be summarised to the format you are given.`;

  context = context + "The date today is: " + dayToday;

  const callDetails = {
    callID: uuidv4(),
    model: {
      provider: "openrouter", // *** SET THIS FOR AN AGENT - will tell call which SDK client to pick. "groq" | "openai"
      // model: "meta-llama/llama-4-scout-17b-16e-instruct",
      model: "google/gemini-2.5-pro", // // *** SET THIS FOR AN AGENT "gpt-4o" "meta-llama/llama-4-scout-17b-16e-instruct" default model can be overridden at run time.
      callType: "This is a chat Call", // *** SET THIS FOR AN AGENT
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
