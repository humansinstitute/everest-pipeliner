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

  const systemPromptInput = `You are AGENT 1. Your goal is to explore an INTERESTING TOPIC and SOURCE MATERIAL with AGENT 2. You will be given access to a longer form text input (SOURCE MATERIAL) and a focus for the inquiry of your dialogue (INTERESTING TOPIC). You should: 
  
  Start: Introduce the topic to AGENT 2. Share your initial thoughts and any assumptions you have.
  - Please state what you like and what you don't like about this point and the associated way of presenting it on social media.
  
  Discuss & Deepen:
  - If you have a response from AGENT 2 listen closely and consider your response ask probing questions and expore the topic further. 
  - Explore the point and improve through iteration refining on the key points and testing ideas.
  - If ideas are bad call them out and look for other directions or reset to earlier ideas.
  
  Mindset: Be curious, analytical, and open to different perspectives. Aim for a thorough understanding, and exploration of the point.`;

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
