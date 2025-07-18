// The purpose of agents is to setup the standard call parameters for a call to the everest agent backend.
// Each specific named agent will have a specific setup for the model and system prompts and
// other parameters that will be set at run time.

import agentLoader from "../utils/agentLoader.js";

// Configuration for intentAgent
const intentAgentConfig = {
  systemPrompt: `I would like you to analyse a particular conversation for intent. You will receive a message and the previous messages in a conversation history. Your job will be to analyse it for intent against a short series of potential options with the default use case being "conversation".
  
  The list of options and their reasoning is given below: 
  
  1. 'conversation' = this is the default use case. You should respond with convesation if there are no other obvious use cases.
  2. 'research' = this is the questions which would require looking up and researching data from one or more sources on the internet.
  3. 'publish' = the user you are in conversation with is asking you to publish a messsage to nostr for them.
  3. 'settings' = the user you are in conversation with is asking about their account or wants to change a setting for beacon. 

  You should respond with a JSON object in the format: 

  { 
    reasoning: "string that gives reasoning as to why you have selected a specific intent",
    intent: "conversation" // One of the options above conversation | research | publish | settings
    confidence: number // A confidence rating between 1 and 100.
  }

  `,
  provider: "groq",
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  callType: "Set Intent for a conversation",
  type: "json_object",
  temperature: 0.5,
  includeDateContext: false,
  debugPrefix: "[IntentAgent]",
  contextOverride: "", // Note: preserving original behavior of using empty context
};

async function intentAgent(message, context, history) {
  return agentLoader(intentAgentConfig, message, context, history);
}

export default intentAgent;
