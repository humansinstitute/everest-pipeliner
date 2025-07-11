import { jest } from "@jest/globals";

// Global test setup
console.log("Setting up Jest test environment for Pipeliner...");

// Mock environment variables for tests
process.env.EVEREST_API_BASE = "https://test.api.com/";
process.env.EVEREST_API = "test-api-key";
process.env.NODE_ENV = "test";

// Global fetch mock setup
global.fetch = jest.fn();

// Console override for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Only show console output if TEST_VERBOSE is set
if (!process.env.TEST_VERBOSE) {
  console.log = jest.fn();
  console.error = jest.fn();
}

// Restore console for specific test debugging
global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
};

// Helper to create mock Everest API responses
global.createMockEverestResponse = (overrides = {}) => {
  return {
    callID: "test-call-id-123",
    response: {
      content: "Test response content",
    },
    usage: {
      tokens: 100,
      costs: {
        total: 0.001,
      },
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
};

// Helper to create mock agent configurations
global.createMockAgentConfig = (overrides = {}) => {
  return {
    callID: "test-agent-call-id",
    model: {
      provider: "test",
      model: "test-model",
      temperature: 0.7,
    },
    chat: {
      userPrompt: "Test user prompt",
      systemPrompt: "Test system prompt",
      messageContext: "Test context",
      messageHistory: [],
    },
    origin: {
      originID: "test-origin",
      callTS: new Date().toISOString(),
    },
    ...overrides,
  };
};

console.log("Jest setup complete");
