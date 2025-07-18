# Agent Loader Migration Guide

## Overview

This guide provides step-by-step instructions for migrating existing agents to use the new [`agentLoader`](src/utils/agentLoader.js) utility function. The agentLoader consolidates common agent functionality, eliminates code duplication, and provides a consistent configuration-driven approach while maintaining 100% backward compatibility.

## Table of Contents

1. [Migration Benefits](#migration-benefits)
2. [Before You Start](#before-you-start)
3. [Migration Patterns](#migration-patterns)
4. [Step-by-Step Migration Process](#step-by-step-migration-process)
5. [Configuration Reference](#configuration-reference)
6. [Common Migration Scenarios](#common-migration-scenarios)
7. [Troubleshooting](#troubleshooting)
8. [Testing Your Migration](#testing-your-migration)
9. [Best Practices](#best-practices)

## Migration Benefits

### Code Reduction

- **60-80% reduction** in lines of code per agent
- Eliminates ~100 lines of duplicated boilerplate per agent
- Centralized common functionality

### Consistency

- Standardized configuration approach
- Unified error handling and validation
- Consistent debug logging patterns

### Maintainability

- Single source of truth for common agent patterns
- Easier to add new features across all agents
- Simplified testing and debugging

## Before You Start

### Prerequisites

1. **Understand Your Agent**: Review your existing agent implementation
2. **Identify Configuration**: Extract agent-specific parameters
3. **Note Quirks**: Document any unique behaviors to preserve
4. **Create Tests**: Establish baseline tests before migration

### Required Files

Ensure these files exist in your project:

- [`src/utils/agentLoader.js`](src/utils/agentLoader.js) - Main agentLoader function
- [`src/utils/agentDefaults.js`](src/utils/agentDefaults.js) - Default configurations

## Migration Patterns

### Pattern 1: Standard agentLoader (Recommended)

**Use for**: Most agents with standard requirements

```javascript
import agentLoader from "../../utils/agentLoader.js";

async function myAgent(message, context, history) {
  const config = {
    systemPrompt: "Your agent-specific prompt here",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0.8,
    // ... other configuration options
  };

  return agentLoader(config, message, context, history);
}

export default myAgent;
```

### Pattern 2: Helper Functions (For Special Cases)

**Use for**: Agents with unique sanitization or complex requirements

```javascript
import {
  generateCallDetails,
  generateOriginObject,
} from "../../utils/agentLoader.js";

async function mySpecialAgent(message, context, history) {
  const config = {
    provider: "openrouter",
    model: "openai/gpt-4.1",
    systemPrompt: "Your prompt",
    temperature: 0.7,
    response_format: { type: "json_object" },
  };

  // Custom message handling if needed
  const userPrompt = customSanitization(message);

  // Generate callDetails with custom handling
  const callDetails = generateCallDetails(config, userPrompt, context, history);

  // Apply custom overrides
  callDetails.origin = generateOriginObject({
    conversationID: "custom-id",
    // ... other overrides
  });

  return callDetails;
}
```

## Step-by-Step Migration Process

### Step 1: Analyze Your Current Agent

1. **Identify the system prompt**:

   ```javascript
   // Look for patterns like:
   const systemPromptInput = "I want you to act as...";
   ```

2. **Extract model configuration**:

   ```javascript
   // Find model settings:
   provider: "groq",
   model: "meta-llama/llama-4-scout-17b-16e-instruct",
   temperature: 0.8,
   type: "completion",
   ```

3. **Note special behaviors**:
   - Date context handling
   - Custom sanitization
   - Origin overrides
   - Debug prefixes

### Step 2: Create Configuration Object

Transform your extracted parameters into an agentLoader configuration:

```javascript
const agentConfig = {
  // Required
  systemPrompt: "Your extracted system prompt",

  // Model Configuration
  provider: "groq", // or "openai", "openrouter"
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  callType: "This is a chat Call",
  type: "completion", // or "json_object"
  temperature: 0.8,

  // Optional Features
  includeDateContext: true, // if agent appends date
  debugPrefix: "[YourAgent]", // for debug logging
  contextOverride: "", // if agent ignores context

  // Origin Overrides (if needed)
  originOverrides: {
    conversationID: "custom-conversation-id",
    billingID: "custom-billing-id",
  },
};
```

### Step 3: Replace Agent Implementation

**Before** (typical 100+ lines):

```javascript
import { v4 as uuidv4 } from "uuid";

const dayToday = new Date().toLocaleDateString("en-AU", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function sanitizeMessageContent(message) {
  // 15 lines of sanitization logic
}

async function myAgent(message, context, history) {
  const sanitizedMessage = sanitizeMessageContent(message);

  console.log("[MyAgent] DEBUG - Original message:", JSON.stringify(message));
  console.log(
    "[MyAgent] DEBUG - Sanitized message:",
    JSON.stringify(sanitizedMessage)
  );

  const systemPromptInput = "I want you to act as...";
  context = context + "The date today is: " + dayToday;

  const callDetails = {
    callID: uuidv4(),
    model: {
      provider: "groq",
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      callType: "This is a chat Call",
      type: "completion",
      temperature: 0.8,
    },
    chat: {
      userPrompt: sanitizedMessage,
      systemPrompt: systemPromptInput,
      messageContext: context,
      messageHistory: history,
    },
    origin: {
      // 15+ lines of origin configuration
    },
  };

  return callDetails;
}

export default myAgent;
```

**After** (typically 20-30 lines):

```javascript
import agentLoader from "../../utils/agentLoader.js";

async function myAgent(message, context, history) {
  const config = {
    systemPrompt: "I want you to act as...",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    callType: "This is a chat Call",
    type: "completion",
    temperature: 0.8,
    includeDateContext: true,
    debugPrefix: "[MyAgent]",
  };

  return agentLoader(config, message, context, history);
}

export default myAgent;
```

### Step 4: Preserve Original Quirks

If your original agent has quirks that must be preserved for compatibility:

```javascript
const config = {
  systemPrompt: "Your prompt",
  provider: "groq",
  temperature: 0.5,

  // Preserve original quirks
  debugPrefix: "[ConversationAgent]", // Even if this is intentAgent
  contextOverride: "", // If agent ignores context parameter
  includeDateContext: false, // If agent never includes date
};
```

### Step 5: Test Your Migration

Create comprehensive tests to validate your migration:

```javascript
import { describe, test, expect } from "@jest/globals";
import originalAgent from "../path/to/original/agent.js";
import migratedAgent from "../path/to/migrated/agent.js";

describe("Agent Migration Validation", () => {
  test("should produce identical structure", async () => {
    const message = "Test message";
    const context = "Test context";
    const history = [];

    const originalResult = await originalAgent(message, context, history);
    const migratedResult = await migratedAgent(message, context, history);

    // Compare structure (excluding dynamic fields like callID, timestamps)
    expect(migratedResult.model).toEqual(originalResult.model);
    expect(migratedResult.chat.systemPrompt).toEqual(
      originalResult.chat.systemPrompt
    );
    expect(migratedResult.chat.messageContext).toEqual(
      originalResult.chat.messageContext
    );
  });
});
```

## Configuration Reference

### Core Configuration Options

| Option         | Type   | Default                 | Description                                          |
| -------------- | ------ | ----------------------- | ---------------------------------------------------- |
| `systemPrompt` | string | **Required**            | The system prompt for your agent                     |
| `provider`     | string | `"groq"`                | Model provider: `"groq"`, `"openai"`, `"openrouter"` |
| `model`        | string | Provider default        | Specific model name                                  |
| `callType`     | string | `"This is a chat Call"` | Description of the call type                         |
| `type`         | string | `"completion"`          | Response type: `"completion"`, `"json_object"`       |
| `temperature`  | number | `0.8`                   | Model temperature (0-2)                              |
| `max_tokens`   | number | undefined               | Maximum tokens (optional)                            |

### Context and Behavior Options

| Option               | Type    | Default     | Description                                             |
| -------------------- | ------- | ----------- | ------------------------------------------------------- |
| `includeDateContext` | boolean | `true`      | Whether to append current date to context               |
| `contextOverride`    | string  | undefined   | Override context completely (ignores context parameter) |
| `debugPrefix`        | string  | `"[Agent]"` | Prefix for debug logging                                |

### Advanced Options

| Option            | Type   | Default   | Description                                |
| ----------------- | ------ | --------- | ------------------------------------------ |
| `response_format` | object | undefined | For JSON output: `{ type: "json_object" }` |
| `originOverrides` | object | `{}`      | Override specific origin object fields     |

### Provider-Specific Models

#### Groq (Default)

```javascript
{
  provider: "groq",
  model: "meta-llama/llama-4-scout-17b-16e-instruct" // default
}
```

#### OpenAI

```javascript
{
  provider: "openai",
  model: "gpt-4o" // default
}
```

#### OpenRouter

```javascript
{
  provider: "openrouter",
  model: "anthropic/claude-sonnet-4" // default
}
```

## Common Migration Scenarios

### Scenario 1: Simple Chat Agent

**Original Pattern**:

```javascript
// Basic chat agent with date context
async function conversationAgent(message, context, history) {
  // 95 lines of boilerplate code
}
```

**Migration**:

```javascript
import agentLoader from "../../utils/agentLoader.js";

async function conversationAgent(message, context, history) {
  const config = {
    systemPrompt:
      "I want you to act as a friendly and knowledgeable agent called The Beacon.",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0.8,
    includeDateContext: true,
    debugPrefix: "[ConversationAgent]",
  };

  return agentLoader(config, message, context, history);
}

export default conversationAgent;
```

### Scenario 2: JSON Response Agent

**Original Pattern**:

```javascript
// Agent that returns JSON objects
async function intentAgent(message, context, history) {
  // 102 lines with json_object type and context override
}
```

**Migration**:

```javascript
import agentLoader from "../../utils/agentLoader.js";

async function intentAgent(message, context, history) {
  const config = {
    systemPrompt:
      "I would like you to analyse a particular conversation for intent...",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    type: "json_object",
    temperature: 0.5,
    includeDateContext: false,
    contextOverride: "", // Ignores context parameter
    debugPrefix: "[ConversationAgent]", // Preserve original quirk
  };

  return agentLoader(config, message, context, history);
}

export default intentAgent;
```

### Scenario 3: Panel Agent with Custom Origin

**Original Pattern**:

```javascript
// Panel agent with specific origin configuration
async function panel1_challenger(message, context, history) {
  // 100+ lines with panel-specific origin fields
}
```

**Migration**:

```javascript
import agentLoader from "../../utils/agentLoader.js";

async function panel1_challenger(message, context, history) {
  const config = {
    systemPrompt: "You are 'The Challenger'...",
    provider: "openrouter",
    model: "x-ai/grok-4",
    temperature: 0.8,
    includeDateContext: false,
    originOverrides: {
      channel: "panel-pipeline",
      channelSpace: "PANEL",
      gatewayUserID: "panel-challenger",
      billingID: "panel-discussion",
      conversationID: "panel-challenger",
    },
  };

  return agentLoader(config, message, context, history);
}

export default panel1_challenger;
```

### Scenario 4: Waterfall Agent with Special Requirements

**Original Pattern**:

```javascript
// Waterfall agent with custom sanitization and JSON output
async function contentAnalyzer(message, context, history) {
  // 115 lines with unique sanitization and waterfall-specific config
}
```

**Migration** (using helper functions):

```javascript
import {
  generateCallDetails,
  generateOriginObject,
} from "../../utils/agentLoader.js";

async function contentAnalyzer(message, context, history) {
  const systemPrompt = `You are a content analyzer...`;

  const config = {
    provider: "openrouter",
    model: "openai/gpt-4.1",
    callType: "chat",
    type: "completion",
    temperature: 0.7,
    response_format: { type: "json_object" },
    systemPrompt,
  };

  // Custom sanitization (preserves newlines)
  const userPrompt = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const origin = generateOriginObject({
    originID: "1111-2222-3333-4444",
    conversationID: "waterfall-contentAnalyzer",
    channel: "waterfall-pipeline",
    channelSpace: "WATERFALL",
    gatewayUserID: "waterfall-user",
    billingID: "waterfall-content",
  });

  const callDetails = generateCallDetails(config, userPrompt, "", []);
  callDetails.callID = `contentAnalyzer-${Date.now()}`;
  callDetails.origin = origin;
  callDetails.chat.messageHistory = [];

  return callDetails;
}

export default contentAnalyzer;
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Agent configuration must include a systemPrompt"

**Cause**: Missing or empty systemPrompt in configuration

**Solution**:

```javascript
const config = {
  systemPrompt: "Your system prompt here", // Must be non-empty string
  // ... other config
};
```

#### Issue: "Unsupported provider: xyz"

**Cause**: Invalid provider specified

**Solution**: Use supported providers:

```javascript
const config = {
  provider: "groq", // or "openai", "openrouter"
  // ... other config
};
```

#### Issue: "Temperature must be between 0 and 2"

**Cause**: Invalid temperature value

**Solution**:

```javascript
const config = {
  temperature: 0.8, // Must be 0 <= temperature <= 2
  // ... other config
};
```

#### Issue: Tests failing due to structure differences

**Cause**: Dynamic fields (callID, timestamps) differ between runs

**Solution**: Compare static fields only:

```javascript
// Don't compare these dynamic fields:
// - callDetails.callID (always unique)
// - callDetails.origin.callTS (always current timestamp)

// Do compare these static fields:
expect(result.model.provider).toBe(expected.model.provider);
expect(result.chat.systemPrompt).toBe(expected.chat.systemPrompt);
```

#### Issue: Date context not working as expected

**Cause**: Incorrect `includeDateContext` setting

**Solution**:

```javascript
const config = {
  includeDateContext: true, // Appends date to context
  // OR
  includeDateContext: false, // No date appending
};
```

#### Issue: Debug logs not appearing

**Cause**: Missing or incorrect debug prefix

**Solution**:

```javascript
const config = {
  debugPrefix: "[YourAgent]", // Will appear in console logs
};
```

### Migration Test Failures

#### Whitespace Differences

**Symptom**: Tests fail on exact string comparison of system prompts

**Cause**: Template literal formatting vs string concatenation differences

**Solution**: Focus on functional equivalence rather than exact string matching:

```javascript
// Instead of exact match:
expect(result.chat.systemPrompt).toBe(expected.chat.systemPrompt);

// Use functional validation:
expect(result.chat.systemPrompt).toContain("key phrases from your prompt");
expect(result.chat.systemPrompt.length).toBeGreaterThan(100);
```

#### UUID Format Issues

**Symptom**: callID format doesn't match original

**Cause**: Different UUID generation patterns

**Solution**: Validate UUID format rather than exact value:

```javascript
// Validate UUID format
expect(result.callID).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
);
```

## Testing Your Migration

### 1. Create Baseline Tests

Before migration, create tests that capture your agent's current behavior:

```javascript
// tests/agents/myAgent.baseline.test.js
import myAgent from "../src/agents/myAgent.js";

describe("MyAgent Baseline", () => {
  test("should handle basic message", async () => {
    const result = await myAgent("Hello", "context", []);

    // Save this structure for comparison
    expect(result).toHaveProperty("callID");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("chat");
    expect(result).toHaveProperty("origin");
  });
});
```

### 2. Create Migration Tests

After migration, create tests that compare old vs new behavior:

```javascript
// tests/agents/myAgent.migration.test.js
import originalAgent from "../backup/myAgent.original.js";
import migratedAgent from "../src/agents/myAgent.js";

describe("MyAgent Migration", () => {
  test("should produce identical structure", async () => {
    const message = "Test message";
    const context = "Test context";
    const history = [];

    const original = await originalAgent(message, context, history);
    const migrated = await migratedAgent(message, context, history);

    // Compare structure (excluding dynamic fields)
    expect(migrated.model).toEqual(original.model);
    expect(migrated.chat.systemPrompt).toEqual(original.chat.systemPrompt);
    expect(migrated.chat.messageContext).toEqual(original.chat.messageContext);
  });
});
```

### 3. Integration Tests

Ensure your migrated agent works in its pipeline context:

```javascript
// tests/pipelines/myPipeline.integration.test.js
import myPipeline from "../src/pipelines/myPipeline.js";

describe("Pipeline Integration", () => {
  test("should work with migrated agents", async () => {
    const result = await myPipeline({
      message: "Test input",
      // ... other pipeline parameters
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
```

## Best Practices

### 1. Migration Strategy

- **Start Small**: Begin with simple agents (conversationAgent, intentAgent)
- **One at a Time**: Migrate agents individually to isolate issues
- **Test Thoroughly**: Create comprehensive tests before and after migration
- **Preserve Quirks**: Maintain original behaviors for backward compatibility

### 2. Configuration Management

- **Be Explicit**: Specify all configuration options clearly
- **Document Choices**: Comment on non-obvious configuration decisions
- **Group Related**: Keep similar agents' configurations consistent

```javascript
// Good: Explicit and documented
const config = {
  systemPrompt: "I want you to act as a helpful assistant",
  provider: "groq", // Using groq for cost efficiency
  temperature: 0.8, // Higher temperature for creative responses
  includeDateContext: true, // Agent needs current date awareness
  debugPrefix: "[ConversationAgent]", // Preserve original debug format
};
```

### 3. Error Handling

- **Validate Early**: Let agentLoader validate configuration
- **Handle Gracefully**: Provide meaningful error messages
- **Test Edge Cases**: Validate error conditions

```javascript
async function myAgent(message, context, history) {
  try {
    const config = {
      systemPrompt: "Your prompt",
      // ... configuration
    };

    return agentLoader(config, message, context, history);
  } catch (error) {
    console.error(`[MyAgent] Configuration error: ${error.message}`);
    throw error;
  }
}
```

### 4. Documentation

- **Update Comments**: Reflect new architecture in code comments
- **Document Changes**: Note what was changed and why
- **Maintain Examples**: Keep usage examples current

### 5. Performance Considerations

- **Monitor Impact**: Watch for performance changes after migration
- **Cache Configurations**: Reuse configuration objects when possible
- **Profile Critical Paths**: Ensure no regression in critical pipelines

```javascript
// Good: Reuse configuration object
const AGENT_CONFIG = {
  systemPrompt: "Your prompt",
  provider: "groq",
  temperature: 0.8,
};

async function myAgent(message, context, history) {
  return agentLoader(AGENT_CONFIG, message, context, history);
}
```

### 6. Rollback Plan

- **Keep Backups**: Save original implementations
- **Feature Flags**: Use flags to switch between old/new implementations
- **Monitor Metrics**: Track success rates and performance

```javascript
// Example rollback strategy
const USE_AGENT_LOADER = process.env.USE_AGENT_LOADER !== "false";

async function myAgent(message, context, history) {
  if (USE_AGENT_LOADER) {
    return migratedImplementation(message, context, history);
  } else {
    return originalImplementation(message, context, history);
  }
}
```

## Migration Checklist

Use this checklist to ensure complete migration:

### Pre-Migration

- [ ] Understand current agent behavior
- [ ] Extract configuration parameters
- [ ] Identify unique behaviors/quirks
- [ ] Create baseline tests
- [ ] Backup original implementation

### Migration

- [ ] Create agentLoader configuration
- [ ] Replace implementation with agentLoader call
- [ ] Preserve original quirks if needed
- [ ] Update imports and dependencies
- [ ] Test basic functionality

### Post-Migration

- [ ] Run migration tests
- [ ] Validate backward compatibility
- [ ] Test integration with pipelines
- [ ] Update documentation
- [ ] Monitor performance
- [ ] Clean up old code (after validation)

### Validation

- [ ] All tests passing
- [ ] No functional regressions
- [ ] Performance within acceptable range
- [ ] Team review completed
- [ ] Ready for production deployment

---

## Need Help?

If you encounter issues during migration:

1. **Check the Configuration Reference** above for correct parameter usage
2. **Review Common Migration Scenarios** for similar patterns
3. **Consult the Troubleshooting section** for known issues
4. **Examine existing migrated agents** in the codebase for examples
5. **Run the test suite** to identify specific compatibility issues

The agentLoader migration provides significant benefits in code maintainability and consistency while preserving all existing functionality. Take your time with each migration and test thoroughly to ensure a smooth transition.
