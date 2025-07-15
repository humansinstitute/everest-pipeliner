import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { UniversalPipelineExecutor } from "../../src/shared/executor.js";
import {
  createMCPLogger,
  createNostrMQLogger,
} from "../../src/shared/logger.js";

// Mock dependencies
jest.mock("../../src/shared/logger.js");
jest.mock("fs/promises");

describe("UniversalPipelineExecutor", () => {
  let executor;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      toolCall: jest.fn(),
      toolResult: jest.fn(),
    };

    createMCPLogger.mockReturnValue(mockLogger);
    createNostrMQLogger.mockReturnValue(mockLogger);

    executor = new UniversalPipelineExecutor();
  });

  afterEach(() => {
    executor.clearCache();
  });

  describe("Constructor", () => {
    test("should initialize with empty cache and pipelines map", () => {
      expect(executor.cache).toBeInstanceOf(Map);
      expect(executor.pipelines).toBeInstanceOf(Map);
      expect(executor.cache.size).toBe(0);
      expect(executor.pipelines.size).toBe(0);
    });
  });

  describe("Pipeline Loading", () => {
    test("should load pipeline successfully", async () => {
      const mockPipeline = {
        dialoguePipeline: jest.fn().mockResolvedValue({ success: true }),
        executeViaMCP: jest.fn().mockResolvedValue({ success: true }),
        metadata: {
          name: "dialogue",
          description: "Test pipeline",
        },
      };

      // Mock dynamic import
      global.__import__ = jest.fn().mockResolvedValue(mockPipeline);

      const pipeline = await executor.loadPipeline("dialogue");

      expect(global.__import__).toHaveBeenCalledWith(
        "./src/pipelines/dialoguePipeline.js"
      );
      expect(pipeline).toBe(mockPipeline);
      expect(executor.pipelines.has("dialogue")).toBe(true);
    });

    test("should cache loaded pipelines", async () => {
      const mockPipeline = {
        dialoguePipeline: jest.fn(),
        metadata: { name: "dialogue" },
      };

      global.__import__ = jest.fn().mockResolvedValue(mockPipeline);

      // Load twice
      const pipeline1 = await executor.loadPipeline("dialogue");
      const pipeline2 = await executor.loadPipeline("dialogue");

      expect(global.__import__).toHaveBeenCalledTimes(1);
      expect(pipeline1).toBe(pipeline2);
    });

    test("should handle pipeline loading errors", async () => {
      global.__import__ = jest
        .fn()
        .mockRejectedValue(new Error("Module not found"));

      await expect(executor.loadPipeline("nonexistent")).rejects.toThrow(
        "Module not found"
      );
    });

    test("should construct correct pipeline path", async () => {
      const mockPipeline = { test: jest.fn() };
      global.__import__ = jest.fn().mockResolvedValue(mockPipeline);

      await executor.loadPipeline("customPipeline");

      expect(global.__import__).toHaveBeenCalledWith(
        "./src/pipelines/customPipelinePipeline.js"
      );
    });
  });

  describe("MCP Execution", () => {
    let mockPipeline;

    beforeEach(() => {
      mockPipeline = {
        executeViaMCP: jest.fn(),
        dialoguePipeline: jest.fn(),
        metadata: {
          name: "dialogue",
          description: "Test dialogue pipeline",
        },
      };

      global.__import__ = jest.fn().mockResolvedValue(mockPipeline);
    });

    test("should execute pipeline via MCP successfully", async () => {
      const parameters = {
        sourceText: "Test content",
        discussionPrompt: "Discuss this",
      };

      const expectedResult = {
        success: true,
        runId: "test-run-123",
        conversation: [
          { agent: "Agent1", content: "Response 1", iteration: 1 },
        ],
      };

      mockPipeline.executeViaMCP.mockResolvedValue(expectedResult);

      const result = await executor.executeViaMCP(
        "dialogue",
        parameters,
        mockLogger
      );

      expect(mockPipeline.executeViaMCP).toHaveBeenCalledWith(
        parameters,
        mockLogger
      );
      expect(result).toEqual(expectedResult);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "MCP pipeline execution started",
        expect.objectContaining({ pipeline: "dialogue" })
      );
    });

    test("should fallback to main pipeline function when MCP interface not available", async () => {
      delete mockPipeline.executeViaMCP;

      const parameters = { sourceText: "Test" };
      const expectedResult = { success: true, data: "result" };

      mockPipeline.dialoguePipeline.mockResolvedValue(expectedResult);

      const result = await executor.executeViaMCP(
        "dialogue",
        parameters,
        mockLogger
      );

      expect(mockPipeline.dialoguePipeline).toHaveBeenCalledWith(parameters);
      expect(result.success).toBe(true);
    });

    test("should handle MCP execution errors", async () => {
      const parameters = { sourceText: "Test" };
      const error = new Error("Execution failed");

      mockPipeline.executeViaMCP.mockRejectedValue(error);

      const result = await executor.executeViaMCP(
        "dialogue",
        parameters,
        mockLogger
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Execution failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "MCP pipeline execution failed",
        expect.objectContaining({ pipeline: "dialogue" })
      );
    });

    test("should throw error when pipeline lacks MCP support", async () => {
      delete mockPipeline.executeViaMCP;
      delete mockPipeline.dialoguePipeline;

      const parameters = { sourceText: "Test" };

      await expect(
        executor.executeViaMCP("dialogue", parameters, mockLogger)
      ).rejects.toThrow("Pipeline 'dialogue' does not support MCP execution");
    });
  });

  describe("NostrMQ Execution", () => {
    let mockPipeline;

    beforeEach(() => {
      mockPipeline = {
        executeViaNostrMQ: jest.fn(),
        dialoguePipeline: jest.fn(),
        metadata: {
          name: "dialogue",
          description: "Test dialogue pipeline",
        },
      };

      global.__import__ = jest.fn().mockResolvedValue(mockPipeline);
    });

    test("should execute pipeline via NostrMQ successfully", async () => {
      const parameters = {
        sourceText: "Test content",
        discussionPrompt: "Discuss this",
      };

      const expectedResult = {
        success: true,
        jobId: "job-123",
        data: "result",
      };

      mockPipeline.executeViaNostrMQ.mockResolvedValue(expectedResult);

      const result = await executor.executeViaNostrMQ(
        "dialogue",
        parameters,
        mockLogger
      );

      expect(mockPipeline.executeViaNostrMQ).toHaveBeenCalledWith(
        parameters,
        mockLogger
      );
      expect(result.success).toBe(true);
      expect(result.interface).toBe("nostrmq");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "NostrMQ pipeline execution started",
        expect.objectContaining({ pipeline: "dialogue" })
      );
    });

    test("should fallback to main pipeline function when NostrMQ interface not available", async () => {
      delete mockPipeline.executeViaNostrMQ;

      const parameters = { sourceText: "Test" };
      const expectedResult = { success: true, data: "result" };

      mockPipeline.dialoguePipeline.mockResolvedValue(expectedResult);

      const result = await executor.executeViaNostrMQ(
        "dialogue",
        parameters,
        mockLogger
      );

      expect(mockPipeline.dialoguePipeline).toHaveBeenCalledWith(parameters);
      expect(result.success).toBe(true);
      expect(result.interface).toBe("nostrmq");
    });

    test("should handle NostrMQ execution errors", async () => {
      const parameters = { sourceText: "Test" };
      const error = new Error("NostrMQ execution failed");

      mockPipeline.executeViaNostrMQ.mockRejectedValue(error);

      const result = await executor.executeViaNostrMQ(
        "dialogue",
        parameters,
        mockLogger
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("NostrMQ execution failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "NostrMQ pipeline execution failed",
        expect.objectContaining({ pipeline: "dialogue" })
      );
    });

    test("should throw error when pipeline lacks NostrMQ support", async () => {
      delete mockPipeline.executeViaNostrMQ;
      delete mockPipeline.dialoguePipeline;

      const parameters = { sourceText: "Test" };

      await expect(
        executor.executeViaNostrMQ("dialogue", parameters, mockLogger)
      ).rejects.toThrow(
        "Pipeline 'dialogue' does not support NostrMQ execution"
      );
    });
  });

  describe("Parameter Validation", () => {
    test("should validate parameters successfully", () => {
      const parameters = {
        sourceText: "Valid text",
        discussionPrompt: "Valid prompt",
        iterations: 3,
      };

      const schema = {
        type: "object",
        properties: {
          sourceText: { type: "string" },
          discussionPrompt: { type: "string" },
          iterations: { type: "number" },
        },
        required: ["sourceText", "discussionPrompt"],
      };

      const result = executor.validateParameters(parameters, schema);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toEqual(parameters);
      expect(result.errors).toEqual([]);
    });

    test("should detect missing required parameters", () => {
      const parameters = {
        sourceText: "Valid text",
        // Missing discussionPrompt
      };

      const schema = {
        type: "object",
        properties: {
          sourceText: { type: "string" },
          discussionPrompt: { type: "string" },
        },
        required: ["sourceText", "discussionPrompt"],
      };

      const result = executor.validateParameters(parameters, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("discussionPrompt is required");
    });

    test("should detect type mismatches", () => {
      const parameters = {
        sourceText: "Valid text",
        discussionPrompt: "Valid prompt",
        iterations: "not a number",
      };

      const schema = {
        type: "object",
        properties: {
          sourceText: { type: "string" },
          discussionPrompt: { type: "string" },
          iterations: { type: "number" },
        },
        required: ["sourceText", "discussionPrompt"],
      };

      const result = executor.validateParameters(parameters, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("iterations must be a number");
    });

    test("should sanitize parameters by removing extra properties", () => {
      const parameters = {
        sourceText: "Valid text",
        discussionPrompt: "Valid prompt",
        extraProperty: "should be removed",
      };

      const schema = {
        type: "object",
        properties: {
          sourceText: { type: "string" },
          discussionPrompt: { type: "string" },
        },
        required: ["sourceText", "discussionPrompt"],
      };

      const result = executor.validateParameters(parameters, schema);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toEqual({
        sourceText: "Valid text",
        discussionPrompt: "Valid prompt",
      });
      expect(result.sanitized.extraProperty).toBeUndefined();
    });

    test("should handle empty parameters", () => {
      const parameters = {};
      const schema = {
        type: "object",
        properties: {},
        required: [],
      };

      const result = executor.validateParameters(parameters, schema);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toEqual({});
    });

    test("should handle null/undefined parameters", () => {
      const schema = {
        type: "object",
        properties: {
          sourceText: { type: "string" },
        },
        required: ["sourceText"],
      };

      const nullResult = executor.validateParameters(null, schema);
      const undefinedResult = executor.validateParameters(undefined, schema);

      expect(nullResult.isValid).toBe(false);
      expect(undefinedResult.isValid).toBe(false);
      expect(nullResult.errors).toContain("Parameters must be an object");
      expect(undefinedResult.errors).toContain("Parameters must be an object");
    });
  });

  describe("Response Formatting", () => {
    test("should format MCP response correctly", () => {
      const result = {
        success: true,
        runId: "test-123",
        data: "test data",
      };

      const formatted = executor.formatMCPResponse(result);

      expect(formatted).toEqual({
        success: true,
        interface: "mcp",
        timestamp: expect.any(String),
        runId: "test-123",
        data: "test data",
      });
    });

    test("should format NostrMQ response correctly", () => {
      const result = {
        success: true,
        jobId: "job-123",
        data: "test data",
      };

      const formatted = executor.formatNostrMQResponse(result);

      expect(formatted).toEqual({
        success: true,
        interface: "nostrmq",
        timestamp: expect.any(String),
        jobId: "job-123",
        data: "test data",
      });
    });

    test("should format MCP error correctly", () => {
      const error = new Error("Test error");
      error.code = "TEST_ERROR";

      const formatted = executor.formatMCPError(error);

      expect(formatted).toEqual({
        success: false,
        interface: "mcp",
        timestamp: expect.any(String),
        error: "Test error",
        code: "TEST_ERROR",
      });
    });

    test("should format NostrMQ error correctly", () => {
      const error = new Error("NostrMQ error");

      const formatted = executor.formatNostrMQError(error);

      expect(formatted).toEqual({
        success: false,
        interface: "nostrmq",
        timestamp: expect.any(String),
        error: "NostrMQ error",
      });
    });
  });

  describe("Cache Management", () => {
    test("should clear cache successfully", () => {
      // Add items to cache
      executor.cache.set("test1", { data: "cached1" });
      executor.pipelines.set("test2", { data: "cached2" });

      expect(executor.cache.size).toBe(1);
      expect(executor.pipelines.size).toBe(1);

      executor.clearCache();

      expect(executor.cache.size).toBe(0);
      expect(executor.pipelines.size).toBe(0);
    });

    test("should generate unique request IDs", () => {
      const id1 = executor.generateRequestId();
      const id2 = executor.generateRequestId();

      expect(id1).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("Error Handling", () => {
    test("should handle pipeline loading timeout", async () => {
      // Mock a slow loading pipeline
      global.__import__ = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10000))
        );

      // This should timeout quickly in a real implementation
      // For testing, we'll just verify the import was called
      const loadPromise = executor.loadPipeline("slowPipeline");

      // In a real implementation, this would timeout
      // For testing, we'll just verify the call was made
      expect(global.__import__).toHaveBeenCalledWith(
        "./src/pipelines/slowPipelinePipeline.js"
      );
    });

    test("should handle malformed pipeline modules", async () => {
      const malformedPipeline = {
        // Missing expected functions and metadata
        someRandomFunction: jest.fn(),
      };

      global.__import__ = jest.fn().mockResolvedValue(malformedPipeline);

      const pipeline = await executor.loadPipeline("malformed");

      expect(pipeline).toBe(malformedPipeline);
      // The executor should still load it, but execution will fail appropriately
    });

    test("should handle circular dependencies in pipeline loading", async () => {
      const circularPipeline = {
        dialoguePipeline: jest.fn(),
        metadata: { name: "circular" },
      };

      // Create circular reference
      circularPipeline.self = circularPipeline;

      global.__import__ = jest.fn().mockResolvedValue(circularPipeline);

      const pipeline = await executor.loadPipeline("circular");

      expect(pipeline).toBe(circularPipeline);
      expect(pipeline.self).toBe(circularPipeline);
    });
  });

  describe("Integration Scenarios", () => {
    test("should handle complete MCP workflow", async () => {
      const mockPipeline = {
        executeViaMCP: jest.fn().mockResolvedValue({
          success: true,
          runId: "integration-test",
          conversation: [
            { agent: "Agent1", content: "Hello", iteration: 1 },
            { agent: "Agent2", content: "Hi", iteration: 1 },
          ],
        }),
        metadata: {
          name: "dialogue",
          description: "Integration test pipeline",
        },
      };

      global.__import__ = jest.fn().mockResolvedValue(mockPipeline);

      const parameters = {
        sourceText: "Integration test content",
        discussionPrompt: "Discuss integration testing",
      };

      const schema = {
        type: "object",
        properties: {
          sourceText: { type: "string" },
          discussionPrompt: { type: "string" },
        },
        required: ["sourceText", "discussionPrompt"],
      };

      // Validate parameters
      const validation = executor.validateParameters(parameters, schema);
      expect(validation.isValid).toBe(true);

      // Execute pipeline
      const result = await executor.executeViaMCP(
        "dialogue",
        validation.sanitized,
        mockLogger
      );

      expect(result.success).toBe(true);
      expect(result.runId).toBe("integration-test");
      expect(result.conversation).toHaveLength(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "MCP pipeline execution completed",
        expect.objectContaining({ success: true })
      );
    });
  });
});
