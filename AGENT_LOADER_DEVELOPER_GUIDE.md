# Agent Loader Developer Guide

## Overview

This guide provides comprehensive instructions for creating new agents using the [`agentLoader`](src/utils/agentLoader.js) utility function. The agentLoader provides a standardized, configuration-driven approach to agent development that eliminates boilerplate code and ensures consistency across the agent ecosystem.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Agent Architecture](#agent-architecture)
3. [Configuration Schema](#configuration-schema)
4. [Creating Your First Agent](#creating-your-first-agent)
5. [Agent Types and Patterns](#agent-types-and-patterns)
6. [Advanced Configuration](#advanced-configuration)
7. [Testing Guidelines](#testing-guidelines)
8. [Best Practices](#best-practices)
9. [Performance Considerations](#performance-considerations)
10. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Agent Template

```javascript
import agentLoader from "../utils/agentLoader.js";

/**
 * Your Agent Description
 * @param {string} message - User message
 * @param {string} context - Message context
 * @param {Array} history - Message history
 * @returns {Object} - Standard callDetails object
 */
async function yourAgent(message, context, history) {
  const config = {
    systemPrompt: "I want you to act as...",
    provider: "groq",
    temperature: 0.8,
    // Add other configuration options as needed
  };

  return agentLoader(config, message, context, history);
}

export default yourAgent;
```

### Minimal Working Example

```javascript
import agentLoader from "../utils/agentLoader.js";

async function helpfulAssistant(message, context, history) {
  const config = {
    systemPrompt:
      "I want you to act as a helpful assistant that provides clear, concise answers.",
  };

  return agentLoader(config, message, context, history);
}

export default helpfulAssistant;
```

## Agent Architecture

### Standard Agent Structure

Every agent using agentLoader follows this structure:

```javascript
// 1. Import agentLoader
import agentLoader from "../utils/agentLoader.js";

// 2. Define agent function with standard signature
async function agentName(message, context, history) {
  // 3. Create configuration object
  const config = {
    // Agent-specific configuration
  };

  // 4. Return agentLoader result
  return agentLoader(config, message, context, history);
}

// 5. Export as default
export default agentName;
```

### CallDetails Object Structure

AgentLoader returns a standardized `callDetails` object:

```javascript
{
  callID: "uuid-v4-string",
  model: {
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    callType: "This is a chat Call",
    type: "completion",
    temperature: 0.8,
    // Optional fields based on configuration
    max_tokens: 4096,
    response_format: { type: "json_object" }
  },
  chat: {
    userPrompt: "sanitized user message",
    systemPrompt: "your system prompt",
    messageContext: "context with optional date",
    messageHistory: []
  },
  origin: {
    originID: "mock-origin-id",
    conversationID: "mock-conversation-id",
    channel: "mock-channel",
    channelSpace: "MOCK",
    gatewayUserID: "mock-user",
    billingID: "mock-billing",
    callTS: "2025-01-18T04:42:00.000Z"
  }
}
```

## Configuration Schema

### Required Configuration

| Field          | Type   | Description                                          |
| -------------- | ------ | ---------------------------------------------------- |
| `systemPrompt` | string | The system prompt that defines your agent's behavior |

### Model Configuration

| Field             | Type   | Default                 | Description                                          |
| ----------------- | ------ | ----------------------- | ---------------------------------------------------- |
| `provider`        | string | `"groq"`                | Model provider: `"groq"`, `"openai"`, `"openrouter"` |
| `model`           | string | Provider default        | Specific model name                                  |
| `callType`        | string | `"This is a chat Call"` | Description of the call type                         |
| `type`            | string | `"completion"`          | Response type: `"completion"`, `"json_object"`       |
| `temperature`     | number | `0.8`                   | Model temperature (0-2)                              |
| `max_tokens`      | number | undefined               | Maximum tokens (optional)                            |
| `response_format` | object | undefined               | For JSON output: `{ type: "json_object" }`           |

### Behavior Configuration

| Field                | Type    | Default     | Description                                             |
| -------------------- | ------- | ----------- | ------------------------------------------------------- |
| `includeDateContext` | boolean | `true`      | Whether to append current date to context               |
| `contextOverride`    | string  | undefined   | Override context completely (ignores context parameter) |
| `debugPrefix`        | string  | `"[Agent]"` | Prefix for debug logging                                |

### Advanced Configuration

| Field             | Type   | Default | Description                            |
| ----------------- | ------ | ------- | -------------------------------------- |
| `originOverrides` | object | `{}`    | Override specific origin object fields |

### Provider-Specific Defaults

#### Groq (Default)

```javascript
{
  provider: "groq",
  model: "meta-llama/llama-4-scout-17b-16e-instruct"
}
```

#### OpenAI

```javascript
{
  provider: "openai",
  model: "gpt-4o"
}
```

#### OpenRouter

```javascript
{
  provider: "openrouter",
  model: "anthropic/claude-sonnet-4"
}
```

## Creating Your First Agent

### Step 1: Define Your Agent's Purpose

Before writing code, clearly define:

- What your agent does
- What type of responses it should provide
- What model/provider is most suitable
- Any special requirements (JSON output, specific temperature, etc.)

### Step 2: Create the Agent File

Create a new file in the appropriate directory:

- Simple agents: `src/agents/yourAgent.js`
- Dialogue agents: `src/agents/dialogue/yourAgent.js`
- Panel agents: `src/agents/panel/yourAgent.js`
- Waterfall agents: `src/agents/waterfall/yourAgent.js`

### Step 3: Implement the Agent

```javascript
import agentLoader from "../../utils/agentLoader.js";

/**
 * Code Review Agent
 * Analyzes code and provides constructive feedback
 */
async function codeReviewAgent(message, context, history) {
  const config = {
    systemPrompt: `You are an expert code reviewer with years of experience in software development. 
    
    Your role is to:
    - Analyze code for bugs, security issues, and performance problems
    - Suggest improvements for readability and maintainability
    - Provide constructive feedback with specific examples
    - Follow best practices for the programming language being reviewed
    
    Always be helpful, specific, and educational in your responses.`,

    provider: "openrouter",
    model: "anthropic/claude-sonnet-4", // Good for code analysis
    temperature: 0.3, // Lower temperature for more focused analysis
    callType: "Code Review Analysis",
    debugPrefix: "[CodeReviewAgent]",
  };

  return agentLoader(config, message, context, history);
}

export default codeReviewAgent;
```

### Step 4: Create Tests

```javascript
// tests/agents/codeReviewAgent.test.js
import { describe, test, expect } from "@jest/globals";
import codeReviewAgent from "../../src/agents/codeReviewAgent.js";

describe("Code Review Agent", () => {
  test("should return valid callDetails structure", async () => {
    const message = "function add(a, b) { return a + b; }";
    const context = "Please review this JavaScript function";
    const history = [];

    const result = await codeReviewAgent(message, context, history);

    expect(result).toHaveProperty("callID");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("chat");
    expect(result).toHaveProperty("origin");

    expect(result.model.provider).toBe("openrouter");
    expect(result.model.model).toBe("anthropic/claude-sonnet-4");
    expect(result.model.temperature).toBe(0.3);
    expect(result.chat.systemPrompt).toContain("code reviewer");
  });

  test("should handle empty message gracefully", async () => {
    const result = await codeReviewAgent("", "context", []);
    expect(result.chat.userPrompt).toBe("");
  });
});
```

## Agent Types and Patterns

### 1. Simple Chat Agents

**Use Case**: Basic conversational agents, assistants, simple analysis

```javascript
async function chatAgent(message, context, history) {
  const config = {
    systemPrompt: "You are a helpful assistant...",
    provider: "groq", // Cost-effective for simple tasks
    temperature: 0.8, // Higher for conversational responses
    includeDateContext: true, // Often useful for chat
  };

  return agentLoader(config, message, context, history);
}
```

### 2. Analysis Agents

**Use Case**: Content analysis, data processing, structured output

```javascript
async function analysisAgent(message, context, history) {
  const config = {
    systemPrompt: "You are an expert analyst...",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4", // Good for analysis
    temperature: 0.3, // Lower for focused analysis
    type: "json_object", // Structured output
    response_format: { type: "json_object" },
    includeDateContext: false, // Analysis is usually timeless
  };

  return agentLoader(config, message, context, history);
}
```

### 3. Creative Agents

**Use Case**: Content generation, creative writing, brainstorming

```javascript
async function creativeAgent(message, context, history) {
  const config = {
    systemPrompt: "You are a creative writer...",
    provider: "openrouter",
    model: "x-ai/grok-4", // Good for creative tasks
    temperature: 0.9, // Higher for creativity
    max_tokens: 4096, // Longer outputs for creative content
  };

  return agentLoader(config, message, context, history);
}
```

### 4. Specialized Domain Agents

**Use Case**: Domain-specific expertise (legal, medical, technical)

```javascript
async function technicalAgent(message, context, history) {
  const config = {
    systemPrompt: `You are a senior software architect with expertise in:
    - System design and architecture patterns
    - Performance optimization
    - Security best practices
    - Scalability considerations
    
    Provide detailed, technical responses with practical examples.`,

    provider: "openai",
    model: "gpt-4o", // Good for technical accuracy
    temperature: 0.4, // Balanced for technical content
    debugPrefix: "[TechnicalAgent]",
  };

  return agentLoader(config, message, context, history);
}
```

### 5. Pipeline Agents

**Use Case**: Agents that work in sequence or parallel within pipelines

```javascript
async function pipelineAgent(message, context, history) {
  const config = {
    systemPrompt: "You are part of a content processing pipeline...",
    provider: "groq",
    temperature: 0.7,
    includeDateContext: false, // Pipeline context is usually provided
    originOverrides: {
      channel: "content-pipeline",
      channelSpace: "PIPELINE",
      gatewayUserID: "pipeline-agent",
    },
  };

  return agentLoader(config, message, context, history);
}
```

## Advanced Configuration

### Custom Origin Configuration

For agents that need specific origin metadata:

```javascript
const config = {
  systemPrompt: "Your prompt",
  originOverrides: {
    conversationID: "custom-conversation-id",
    channel: "specialized-channel",
    channelSpace: "CUSTOM",
    gatewayUserID: "specialized-user",
    billingID: "premium-tier",
  },
};
```

### Context Override

For agents that need to ignore the provided context:

```javascript
const config = {
  systemPrompt: "Your prompt",
  contextOverride: "", // Ignores context parameter
  includeDateContext: false, // No date appending
};
```

### JSON Output Configuration

For agents that need structured JSON responses:

```javascript
const config = {
  systemPrompt: `Your prompt. Always respond with valid JSON in this format:
  {
    "analysis": "your analysis here",
    "confidence": 0.95,
    "recommendations": ["rec1", "rec2"]
  }`,
  type: "json_object",
  response_format: { type: "json_object" },
  temperature: 0.5, // Lower temperature for structured output
};
```

### Multi-Model Strategy

For agents that might use different models based on conditions:

```javascript
async function adaptiveAgent(message, context, history) {
  // Choose model based on message complexity
  const isComplex = message.length > 1000 || context.includes("complex");

  const config = {
    systemPrompt: "You are an adaptive assistant...",
    provider: "openrouter",
    model: isComplex ? "anthropic/claude-sonnet-4" : "openai/gpt-4o",
    temperature: isComplex ? 0.3 : 0.7,
  };

  return agentLoader(config, message, context, history);
}
```

## Testing Guidelines

### 1. Unit Tests

Test your agent's configuration and basic functionality:

```javascript
import { describe, test, expect } from "@jest/globals";
import yourAgent from "../../src/agents/yourAgent.js";

describe("Your Agent", () => {
  test("should have correct configuration", async () => {
    const result = await yourAgent("test", "context", []);

    expect(result.model.provider).toBe("expected-provider");
    expect(result.model.temperature).toBe(0.8);
    expect(result.chat.systemPrompt).toContain("expected-content");
  });

  test("should handle edge cases", async () => {
    // Test empty inputs
    const result1 = await yourAgent("", "", []);
    expect(result1).toBeDefined();

    // Test special characters
    const result2 = await yourAgent(
      'Message with "quotes" and \n newlines',
      "context",
      []
    );
    expect(result2.chat.userPrompt).toContain('\\"');
  });
});
```

### 2. Integration Tests

Test your agent within its intended pipeline or workflow:

```javascript
describe("Agent Integration", () => {
  test("should work in pipeline context", async () => {
    const pipelineResult = await yourPipeline({
      message: "test input",
      agents: [yourAgent],
    });

    expect(pipelineResult.success).toBe(true);
  });
});
```

### 3. Performance Tests

For agents with specific performance requirements:

```javascript
describe("Agent Performance", () => {
  test("should complete within time limit", async () => {
    const start = Date.now();
    await yourAgent("test message", "context", []);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });
});
```

### 4. Configuration Validation Tests

Test that your agent handles configuration errors properly:

```javascript
describe("Configuration Validation", () => {
  test("should validate required fields", () => {
    expect(() => {
      agentLoader({}, "message", "context", []);
    }).toThrow("Agent configuration must include a systemPrompt");
  });
});
```

## Best Practices

### 1. System Prompt Design

**Be Specific and Clear**:

```javascript
// Good: Specific and actionable
systemPrompt: `You are a technical documentation reviewer. Your role is to:
- Check for clarity and accuracy
- Identify missing information
- Suggest improvements for readability
- Ensure examples are correct and helpful

Always provide specific, actionable feedback.`;

// Avoid: Vague and generic
systemPrompt: "You are helpful and review documents.";
```

**Include Examples When Helpful**:

```javascript
systemPrompt: `You are a JSON formatter. Convert natural language to JSON.

Example:
Input: "John is 25 years old and lives in New York"
Output: {"name": "John", "age": 25, "city": "New York"}

Always respond with valid JSON only.`;
```

### 2. Model Selection

**Choose Based on Task Requirements**:

- **Groq**: Cost-effective, fast, good for simple tasks
- **OpenAI**: Balanced performance, good for general tasks
- **OpenRouter**: Access to latest models, good for specialized tasks

```javascript
// For simple chat
provider: "groq",
model: "meta-llama/llama-4-scout-17b-16e-instruct"

// For complex analysis
provider: "openrouter",
model: "anthropic/claude-sonnet-4"

// For creative tasks
provider: "openrouter",
model: "x-ai/grok-4"
```

### 3. Temperature Settings

**Match Temperature to Task**:

```javascript
// Factual/analytical tasks
temperature: 0.1 - 0.3;

// Balanced tasks
temperature: 0.5 - 0.7;

// Creative/conversational tasks
temperature: 0.8 - 1.0;

// Highly creative tasks
temperature: 1.0 - 1.2;
```

### 4. Error Handling

**Implement Graceful Error Handling**:

```javascript
async function robustAgent(message, context, history) {
  try {
    const config = {
      systemPrompt: "Your prompt",
      // ... configuration
    };

    return agentLoader(config, message, context, history);
  } catch (error) {
    console.error(`[RobustAgent] Error: ${error.message}`);

    // Return a fallback response or re-throw
    throw new Error(`Agent failed: ${error.message}`);
  }
}
```

### 5. Configuration Management

**Use Constants for Reusable Configurations**:

```javascript
// agents/config/constants.js
export const ANALYSIS_CONFIG = {
  provider: "openrouter",
  model: "anthropic/claude-sonnet-4",
  temperature: 0.3,
  type: "json_object",
  response_format: { type: "json_object" },
};

// agents/analysisAgent.js
import { ANALYSIS_CONFIG } from "./config/constants.js";

async function analysisAgent(message, context, history) {
  const config = {
    ...ANALYSIS_CONFIG,
    systemPrompt: "Your specific analysis prompt",
  };

  return agentLoader(config, message, context, history);
}
```

### 6. Documentation

**Document Your Agent Thoroughly**:

```javascript
/**
 * Content Summarization Agent
 *
 * Analyzes long-form content and creates concise summaries with key points.
 * Optimized for articles, reports, and documentation.
 *
 * @param {string} message - The content to summarize
 * @param {string} context - Additional context about the content type
 * @param {Array} history - Previous interactions (usually empty for summarization)
 * @returns {Object} callDetails object with summarization request
 *
 * @example
 * const summary = await contentSummarizer(articleText, "news article", []);
 *
 * Configuration:
 * - Provider: OpenRouter (for advanced reasoning)
 * - Model: Claude Sonnet 4 (excellent for summarization)
 * - Temperature: 0.4 (balanced for accuracy and readability)
 * - Max tokens: 2048 (allows for detailed summaries)
 */
async function contentSummarizer(message, context, history) {
  // Implementation
}
```

## Performance Considerations

### 1. Model Selection Impact

Different models have different performance characteristics:

```javascript
// Fast but less capable
provider: "groq",
model: "meta-llama/llama-4-scout-17b-16e-instruct"

// Balanced performance
provider: "openai",
model: "gpt-4o"

// High quality but potentially slower
provider: "openrouter",
model: "anthropic/claude-sonnet-4"
```

### 2. Configuration Caching

Cache configuration objects for frequently used agents:

```javascript
const CACHED_CONFIG = {
  systemPrompt: "Your prompt",
  provider: "groq",
  temperature: 0.8,
};

async function efficientAgent(message, context, history) {
  // Reuse cached configuration
  return agentLoader(CACHED_CONFIG, message, context, history);
}
```

### 3. Token Management

Control token usage for cost and performance:

```javascript
const config = {
  systemPrompt: "Concise prompt for efficiency",
  max_tokens: 1024, // Limit response length
  temperature: 0.5, // Lower temperature can be more efficient
};
```

### 4. Monitoring

Add performance monitoring to your agents:

```javascript
async function monitoredAgent(message, context, history) {
  const start = Date.now();

  try {
    const result = await agentLoader(config, message, context, history);
    const duration = Date.now() - start;

    console.log(`[MonitoredAgent] Completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(
      `[MonitoredAgent] Failed after ${duration}ms: ${error.message}`
    );
    throw error;
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "Agent configuration must include a systemPrompt"

**Cause**: Missing or empty systemPrompt

**Solution**:

```javascript
const config = {
  systemPrompt: "Your system prompt here", // Must be non-empty
  // ... other config
};
```

#### 2. "Unsupported provider: xyz"

**Cause**: Invalid provider name

**Solution**: Use supported providers:

```javascript
provider: "groq" | "openai" | "openrouter";
```

#### 3. "Temperature must be between 0 and 2"

**Cause**: Invalid temperature value

**Solution**:

```javascript
temperature: 0.8, // Must be 0 <= temperature <= 2
```

#### 4. Unexpected JSON Output

**Cause**: Missing response_format configuration

**Solution**:

```javascript
const config = {
  type: "json_object",
  response_format: { type: "json_object" },
  systemPrompt: "Always respond with valid JSON...",
};
```

#### 5. Debug Logs Not Appearing

**Cause**: Missing or incorrect debug prefix

**Solution**:

```javascript
const config = {
  debugPrefix: "[YourAgent]", // Will appear in console
};
```

### Debugging Tips

#### 1. Enable Verbose Logging

```javascript
const config = {
  debugPrefix: "[DEBUG-YourAgent]",
  // ... other config
};

// AgentLoader will log:
// [DEBUG-YourAgent] DEBUG - Original message: "..."
// [DEBUG-YourAgent] DEBUG - Sanitized message: "..."
```

#### 2. Validate Configuration

```javascript
async function debugAgent(message, context, history) {
  const config = {
    systemPrompt: "Your prompt",
    // ... configuration
  };

  console.log("Agent config:", JSON.stringify(config, null, 2));

  return agentLoader(config, message, context, history);
}
```

#### 3. Test with Simple Inputs

```javascript
// Test with minimal input first
const result = await yourAgent("hello", "", []);
console.log("Basic test result:", result);
```

### Performance Issues

#### 1. Slow Response Times

**Check**:

- Model selection (some models are slower)
- Token limits (higher limits can be slower)
- Network connectivity

**Solutions**:

```javascript
// Use faster model for development
provider: "groq", // Generally faster

// Limit tokens for faster responses
max_tokens: 1024,

// Lower temperature can be faster
temperature: 0.5,
```

#### 2. High Token Usage

**Solutions**:

```javascript
// Shorter system prompts
systemPrompt: "Concise instructions",

// Token limits
max_tokens: 512,

// More focused prompts
systemPrompt: "Answer in 2-3 sentences maximum",
```

## Advanced Patterns

### 1. Conditional Configuration

```javascript
async function adaptiveAgent(message, context, history) {
  const isLongContent = message.length > 2000;
  const needsAnalysis = context.includes("analyze");

  const config = {
    systemPrompt: needsAnalysis
      ? "You are an analytical agent..."
      : "You are a conversational agent...",
    provider: isLongContent ? "openrouter" : "groq",
    model: isLongContent ? "anthropic/claude-sonnet-4" : undefined,
    temperature: needsAnalysis ? 0.3 : 0.8,
    max_tokens: isLongContent ? 4096 : 2048,
  };

  return agentLoader(config, message, context, history);
}
```

### 2. Agent Composition

```javascript
async function compositeAgent(message, context, history) {
  // First pass: analysis
  const analysisConfig = {
    systemPrompt: "Analyze this content and extract key themes",
    temperature: 0.3,
  };

  const analysis = await agentLoader(analysisConfig, message, context, []);

  // Second pass: response based on analysis
  const responseConfig = {
    systemPrompt: "Based on the analysis, provide a helpful response",
    temperature: 0.7,
  };

  const analysisContext = `Analysis: ${JSON.stringify(analysis)}`;
  return agentLoader(responseConfig, message, analysisContext, history);
}
```

### 3. Fallback Strategies

```javascript
async function resilientAgent(message, context, history) {
  const primaryConfig = {
    systemPrompt: "Your primary prompt",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
  };

  try {
    return await agentLoader(primaryConfig, message, context, history);
  } catch (error) {
    console.warn(`Primary model failed: ${error.message}, falling back`);

    const fallbackConfig = {
      ...primaryConfig,
      provider: "groq",
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    };

    return agentLoader(fallbackConfig, message, context, history);
  }
}
```

---

## Summary

The agentLoader provides a powerful, flexible foundation for creating new agents with minimal boilerplate code. Key benefits include:

- **Consistency**: Standardized configuration and output format
- **Flexibility**: Support for various models, providers, and use cases
- **Maintainability**: Centralized common functionality
- **Testing**: Built-in validation and error handling

Follow the patterns and best practices in this guide to create robust, efficient agents that integrate seamlessly with the existing agent ecosystem.

For additional help, refer to:

- [Agent Loader Migration Guide](AGENT_LOADER_MIGRATION_GUIDE.md) for migrating existing agents
- [Agent Loader Implementation Report](AGENT_LOADER_IMPLEMENTATION_REPORT.md) for technical details
- Existing agent implementations in the codebase for real-world examples
