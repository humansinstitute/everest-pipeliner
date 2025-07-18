/**
 * Unit tests for agentLoader utility function
 *
 * These tests validate all functionality of the agentLoader utility,
 * including individual utility functions and the main agentLoader function.
 */

import agentLoader, {
  sanitizeMessageContent,
  getCurrentDateString,
  generateOriginObject,
  generateCallDetails,
} from "../../src/utils/agentLoader.js";
import {
  DEFAULT_AGENT_CONFIG,
  DEFAULT_ORIGIN,
} from "../../src/utils/agentDefaults.js";

describe("agentLoader utility functions", () => {
  describe("sanitizeMessageContent", () => {
    test("should handle non-string input by returning as-is", () => {
      expect(sanitizeMessageContent(null)).toBe(null);
      expect(sanitizeMessageContent(undefined)).toBe(undefined);
      expect(sanitizeMessageContent(123)).toBe(123);
      expect(sanitizeMessageContent({})).toEqual({});
    });

    test("should escape backslashes", () => {
      const input = "This has \\ backslashes \\";
      const expected = "This has \\\\ backslashes \\\\";
      expect(sanitizeMessageContent(input)).toBe(expected);
    });

    test("should escape double quotes", () => {
      const input = 'This has "quotes" in it';
      const expected = 'This has \\"quotes\\" in it';
      expect(sanitizeMessageContent(input)).toBe(expected);
    });

    test("should escape newlines", () => {
      const input = "Line 1\nLine 2\nLine 3";
      const expected = "Line 1\\nLine 2\\nLine 3";
      expect(sanitizeMessageContent(input)).toBe(expected);
    });

    test("should escape carriage returns", () => {
      const input = "Line 1\rLine 2";
      const expected = "Line 1\\rLine 2";
      expect(sanitizeMessageContent(input)).toBe(expected);
    });

    test("should escape tabs", () => {
      const input = "Column 1\tColumn 2";
      const expected = "Column 1\\tColumn 2";
      expect(sanitizeMessageContent(input)).toBe(expected);
    });

    test("should handle complex strings with multiple escape characters", () => {
      const input = 'Complex "string" with\nnewlines\tand\\backslashes\r';
      const expected =
        'Complex \\"string\\" with\\nnewlines\\tand\\\\backslashes\\r';
      expect(sanitizeMessageContent(input)).toBe(expected);
    });

    test("should handle empty string", () => {
      expect(sanitizeMessageContent("")).toBe("");
    });
  });

  describe("getCurrentDateString", () => {
    test("should return a properly formatted Australian date string", () => {
      const dateString = getCurrentDateString();

      // Should match pattern like "Friday 18 July 2025" (Australian format without comma)
      const datePattern = /^[A-Za-z]+ \d{1,2} [A-Za-z]+ \d{4}$/;
      expect(dateString).toMatch(datePattern);
    });

    test("should return current date", () => {
      const dateString = getCurrentDateString();
      const today = new Date();
      const expectedYear = today.getFullYear().toString();

      expect(dateString).toContain(expectedYear);
    });
  });

  describe("generateOriginObject", () => {
    test("should return default origin object when no overrides provided", () => {
      const origin = generateOriginObject();

      // Should contain all default fields
      expect(origin).toMatchObject({
        originID: DEFAULT_ORIGIN.originID,
        channel: DEFAULT_ORIGIN.channel,
        gatewayUserID: DEFAULT_ORIGIN.gatewayUserID,
        conversationID: DEFAULT_ORIGIN.conversationID,
        billingID: DEFAULT_ORIGIN.billingID,
      });

      // Should have a fresh timestamp
      expect(origin.callTS).toBeDefined();
      expect(typeof origin.callTS).toBe("string");
      expect(new Date(origin.callTS)).toBeInstanceOf(Date);
    });

    test("should apply overrides correctly", () => {
      const overrides = {
        conversationID: "custom-conversation-123",
        billingID: "premium-user",
        customField: "custom-value",
      };

      const origin = generateOriginObject(overrides);

      expect(origin.conversationID).toBe("custom-conversation-123");
      expect(origin.billingID).toBe("premium-user");
      expect(origin.customField).toBe("custom-value");

      // Should still have default values for non-overridden fields
      expect(origin.originID).toBe(DEFAULT_ORIGIN.originID);
      expect(origin.channel).toBe(DEFAULT_ORIGIN.channel);
    });

    test("should always generate fresh timestamp even with overrides", () => {
      const overrides = { callTS: "2020-01-01T00:00:00.000Z" };
      const origin = generateOriginObject(overrides);

      // Should ignore the override and generate fresh timestamp
      expect(origin.callTS).not.toBe("2020-01-01T00:00:00.000Z");
      expect(new Date(origin.callTS).getTime()).toBeGreaterThan(
        new Date("2024-01-01").getTime()
      );
    });
  });

  describe("generateCallDetails", () => {
    const mockConfig = {
      provider: "groq",
      model: "test-model",
      callType: "test call",
      type: "completion",
      temperature: 0.7,
      systemPrompt: "Test system prompt",
      originOverrides: {},
    };

    test("should generate complete callDetails object", () => {
      const callDetails = generateCallDetails(
        mockConfig,
        "sanitized message",
        "test context",
        ["history item"]
      );

      expect(callDetails).toHaveProperty("callID");
      expect(callDetails).toHaveProperty("model");
      expect(callDetails).toHaveProperty("chat");
      expect(callDetails).toHaveProperty("origin");

      // Validate UUID format for callID
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(callDetails.callID).toMatch(uuidPattern);
    });

    test("should populate model object correctly", () => {
      const callDetails = generateCallDetails(
        mockConfig,
        "sanitized message",
        "test context",
        ["history item"]
      );

      expect(callDetails.model).toEqual({
        provider: "groq",
        model: "test-model",
        callType: "test call",
        type: "completion",
        temperature: 0.7,
      });
    });

    test("should include max_tokens when provided", () => {
      const configWithTokens = { ...mockConfig, max_tokens: 4096 };
      const callDetails = generateCallDetails(
        configWithTokens,
        "sanitized message",
        "test context",
        ["history item"]
      );

      expect(callDetails.model.max_tokens).toBe(4096);
    });

    test("should populate chat object correctly", () => {
      const callDetails = generateCallDetails(
        mockConfig,
        "sanitized message",
        "test context",
        ["history item"]
      );

      expect(callDetails.chat).toEqual({
        userPrompt: "sanitized message",
        systemPrompt: "Test system prompt",
        messageContext: "test context",
        messageHistory: ["history item"],
      });
    });

    test("should include origin object with overrides", () => {
      const configWithOverrides = {
        ...mockConfig,
        originOverrides: { conversationID: "custom-123" },
      };

      const callDetails = generateCallDetails(
        configWithOverrides,
        "sanitized message",
        "test context",
        ["history item"]
      );

      expect(callDetails.origin.conversationID).toBe("custom-123");
      expect(callDetails.origin.callTS).toBeDefined();
    });
  });

  describe("agentLoader main function", () => {
    const basicConfig = {
      systemPrompt: "I want you to act as a test agent",
    };

    test("should throw error when agentConfig is missing", () => {
      expect(() => {
        agentLoader(null, "message", "context", []);
      }).toThrow("agentConfig is required");
    });

    test("should throw error when message is not a string", () => {
      expect(() => {
        agentLoader(basicConfig, null, "context", []);
      }).toThrow("message must be a string");
    });

    test("should throw error when context is not a string", () => {
      expect(() => {
        agentLoader(basicConfig, "message", null, []);
      }).toThrow("context must be a string");
    });

    test("should throw error when history is not an array", () => {
      expect(() => {
        agentLoader(basicConfig, "message", "context", null);
      }).toThrow("history must be an array");
    });

    test("should throw error when systemPrompt is missing", () => {
      expect(() => {
        agentLoader({}, "message", "context", []);
      }).toThrow("Agent configuration must include a systemPrompt");
    });

    test("should throw error for unsupported provider", () => {
      const config = { ...basicConfig, provider: "unsupported" };
      expect(() => {
        agentLoader(config, "message", "context", []);
      }).toThrow("Unsupported provider: unsupported");
    });

    test("should throw error for unsupported type", () => {
      const config = { ...basicConfig, type: "unsupported" };
      expect(() => {
        agentLoader(config, "message", "context", []);
      }).toThrow("Unsupported type: unsupported");
    });

    test("should throw error for invalid temperature", () => {
      const config = { ...basicConfig, temperature: 3.0 };
      expect(() => {
        agentLoader(config, "message", "context", []);
      }).toThrow("Temperature must be between 0 and 2");
    });

    test("should merge config with defaults correctly", () => {
      const callDetails = agentLoader(
        basicConfig,
        "test message",
        "test context",
        []
      );

      expect(callDetails.model.provider).toBe(DEFAULT_AGENT_CONFIG.provider);
      expect(callDetails.model.model).toBe(DEFAULT_AGENT_CONFIG.model);
      expect(callDetails.model.temperature).toBe(
        DEFAULT_AGENT_CONFIG.temperature
      );
      expect(callDetails.chat.systemPrompt).toBe(basicConfig.systemPrompt);
    });

    test("should override defaults with provided config", () => {
      const customConfig = {
        ...basicConfig,
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.5,
      };

      const callDetails = agentLoader(
        customConfig,
        "test message",
        "test context",
        []
      );

      expect(callDetails.model.provider).toBe("openai");
      expect(callDetails.model.model).toBe("gpt-4o");
      expect(callDetails.model.temperature).toBe(0.5);
    });

    test("should sanitize message content", () => {
      const messageWithQuotes = 'Message with "quotes" and\nnewlines';
      const callDetails = agentLoader(
        basicConfig,
        messageWithQuotes,
        "context",
        []
      );

      expect(callDetails.chat.userPrompt).toBe(
        'Message with \\"quotes\\" and\\nnewlines'
      );
    });

    test("should append date to context when includeDateContext is true", () => {
      const config = { ...basicConfig, includeDateContext: true };
      const callDetails = agentLoader(
        config,
        "message",
        "original context",
        []
      );

      expect(callDetails.chat.messageContext).toContain("original context");
      expect(callDetails.chat.messageContext).toContain("The date today is:");
    });

    test("should not append date to context when includeDateContext is false", () => {
      const config = { ...basicConfig, includeDateContext: false };
      const callDetails = agentLoader(
        config,
        "message",
        "original context",
        []
      );

      expect(callDetails.chat.messageContext).toBe("original context");
      expect(callDetails.chat.messageContext).not.toContain(
        "The date today is:"
      );
    });

    test("should apply origin overrides", () => {
      const config = {
        ...basicConfig,
        originOverrides: {
          conversationID: "custom-conversation",
          billingID: "premium-user",
        },
      };

      const callDetails = agentLoader(config, "message", "context", []);

      expect(callDetails.origin.conversationID).toBe("custom-conversation");
      expect(callDetails.origin.billingID).toBe("premium-user");
    });

    test("should generate unique callID for each call", () => {
      const callDetails1 = agentLoader(basicConfig, "message", "context", []);
      const callDetails2 = agentLoader(basicConfig, "message", "context", []);

      expect(callDetails1.callID).not.toBe(callDetails2.callID);
    });

    test("should handle all supported providers", () => {
      const providers = ["groq", "openai", "openrouter"];

      providers.forEach((provider) => {
        const config = { ...basicConfig, provider };
        const callDetails = agentLoader(config, "message", "context", []);
        expect(callDetails.model.provider).toBe(provider);
      });
    });

    test("should handle all supported types", () => {
      const types = ["completion", "json_object"];

      types.forEach((type) => {
        const config = { ...basicConfig, type };
        const callDetails = agentLoader(config, "message", "context", []);
        expect(callDetails.model.type).toBe(type);
      });
    });

    test("should include max_tokens when provided", () => {
      const config = { ...basicConfig, max_tokens: 2048 };
      const callDetails = agentLoader(config, "message", "context", []);

      expect(callDetails.model.max_tokens).toBe(2048);
    });

    test("should not include max_tokens when not provided", () => {
      const callDetails = agentLoader(basicConfig, "message", "context", []);

      expect(callDetails.model.max_tokens).toBeUndefined();
    });
  });

  describe("backward compatibility", () => {
    test("should generate callDetails structure identical to existing agents", () => {
      const config = {
        systemPrompt: "I want you to act as a friendly agent",
        provider: "groq",
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        callType: "This is a chat Call",
        type: "completion",
        temperature: 0.8,
      };

      const callDetails = agentLoader(config, "test message", "test context", [
        "history",
      ]);

      // Validate structure matches existing agent pattern
      expect(callDetails).toHaveProperty("callID");
      expect(callDetails).toHaveProperty("model");
      expect(callDetails).toHaveProperty("chat");
      expect(callDetails).toHaveProperty("origin");

      // Validate model structure
      expect(callDetails.model).toHaveProperty("provider");
      expect(callDetails.model).toHaveProperty("model");
      expect(callDetails.model).toHaveProperty("callType");
      expect(callDetails.model).toHaveProperty("type");
      expect(callDetails.model).toHaveProperty("temperature");

      // Validate chat structure
      expect(callDetails.chat).toHaveProperty("userPrompt");
      expect(callDetails.chat).toHaveProperty("systemPrompt");
      expect(callDetails.chat).toHaveProperty("messageContext");
      expect(callDetails.chat).toHaveProperty("messageHistory");

      // Validate origin structure
      expect(callDetails.origin).toHaveProperty("originID");
      expect(callDetails.origin).toHaveProperty("callTS");
      expect(callDetails.origin).toHaveProperty("conversationID");
      expect(callDetails.origin).toHaveProperty("billingID");
    });
  });
});
