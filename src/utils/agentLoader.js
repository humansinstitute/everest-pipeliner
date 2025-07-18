/**
 * Agent Loader Utility Function
 *
 * This module provides a centralized agentLoader function that consolidates
 * common agent functionality and eliminates code duplication across agent files.
 *
 * @module agentLoader
 */

import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_AGENT_CONFIG,
  DEFAULT_ORIGIN,
  SUPPORTED_PROVIDERS,
  SUPPORTED_TYPES,
} from "./agentDefaults.js";

/**
 * Sanitizes message content to prevent JSON serialization issues
 *
 * This function escapes problematic characters that could cause issues
 * when serializing messages to JSON format.
 *
 * @param {string} message - The message content to sanitize
 * @returns {string} - Sanitized message content safe for JSON serialization
 */
export function sanitizeMessageContent(message) {
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

/**
 * Gets current date string in Australian locale format
 *
 * Returns a formatted date string consistent with the format used
 * across all existing agents.
 *
 * @returns {string} - Formatted date string (e.g., "Friday, 18 July 2025")
 */
export function getCurrentDateString() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generates the origin object with optional overrides
 *
 * Creates the standard origin object structure used across all agents,
 * with support for selective field overrides.
 *
 * @param {Object} [overrides={}] - Optional overrides for origin fields
 * @returns {Object} - Complete origin object with timestamp
 */
export function generateOriginObject(overrides = {}) {
  return {
    ...DEFAULT_ORIGIN,
    ...overrides,
    callTS: new Date().toISOString(), // Always generate fresh timestamp
  };
}

/**
 * Generates the complete callDetails object
 *
 * Creates the standard callDetails structure that all agents return,
 * ensuring backward compatibility with existing implementations.
 *
 * @param {Object} config - Merged agent configuration
 * @param {string} sanitizedMessage - Sanitized user message
 * @param {string} context - Message context
 * @param {Array} history - Message history
 * @returns {Object} - Complete callDetails object
 */
export function generateCallDetails(
  config,
  sanitizedMessage,
  context,
  history
) {
  return {
    callID: uuidv4(),
    model: {
      provider: config.provider,
      model: config.model,
      callType: config.callType,
      type: config.type,
      temperature: config.temperature,
      ...(config.max_tokens && { max_tokens: config.max_tokens }),
      ...(config.response_format && { response_format: config.response_format }),
    },
    chat: {
      userPrompt: sanitizedMessage,
      systemPrompt: config.systemPrompt,
      messageContext: context,
      messageHistory: history,
    },
    origin: generateOriginObject(config.originOverrides),
  };
}

/**
 * Validates agent configuration
 *
 * Performs basic validation on the provided agent configuration
 * to ensure required fields are present and valid.
 *
 * @param {Object} config - Agent configuration to validate
 * @throws {Error} - If configuration is invalid
 */
function validateAgentConfig(config) {
  if (!config.systemPrompt) {
    throw new Error("Agent configuration must include a systemPrompt");
  }

  if (config.provider && !SUPPORTED_PROVIDERS.includes(config.provider)) {
    throw new Error(
      `Unsupported provider: ${
        config.provider
      }. Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  if (config.type && !SUPPORTED_TYPES.includes(config.type)) {
    throw new Error(
      `Unsupported type: ${
        config.type
      }. Supported types: ${SUPPORTED_TYPES.join(", ")}`
    );
  }

  if (
    config.temperature !== undefined &&
    (config.temperature < 0 || config.temperature > 2)
  ) {
    throw new Error("Temperature must be between 0 and 2");
  }
}

/**
 * Main agentLoader function
 *
 * Consolidates common agent functionality into a single, configurable function.
 * This function replaces the duplicated code patterns found across all agent files
 * while maintaining 100% backward compatibility.
 *
 * @param {Object} agentConfig - Agent-specific configuration object
 * @param {string} agentConfig.systemPrompt - The system prompt for the agent (required)
 * @param {string} [agentConfig.provider="groq"] - Model provider ("groq", "openai", "openrouter")
 * @param {string} [agentConfig.model] - Model name (defaults based on provider)
 * @param {string} [agentConfig.callType="This is a chat Call"] - Description of the call type
 * @param {string} [agentConfig.type="completion"] - Response type ("completion", "json_object")
 * @param {number} [agentConfig.temperature=0.8] - Model temperature (0-2)
 * @param {number} [agentConfig.max_tokens] - Maximum tokens (optional)
 * @param {boolean} [agentConfig.includeDateContext=true] - Whether to append current date to context
 * @param {string} [agentConfig.debugPrefix="[Agent]"] - Prefix for debug logging
 * @param {Object} [agentConfig.originOverrides={}] - Overrides for origin object fields
 * @param {string} [agentConfig.contextOverride] - Override context completely (ignores context parameter)
 * @param {string} message - User message content
 * @param {string} context - Message context
 * @param {Array} history - Message history array
 * @returns {Object} - Standard callDetails object for Everest service
 *
 * @example
 * // Basic usage
 * const config = {
 *   systemPrompt: "I want you to act as a helpful assistant",
 *   provider: "groq",
 *   temperature: 0.7
 * };
 * const callDetails = agentLoader(config, message, context, history);
 *
 * @example
 * // With custom origin overrides
 * const config = {
 *   systemPrompt: "I want you to act as an intent analyzer",
 *   type: "json_object",
 *   originOverrides: {
 *     conversationID: "custom-conversation-123",
 *     billingID: "premium-user"
 *   }
 * };
 * const callDetails = agentLoader(config, message, context, history);
 */
export default function agentLoader(agentConfig, message, context, history) {
  // Validate required parameters
  if (!agentConfig) {
    throw new Error("agentConfig is required");
  }

  if (typeof message !== "string") {
    throw new Error("message must be a string");
  }

  if (typeof context !== "string") {
    throw new Error("context must be a string");
  }

  if (!Array.isArray(history)) {
    throw new Error("history must be an array");
  }

  // Merge with defaults
  const config = {
    ...DEFAULT_AGENT_CONFIG,
    ...agentConfig,
  };

  // Validate configuration
  validateAgentConfig(config);

  // Sanitize the message content
  const sanitizedMessage = sanitizeMessageContent(message);

  // Debug logging with configurable prefix
  console.log(
    `${config.debugPrefix} DEBUG - Original message:`,
    JSON.stringify(message)
  );
  console.log(
    `${config.debugPrefix} DEBUG - Sanitized message:`,
    JSON.stringify(sanitizedMessage)
  );

  // Handle context override or append current date to context if enabled
  let finalContext;
  if (config.contextOverride !== undefined) {
    // Use the override context, ignoring the context parameter
    finalContext = config.contextOverride;
    if (config.includeDateContext) {
      const dateString = getCurrentDateString();
      finalContext = finalContext + "The date today is: " + dateString;
    }
  } else {
    // Use the provided context parameter
    finalContext = context;
    if (config.includeDateContext) {
      const dateString = getCurrentDateString();
      finalContext = context + "The date today is: " + dateString;
    }
  }

  // Generate and return the callDetails object
  return generateCallDetails(config, sanitizedMessage, finalContext, history);
}
