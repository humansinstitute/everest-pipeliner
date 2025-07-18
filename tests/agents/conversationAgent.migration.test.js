/**
 * Migration Tests for conversationAgent
 *
 * These tests validate that the migrated conversationAgent produces
 * identical output to the original implementation.
 */

import conversationAgent from "../../src/agents/conversationAgent.js";
import agentLoader from "../../src/utils/agentLoader.js";

describe("conversationAgent Migration Tests", () => {
  const testMessage = "Hello, I need some guidance";
  const testContext = "User is seeking advice";
  const testHistory = [
    { role: "user", content: "Previous message" },
    { role: "assistant", content: "Previous response" },
  ];

  // Configuration extracted from original conversationAgent
  const conversationAgentConfig = {
    systemPrompt:
      "I want you to act as a friendly and knowledgeable agent called The Beacon. You are wise and friendly and provide guidance to those in need.",
    provider: "groq",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    callType: "This is a chat Call",
    type: "completion",
    temperature: 0.8,
    includeDateContext: true,
    debugPrefix: "[ConversationAgent]",
  };

  let originalResult;
  let migratedResult;

  beforeEach(async () => {
    // Capture original implementation result
    originalResult = await conversationAgent(
      testMessage,
      testContext,
      testHistory
    );

    // Generate migrated implementation result
    migratedResult = agentLoader(
      conversationAgentConfig,
      testMessage,
      testContext,
      testHistory
    );
  });

  describe("Structure Validation", () => {
    test("should have identical top-level structure", () => {
      expect(Object.keys(migratedResult)).toEqual(Object.keys(originalResult));
    });

    test("should have identical model object structure", () => {
      expect(Object.keys(migratedResult.model)).toEqual(
        Object.keys(originalResult.model)
      );
    });

    test("should have identical chat object structure", () => {
      expect(Object.keys(migratedResult.chat)).toEqual(
        Object.keys(originalResult.chat)
      );
    });

    test("should have identical origin object structure", () => {
      expect(Object.keys(migratedResult.origin)).toEqual(
        Object.keys(originalResult.origin)
      );
    });
  });

  describe("Model Configuration", () => {
    test("should have identical provider", () => {
      expect(migratedResult.model.provider).toBe(originalResult.model.provider);
    });

    test("should have identical model name", () => {
      expect(migratedResult.model.model).toBe(originalResult.model.model);
    });

    test("should have identical callType", () => {
      expect(migratedResult.model.callType).toBe(originalResult.model.callType);
    });

    test("should have identical type", () => {
      expect(migratedResult.model.type).toBe(originalResult.model.type);
    });

    test("should have identical temperature", () => {
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
    });
  });

  describe("Chat Configuration", () => {
    test("should have identical systemPrompt", () => {
      expect(migratedResult.chat.systemPrompt).toBe(
        originalResult.chat.systemPrompt
      );
    });

    test("should have identical userPrompt (sanitized message)", () => {
      expect(migratedResult.chat.userPrompt).toBe(
        originalResult.chat.userPrompt
      );
    });

    test("should have identical messageHistory", () => {
      expect(migratedResult.chat.messageHistory).toEqual(
        originalResult.chat.messageHistory
      );
    });

    test("should have messageContext with appended date", () => {
      // Both should include the date context
      expect(migratedResult.chat.messageContext).toContain(
        "The date today is:"
      );
      expect(originalResult.chat.messageContext).toContain(
        "The date today is:"
      );

      // The base context should be the same
      const migratedBase =
        migratedResult.chat.messageContext.split("The date today is:")[0];
      const originalBase =
        originalResult.chat.messageContext.split("The date today is:")[0];
      expect(migratedBase).toBe(originalBase);
    });
  });

  describe("Origin Configuration", () => {
    test("should have identical origin fields except callTS", () => {
      const { callTS: migratedCallTS, ...migratedOriginRest } =
        migratedResult.origin;
      const { callTS: originalCallTS, ...originalOriginRest } =
        originalResult.origin;

      expect(migratedOriginRest).toEqual(originalOriginRest);
    });

    test("should have valid ISO timestamp format", () => {
      expect(migratedResult.origin.callTS).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(originalResult.origin.callTS).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe("UUID Generation", () => {
    test("should generate valid UUID format", () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(migratedResult.callID).toMatch(uuidRegex);
      expect(originalResult.callID).toMatch(uuidRegex);
    });

    test("should generate unique callIDs", () => {
      expect(migratedResult.callID).not.toBe(originalResult.callID);
    });
  });

  describe("Message Sanitization", () => {
    test("should sanitize special characters identically", async () => {
      const specialMessage =
        'Test with "quotes" and \n newlines \t tabs \\ backslashes';

      const originalSpecial = await conversationAgent(
        specialMessage,
        testContext,
        testHistory
      );
      const migratedSpecial = agentLoader(
        conversationAgentConfig,
        specialMessage,
        testContext,
        testHistory
      );

      expect(migratedSpecial.chat.userPrompt).toBe(
        originalSpecial.chat.userPrompt
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty context", async () => {
      const originalEmpty = await conversationAgent(
        testMessage,
        "",
        testHistory
      );
      const migratedEmpty = agentLoader(
        conversationAgentConfig,
        testMessage,
        "",
        testHistory
      );

      // Both should still append date to empty context
      expect(migratedEmpty.chat.messageContext).toBe(
        originalEmpty.chat.messageContext
      );
    });

    test("should handle empty history", async () => {
      const originalEmptyHistory = await conversationAgent(
        testMessage,
        testContext,
        []
      );
      const migratedEmptyHistory = agentLoader(
        conversationAgentConfig,
        testMessage,
        testContext,
        []
      );

      expect(migratedEmptyHistory.chat.messageHistory).toEqual(
        originalEmptyHistory.chat.messageHistory
      );
    });
  });
});
