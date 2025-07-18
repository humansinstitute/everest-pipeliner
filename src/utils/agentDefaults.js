/**
 * Default configuration constants for agentLoader utility
 *
 * This file contains the default values used across all agents to ensure
 * consistency and provide sensible fallbacks for agent configurations.
 */

/**
 * Default agent configuration object
 * These values are used when specific configuration is not provided
 */
export const DEFAULT_AGENT_CONFIG = {
  // Model Configuration
  provider: "groq",
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  callType: "This is a chat Call",
  type: "completion",
  temperature: 0.8,

  // Context Configuration
  includeDateContext: true,

  // Debugging Configuration
  debugPrefix: "[Agent]",

  // Origin Overrides (empty by default)
  originOverrides: {},
};

/**
 * Default origin object structure
 * This represents the mock data structure used across all agents
 */
export const DEFAULT_ORIGIN = {
  originID: "1111-2222-3333-4444",
  callTS: "", // Will be overridden with actual timestamp
  gatewayUserID: "string",
  gatewayMessageID: "string",
  gatewayReplyTo: "string|null",
  gatewayNpub: "string",
  response: "now",
  webhook_url: "https://hook.otherstuff.ai/hook",
  conversationID: "mock-1738", // mock data for quick integration
  channel: "mock", // mock data for quick integration
  channelSpace: "MOCK", // mock data for quick integration
  userID: "mock user", // mock data for quick integration
  billingID: "testIfNotSet", // Represents the billing identity
};

/**
 * Supported provider types
 */
export const SUPPORTED_PROVIDERS = ["groq", "openai", "openrouter"];

/**
 * Supported model types
 */
export const SUPPORTED_TYPES = ["completion", "json_object"];

/**
 * Common model configurations by provider
 */
export const PROVIDER_MODELS = {
  groq: {
    default: "meta-llama/llama-4-scout-17b-16e-instruct",
    alternatives: ["meta-llama/llama-4-scout-17b-16e-instruct"],
  },
  openai: {
    default: "gpt-4o",
    alternatives: ["gpt-4o", "gpt-4", "gpt-3.5-turbo"],
  },
  openrouter: {
    default: "anthropic/claude-sonnet-4",
    alternatives: ["anthropic/claude-sonnet-4", "x-ai/grok-4"],
  },
};
