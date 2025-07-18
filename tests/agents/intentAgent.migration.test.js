/**
 * Migration Tests for intentAgent
 *
 * These tests validate that the migrated intentAgent produces
 * identical output to the original implementation.
 */

import intentAgent from "../../src/agents/intentAgent.js";
import agentLoader from "../../src/utils/agentLoader.js";

describe("intentAgent Migration Tests", () => {
  const testMessage = "Can you help me publish a message to nostr?";
  const testContext = "User wants to publish content";
  const testHistory = [
    { role: "user", content: "I need help with something" },
    { role: "assistant", content: "How can I assist you?" },
  ];

  // Configuration extracted from original intentAgent
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
    type: "json_object", // Note: original has duplicate type field, using the second one
    temperature: 0.5,
    includeDateContext: false, // intentAgent doesn't include date context
    debugPrefix: "[ConversationAgent]", // Note: original has incorrect prefix
    contextOverride: "", // intentAgent uses empty string instead of provided context
  };

  let originalResult;
  let migratedResult;

  beforeEach(async () => {
    // Capture original implementation result
    originalResult = await intentAgent(testMessage, testContext, testHistory);

    // Generate migrated implementation result
    migratedResult = agentLoader(
      intentAgentConfig,
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

    test("should have identical type (json_object)", () => {
      expect(migratedResult.model.type).toBe("json_object");
      expect(originalResult.model.type).toBe("json_object");
    });

    test("should have identical temperature", () => {
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
      expect(migratedResult.model.temperature).toBe(0.5);
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

    test("should have empty messageContext (contextOverride behavior)", () => {
      // intentAgent uses empty string for context, ignoring the provided context
      expect(migratedResult.chat.messageContext).toBe("");
      expect(originalResult.chat.messageContext).toBe("");
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

      const originalSpecial = await intentAgent(
        specialMessage,
        testContext,
        testHistory
      );
      const migratedSpecial = agentLoader(
        intentAgentConfig,
        specialMessage,
        testContext,
        testHistory
      );

      expect(migratedSpecial.chat.userPrompt).toBe(
        originalSpecial.chat.userPrompt
      );
    });
  });

  describe("Debug Logging Behavior", () => {
    test("should use same debug prefix (preserving original quirk)", () => {
      // Both should use "[ConversationAgent]" prefix (this is a quirk in the original)
      expect(intentAgentConfig.debugPrefix).toBe("[ConversationAgent]");
    });
  });

  describe("Context Override Behavior", () => {
    test("should ignore provided context and use empty string", async () => {
      const customContext = "This context should be ignored";

      const originalWithContext = await intentAgent(
        testMessage,
        customContext,
        testHistory
      );
      const migratedWithContext = agentLoader(
        intentAgentConfig,
        testMessage,
        customContext,
        testHistory
      );

      // Both should use empty string regardless of provided context
      expect(migratedWithContext.chat.messageContext).toBe("");
      expect(originalWithContext.chat.messageContext).toBe("");
    });

    test("should not include date context even with contextOverride", async () => {
      // intentAgent should never include date context
      expect(migratedResult.chat.messageContext).not.toContain(
        "The date today is:"
      );
      expect(originalResult.chat.messageContext).not.toContain(
        "The date today is:"
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty history", async () => {
      const originalEmptyHistory = await intentAgent(
        testMessage,
        testContext,
        []
      );
      const migratedEmptyHistory = agentLoader(
        intentAgentConfig,
        testMessage,
        testContext,
        []
      );

      expect(migratedEmptyHistory.chat.messageHistory).toEqual(
        originalEmptyHistory.chat.messageHistory
      );
    });

    test("should handle various intent-related messages", async () => {
      const intentMessages = [
        "Can you research the latest AI developments?",
        "Please publish this to nostr",
        "How do I change my settings?",
        "Just having a normal conversation",
      ];

      for (const message of intentMessages) {
        const originalIntent = await intentAgent(
          message,
          testContext,
          testHistory
        );
        const migratedIntent = agentLoader(
          intentAgentConfig,
          message,
          testContext,
          testHistory
        );

        expect(migratedIntent.chat.userPrompt).toBe(
          originalIntent.chat.userPrompt
        );
        expect(migratedIntent.chat.messageContext).toBe(
          originalIntent.chat.messageContext
        );
      }
    });
  });

  describe("Original Implementation Quirks Preservation", () => {
    test("should preserve duplicate type field behavior", () => {
      // Original has both type: "completion" and type: "json_object"
      // The second one wins, so both should be "json_object"
      expect(migratedResult.model.type).toBe("json_object");
      expect(originalResult.model.type).toBe("json_object");
    });

    test("should preserve incorrect debug prefix", () => {
      // Original intentAgent uses "[ConversationAgent]" prefix instead of "[IntentAgent]"
      expect(intentAgentConfig.debugPrefix).toBe("[ConversationAgent]");
    });

    test("should preserve empty context behavior", () => {
      // Original intentAgent sets messageContext to "" instead of using provided context
      expect(migratedResult.chat.messageContext).toBe("");
      expect(originalResult.chat.messageContext).toBe("");
    });
  });
});
