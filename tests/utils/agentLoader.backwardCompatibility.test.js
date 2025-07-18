/**
 * Backward Compatibility Tests for agentLoader
 *
 * These tests validate that the agentLoader function produces identical
 * output to existing agent implementations, ensuring 100% backward compatibility.
 */

import agentLoader from "../../src/utils/agentLoader.js";
import conversationAgent from "../../src/agents/conversationAgent.js";
import intentAgent from "../../src/agents/intentAgent.js";

describe("agentLoader backward compatibility", () => {
  describe("conversationAgent compatibility", () => {
    test("should produce identical structure to conversationAgent", async () => {
      const message = "Hello, how are you today?";
      const context = "This is a test context";
      const history = ["Previous message 1", "Previous message 2"];

      // Get output from original conversationAgent
      const originalOutput = await conversationAgent(message, context, history);

      // Configure agentLoader to match conversationAgent
      const agentConfig = {
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

      const agentLoaderOutput = agentLoader(
        agentConfig,
        message,
        context,
        history
      );

      // Validate structure compatibility
      expect(agentLoaderOutput).toHaveProperty("callID");
      expect(agentLoaderOutput).toHaveProperty("model");
      expect(agentLoaderOutput).toHaveProperty("chat");
      expect(agentLoaderOutput).toHaveProperty("origin");

      // Validate model structure matches
      expect(agentLoaderOutput.model).toMatchObject({
        provider: originalOutput.model.provider,
        model: originalOutput.model.model,
        callType: originalOutput.model.callType,
        type: originalOutput.model.type,
        temperature: originalOutput.model.temperature,
      });

      // Validate chat structure matches (excluding callID-specific differences)
      expect(agentLoaderOutput.chat.systemPrompt).toBe(
        originalOutput.chat.systemPrompt
      );
      expect(agentLoaderOutput.chat.messageHistory).toEqual(
        originalOutput.chat.messageHistory
      );

      // Validate origin structure matches (excluding timestamp differences)
      expect(agentLoaderOutput.origin.originID).toBe(
        originalOutput.origin.originID
      );
      expect(agentLoaderOutput.origin.conversationID).toBe(
        originalOutput.origin.conversationID
      );
      expect(agentLoaderOutput.origin.billingID).toBe(
        originalOutput.origin.billingID
      );
      expect(agentLoaderOutput.origin.channel).toBe(
        originalOutput.origin.channel
      );
    });

    test("should handle message sanitization identically", async () => {
      const problematicMessage =
        'Message with "quotes" and\nnewlines\tand\\backslashes';
      const context = "test context";
      const history = [];

      const originalOutput = await conversationAgent(
        problematicMessage,
        context,
        history
      );

      const agentConfig = {
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

      const agentLoaderOutput = agentLoader(
        agentConfig,
        problematicMessage,
        context,
        history
      );

      // Both should sanitize the message identically
      expect(agentLoaderOutput.chat.userPrompt).toBe(
        originalOutput.chat.userPrompt
      );
    });

    test("should append date to context identically", async () => {
      const message = "Test message";
      const context = "Original context";
      const history = [];

      const originalOutput = await conversationAgent(message, context, history);

      const agentConfig = {
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

      const agentLoaderOutput = agentLoader(
        agentConfig,
        message,
        context,
        history
      );

      // Both should append date to context
      expect(agentLoaderOutput.chat.messageContext).toContain(
        "Original context"
      );
      expect(agentLoaderOutput.chat.messageContext).toContain(
        "The date today is:"
      );
      expect(originalOutput.chat.messageContext).toContain("Original context");
      expect(originalOutput.chat.messageContext).toContain(
        "The date today is:"
      );
    });
  });

  describe("intentAgent compatibility", () => {
    test("should produce identical structure to intentAgent", async () => {
      const message = "Can you research the latest AI developments?";
      const context = "Intent analysis context";
      const history = ["Previous intent query"];

      // Get output from original intentAgent
      const originalOutput = await intentAgent(message, context, history);

      // Configure agentLoader to match intentAgent
      const agentConfig = {
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
        includeDateContext: false, // intentAgent doesn't append date
        debugPrefix: "[IntentAgent]",
        contextOverride: "", // intentAgent hardcodes empty string for messageContext
      };

      const agentLoaderOutput = agentLoader(
        agentConfig,
        message,
        context,
        history
      );

      // Validate structure compatibility
      expect(agentLoaderOutput).toHaveProperty("callID");
      expect(agentLoaderOutput).toHaveProperty("model");
      expect(agentLoaderOutput).toHaveProperty("chat");
      expect(agentLoaderOutput).toHaveProperty("origin");

      // Validate model structure matches
      expect(agentLoaderOutput.model).toMatchObject({
        provider: originalOutput.model.provider,
        model: originalOutput.model.model,
        callType: originalOutput.model.callType,
        type: originalOutput.model.type,
        temperature: originalOutput.model.temperature,
      });

      // Validate chat structure matches
      expect(agentLoaderOutput.chat.systemPrompt).toBe(
        originalOutput.chat.systemPrompt
      );
      expect(agentLoaderOutput.chat.messageContext).toBe(
        originalOutput.chat.messageContext
      );
      expect(agentLoaderOutput.chat.messageHistory).toEqual(
        originalOutput.chat.messageHistory
      );

      // Validate origin structure matches
      expect(agentLoaderOutput.origin.originID).toBe(
        originalOutput.origin.originID
      );
      expect(agentLoaderOutput.origin.conversationID).toBe(
        originalOutput.origin.conversationID
      );
      expect(agentLoaderOutput.origin.billingID).toBe(
        originalOutput.origin.billingID
      );
    });

    test("should handle json_object type correctly", async () => {
      const message = "Test intent message";
      const context = "";
      const history = [];

      const originalOutput = await intentAgent(message, context, history);

      const agentConfig = {
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
        contextOverride: "", // intentAgent hardcodes empty string for messageContext
      };

      const agentLoaderOutput = agentLoader(
        agentConfig,
        message,
        context,
        history
      );

      // Should have json_object type
      expect(agentLoaderOutput.model.type).toBe("json_object");
      expect(originalOutput.model.type).toBe("json_object");
    });
  });

  describe("general compatibility patterns", () => {
    test("should generate valid UUID for callID", () => {
      const agentConfig = {
        systemPrompt: "Test system prompt",
      };

      const output = agentLoader(agentConfig, "test", "test", []);

      // Should be valid UUID v4 format
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(output.callID).toMatch(uuidPattern);
    });

    test("should generate valid ISO timestamp for origin.callTS", () => {
      const agentConfig = {
        systemPrompt: "Test system prompt",
      };

      const output = agentLoader(agentConfig, "test", "test", []);

      // Should be valid ISO timestamp
      expect(output.origin.callTS).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(new Date(output.origin.callTS)).toBeInstanceOf(Date);
    });

    test("should maintain all required origin fields", () => {
      const agentConfig = {
        systemPrompt: "Test system prompt",
      };

      const output = agentLoader(agentConfig, "test", "test", []);

      // Should have all the fields that existing agents have
      const requiredOriginFields = [
        "originID",
        "callTS",
        "channel",
        "gatewayUserID",
        "gatewayMessageID",
        "gatewayReplyTo",
        "gatewayNpub",
        "response",
        "webhook_url",
        "conversationID",
        "channelSpace",
        "userID",
        "billingID",
      ];

      requiredOriginFields.forEach((field) => {
        expect(output.origin).toHaveProperty(field);
      });
    });

    test("should maintain all required model fields", () => {
      const agentConfig = {
        systemPrompt: "Test system prompt",
      };

      const output = agentLoader(agentConfig, "test", "test", []);

      // Should have all the fields that existing agents have
      const requiredModelFields = [
        "provider",
        "model",
        "callType",
        "type",
        "temperature",
      ];

      requiredModelFields.forEach((field) => {
        expect(output.model).toHaveProperty(field);
      });
    });

    test("should maintain all required chat fields", () => {
      const agentConfig = {
        systemPrompt: "Test system prompt",
      };

      const output = agentLoader(agentConfig, "test", "test", []);

      // Should have all the fields that existing agents have
      const requiredChatFields = [
        "userPrompt",
        "systemPrompt",
        "messageContext",
        "messageHistory",
      ];

      requiredChatFields.forEach((field) => {
        expect(output.chat).toHaveProperty(field);
      });
    });
  });
});
