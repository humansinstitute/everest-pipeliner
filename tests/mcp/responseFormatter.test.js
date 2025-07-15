import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  formatForMCP,
  formatValidationErrorResponse,
  formatMCPToolResponse,
  formatMCPErrorResponse,
  truncateContent,
  sanitizeForMCP,
} from "../../src/mcp/responseFormatter.js";

describe("MCP Response Formatter", () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      type: "mcp",
      requestId: "test-request-123",
      synchronous: true,
      timestamp: "2024-01-01T00:00:00.000Z",
      toolName: "run_pipeliner_dialogue",
      pipelineName: "dialogue",
      includeDebugInfo: false,
    };
  });

  describe("formatForMCP", () => {
    test("should format successful pipeline result", () => {
      const result = {
        success: true,
        runId: "run-123",
        conversation: [
          { agent: "Agent1", content: "Hello", iteration: 1 },
          { agent: "Agent2", content: "Hi there", iteration: 1 },
        ],
        summary: { content: "Test summary" },
        pipeline: {
          statistics: {
            durationSeconds: 45,
            completedSteps: 3,
            totalSteps: 3,
          },
          costs: {
            total: 0.0123,
          },
        },
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted).toEqual({
        content: [
          {
            type: "text",
            text: expect.stringContaining("Pipeline executed successfully"),
          },
        ],
        isError: false,
        _meta: {
          requestId: "test-request-123",
          timestamp: "2024-01-01T00:00:00.000Z",
          pipeline: "dialogue",
          success: true,
        },
      });

      expect(formatted.content[0].text).toContain("Run ID: run-123");
      expect(formatted.content[0].text).toContain("Duration: 45 seconds");
      expect(formatted.content[0].text).toContain("Steps: 3/3");
      expect(formatted.content[0].text).toContain("Cost: $0.0123");
    });

    test("should format failed pipeline result", () => {
      const result = {
        success: false,
        error: "Pipeline execution failed",
        details: "Invalid parameters provided",
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted).toEqual({
        content: [
          {
            type: "text",
            text: expect.stringContaining("Pipeline execution failed"),
          },
        ],
        isError: true,
        _meta: {
          requestId: "test-request-123",
          timestamp: "2024-01-01T00:00:00.000Z",
          pipeline: "dialogue",
          success: false,
        },
      });

      expect(formatted.content[0].text).toContain(
        "Error: Pipeline execution failed"
      );
      expect(formatted.content[0].text).toContain(
        "Details: Invalid parameters provided"
      );
    });

    test("should include debug information when enabled", () => {
      const result = {
        success: true,
        runId: "run-123",
        conversation: [],
      };

      const contextWithDebug = {
        ...mockContext,
        includeDebugInfo: true,
      };

      const formatted = formatForMCP(result, contextWithDebug);

      expect(formatted.content[0].text).toContain("=== Debug Information ===");
      expect(formatted.content[0].text).toContain(
        "Request ID: test-request-123"
      );
      expect(formatted.content[0].text).toContain(
        "Tool: run_pipeliner_dialogue"
      );
      expect(formatted.content[0].text).toContain("Pipeline: dialogue");
    });

    test("should handle dialogue pipeline results", () => {
      const result = {
        success: true,
        runId: "run-123",
        conversation: [
          { agent: "Agent1", content: "First message", iteration: 1 },
          { agent: "Agent2", content: "Second message", iteration: 1 },
          { agent: "Agent1", content: "Third message", iteration: 2 },
        ],
        summary: { content: "Conversation summary" },
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted.content[0].text).toContain("=== Conversation ===");
      expect(formatted.content[0].text).toContain(
        "Agent1 (Iteration 1): First message"
      );
      expect(formatted.content[0].text).toContain(
        "Agent2 (Iteration 1): Second message"
      );
      expect(formatted.content[0].text).toContain(
        "Agent1 (Iteration 2): Third message"
      );
      expect(formatted.content[0].text).toContain("=== Summary ===");
      expect(formatted.content[0].text).toContain("Conversation summary");
    });

    test("should handle content waterfall pipeline results", () => {
      const result = {
        success: true,
        runId: "run-123",
        topics: {
          topics: [
            { title: "Topic 1", description: "First topic" },
            { title: "Topic 2", description: "Second topic" },
          ],
        },
        linkedinPosts: {
          linkedinPosts: [
            { content: "LinkedIn post 1" },
            { content: "LinkedIn post 2" },
          ],
        },
        reelsConcepts: {
          reelsConcepts: [
            { title: "Reel 1", description: "First reel concept" },
            { title: "Reel 2", description: "Second reel concept" },
          ],
        },
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted.content[0].text).toContain("=== Content Analysis ===");
      expect(formatted.content[0].text).toContain("Topics extracted: 2");
      expect(formatted.content[0].text).toContain("=== Topics ===");
      expect(formatted.content[0].text).toContain("1. Topic 1: First topic");
      expect(formatted.content[0].text).toContain("=== LinkedIn Posts ===");
      expect(formatted.content[0].text).toContain("LinkedIn post 1");
      expect(formatted.content[0].text).toContain("=== Reels Concepts ===");
      expect(formatted.content[0].text).toContain(
        "1. Reel 1: First reel concept"
      );
    });

    test("should handle facilitator interventions", () => {
      const result = {
        success: true,
        runId: "run-123",
        conversation: [
          { agent: "Agent1", content: "Regular message", iteration: 1 },
          {
            agent: "Facilitator",
            content: "Intervention",
            iteration: 1,
            isFacilitator: true,
          },
        ],
        config: {
          facilitatorEnabled: true,
        },
        pipeline: {
          facilitatorInterventions: [{ iteration: 1, content: "Intervention" }],
        },
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted.content[0].text).toContain("Facilitator: Enabled");
      expect(formatted.content[0].text).toContain(
        "Facilitator interventions: 1"
      );
      expect(formatted.content[0].text).toContain(
        "🎯 Facilitator (Iteration 1): Intervention"
      );
    });

    test("should truncate long content", () => {
      const longContent = "A".repeat(2000);
      const result = {
        success: true,
        runId: "run-123",
        conversation: [{ agent: "Agent1", content: longContent, iteration: 1 }],
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted.content[0].text).toContain("A".repeat(500) + "...");
      expect(formatted.content[0].text).not.toContain("A".repeat(1000));
    });
  });

  describe("formatValidationErrorResponse", () => {
    test("should format validation errors correctly", () => {
      const errors = [
        "sourceText is required",
        "discussionPrompt must be a string",
        "iterations must be between 1 and 10",
      ];

      const formatted = formatValidationErrorResponse(errors, mockContext);

      expect(formatted).toEqual({
        content: [
          {
            type: "text",
            text: expect.stringContaining("Parameter validation failed"),
          },
        ],
        isError: true,
        _meta: {
          requestId: "test-request-123",
          timestamp: "2024-01-01T00:00:00.000Z",
          pipeline: "dialogue",
          success: false,
        },
      });

      expect(formatted.content[0].text).toContain("• sourceText is required");
      expect(formatted.content[0].text).toContain(
        "• discussionPrompt must be a string"
      );
      expect(formatted.content[0].text).toContain(
        "• iterations must be between 1 and 10"
      );
    });

    test("should handle single validation error", () => {
      const errors = ["sourceText is required"];

      const formatted = formatValidationErrorResponse(errors, mockContext);

      expect(formatted.content[0].text).toContain(
        "Parameter validation failed"
      );
      expect(formatted.content[0].text).toContain("• sourceText is required");
    });
  });

  describe("formatMCPToolResponse", () => {
    test("should format tool response with content", () => {
      const content = "Tool execution result";
      const meta = { success: true, duration: 1500 };

      const formatted = formatMCPToolResponse(content, meta);

      expect(formatted).toEqual({
        content: [
          {
            type: "text",
            text: "Tool execution result",
          },
        ],
        isError: false,
        _meta: { success: true, duration: 1500 },
      });
    });

    test("should handle empty content", () => {
      const formatted = formatMCPToolResponse("", { success: true });

      expect(formatted.content[0].text).toBe("(No content)");
    });

    test("should handle null content", () => {
      const formatted = formatMCPToolResponse(null, { success: true });

      expect(formatted.content[0].text).toBe("(No content)");
    });
  });

  describe("formatMCPErrorResponse", () => {
    test("should format error response correctly", () => {
      const error = new Error("Test error");
      const meta = { requestId: "req-123" };

      const formatted = formatMCPErrorResponse(error, meta);

      expect(formatted).toEqual({
        content: [
          {
            type: "text",
            text: "Error: Test error",
          },
        ],
        isError: true,
        _meta: { requestId: "req-123" },
      });
    });

    test("should handle string errors", () => {
      const formatted = formatMCPErrorResponse("String error", {});

      expect(formatted.content[0].text).toBe("Error: String error");
    });

    test("should handle errors with additional properties", () => {
      const error = new Error("Test error");
      error.code = "TEST_ERROR";
      error.details = "Additional details";

      const formatted = formatMCPErrorResponse(error, {});

      expect(formatted.content[0].text).toContain("Error: Test error");
      expect(formatted.content[0].text).toContain("Code: TEST_ERROR");
      expect(formatted.content[0].text).toContain(
        "Details: Additional details"
      );
    });
  });

  describe("truncateContent", () => {
    test("should not truncate short content", () => {
      const content = "Short content";
      const truncated = truncateContent(content, 100);

      expect(truncated).toBe("Short content");
    });

    test("should truncate long content", () => {
      const content = "A".repeat(200);
      const truncated = truncateContent(content, 100);

      expect(truncated).toBe("A".repeat(97) + "...");
      expect(truncated.length).toBe(100);
    });

    test("should handle empty content", () => {
      expect(truncateContent("", 100)).toBe("");
      expect(truncateContent(null, 100)).toBe("");
      expect(truncateContent(undefined, 100)).toBe("");
    });

    test("should use default max length", () => {
      const content = "A".repeat(2000);
      const truncated = truncateContent(content);

      expect(truncated.length).toBe(1000);
      expect(truncated.endsWith("...")).toBe(true);
    });
  });

  describe("sanitizeForMCP", () => {
    test("should remove control characters", () => {
      const content = "Hello\x00\x01\x02World";
      const sanitized = sanitizeForMCP(content);

      expect(sanitized).toBe("HelloWorld");
    });

    test("should preserve valid characters", () => {
      const content = "Hello\nWorld\tTest\r\n";
      const sanitized = sanitizeForMCP(content);

      expect(sanitized).toBe("Hello\nWorld\tTest\r\n");
    });

    test("should handle unicode characters", () => {
      const content = "Hello 🌍 World 中文";
      const sanitized = sanitizeForMCP(content);

      expect(sanitized).toBe("Hello 🌍 World 中文");
    });

    test("should handle empty and null values", () => {
      expect(sanitizeForMCP("")).toBe("");
      expect(sanitizeForMCP(null)).toBe("");
      expect(sanitizeForMCP(undefined)).toBe("");
    });

    test("should handle non-string values", () => {
      expect(sanitizeForMCP(123)).toBe("123");
      expect(sanitizeForMCP(true)).toBe("true");
      expect(sanitizeForMCP({})).toBe("[object Object]");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle malformed pipeline results", () => {
      const malformedResult = {
        success: true,
        conversation: "not an array",
        summary: null,
      };

      const formatted = formatForMCP(malformedResult, mockContext);

      expect(formatted.isError).toBe(false);
      expect(formatted.content[0].text).toContain(
        "Pipeline executed successfully"
      );
    });

    test("should handle missing context properties", () => {
      const minimalContext = {
        type: "mcp",
      };

      const result = {
        success: true,
        runId: "test",
      };

      const formatted = formatForMCP(result, minimalContext);

      expect(formatted._meta.requestId).toBeUndefined();
      expect(formatted._meta.timestamp).toBeUndefined();
      expect(formatted._meta.pipeline).toBeUndefined();
    });

    test("should handle very large responses", () => {
      const largeConversation = Array.from({ length: 100 }, (_, i) => ({
        agent: `Agent${(i % 2) + 1}`,
        content: `Message ${i} `.repeat(100),
        iteration: Math.floor(i / 2) + 1,
      }));

      const result = {
        success: true,
        runId: "large-test",
        conversation: largeConversation,
      };

      const formatted = formatForMCP(result, mockContext);

      expect(formatted.content[0].text.length).toBeLessThan(50000); // Should be truncated
      expect(formatted.isError).toBe(false);
    });

    test("should handle circular references in results", () => {
      const result = {
        success: true,
        runId: "circular-test",
      };

      // Create circular reference
      result.self = result;

      const formatted = formatForMCP(result, mockContext);

      expect(formatted.isError).toBe(false);
      expect(formatted.content[0].text).toContain(
        "Pipeline executed successfully"
      );
    });
  });
});
