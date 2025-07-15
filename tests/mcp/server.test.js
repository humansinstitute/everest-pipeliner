import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { PipelinerMCPServer } from "../../src/mcp/server.js";
import { getMCPConfig } from "../../src/mcp/config.js";

// Mock dependencies
jest.mock("../../src/mcp/config.js");
jest.mock("../../src/shared/executor.js");
jest.mock("../../src/mcp/toolRegistry.js");
jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("@modelcontextprotocol/sdk/server/stdio.js");

describe("PipelinerMCPServer", () => {
  let server;
  let mockConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      enabled: true,
      port: 3001,
      host: "localhost",
      logLevel: "info",
      toolPrefix: "run_pipeliner_",
      includeDebugInfo: false,
      localOnly: true,
      allowedHosts: ["localhost"],
      defaultTimeout: 300000,
      maxConcurrent: 1,
    };

    getMCPConfig.mockReturnValue(mockConfig);
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
      server = null;
    }
  });

  describe("Constructor", () => {
    test("should create server with default config", () => {
      server = new PipelinerMCPServer();

      expect(server.config).toEqual(mockConfig);
      expect(server.tools).toBeInstanceOf(Map);
      expect(server.tools.size).toBe(0);
    });

    test("should create server with custom config", () => {
      const customConfig = { ...mockConfig, port: 4001 };
      server = new PipelinerMCPServer(customConfig);

      expect(server.config.port).toBe(4001);
    });

    test("should initialize with proper capabilities", () => {
      server = new PipelinerMCPServer();

      expect(server.server).toBeDefined();
      expect(server.executor).toBeDefined();
      expect(server.registry).toBeDefined();
      expect(server.logger).toBeDefined();
    });
  });

  describe("Initialization", () => {
    beforeEach(() => {
      server = new PipelinerMCPServer(mockConfig);
    });

    test("should initialize successfully with enabled config", async () => {
      // Mock registry methods
      const mockPipelines = [
        { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        {
          name: "contentWaterfall",
          path: "./src/pipelines/contentWaterfallPipeline.js",
        },
      ];

      const mockTools = [
        {
          name: "run_pipeliner_dialogue",
          description: "Execute dialogue pipeline",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "run_pipeliner_contentWaterfall",
          description: "Execute content waterfall pipeline",
          inputSchema: { type: "object", properties: {} },
        },
      ];

      server.registry.discoverPipelines = jest
        .fn()
        .mockResolvedValue(mockPipelines);
      server.registry.registerPipelineAsTool = jest
        .fn()
        .mockReturnValueOnce(mockTools[0])
        .mockReturnValueOnce(mockTools[1]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 2,
        registeredTools: 2,
        interfaces: { mcp: 2, nostrmq: 2, cli: 2 },
      });

      await server.initialize();

      expect(server.registry.discoverPipelines).toHaveBeenCalled();
      expect(server.registry.registerPipelineAsTool).toHaveBeenCalledTimes(2);
      expect(server.tools.size).toBe(2);
      expect(server.tools.has("run_pipeliner_dialogue")).toBe(true);
      expect(server.tools.has("run_pipeliner_contentWaterfall")).toBe(true);
    });

    test("should throw error when server is disabled", async () => {
      server.config.enabled = false;

      await expect(server.initialize()).rejects.toThrow(
        "MCP server is disabled"
      );
    });

    test("should handle initialization errors gracefully", async () => {
      server.registry.discoverPipelines = jest
        .fn()
        .mockRejectedValue(new Error("Discovery failed"));

      await expect(server.initialize()).rejects.toThrow("Discovery failed");
    });
  });

  describe("Tool Execution", () => {
    beforeEach(async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock successful initialization
      const mockTool = {
        name: "run_pipeliner_dialogue",
        description: "Execute dialogue pipeline",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string" },
            discussionPrompt: { type: "string" },
          },
          required: ["sourceText", "discussionPrompt"],
        },
      };

      server.registry.discoverPipelines = jest
        .fn()
        .mockResolvedValue([
          { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        ]);
      server.registry.registerPipelineAsTool = jest
        .fn()
        .mockReturnValue(mockTool);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 1,
        registeredTools: 1,
      });

      await server.initialize();
    });

    test("should execute tool successfully with valid parameters", async () => {
      const toolName = "run_pipeliner_dialogue";
      const args = {
        sourceText: "Test content",
        discussionPrompt: "Discuss this content",
      };

      const mockResult = {
        success: true,
        runId: "test-run-123",
        conversation: [
          { agent: "Agent1", content: "Response 1", iteration: 1 },
          { agent: "Agent2", content: "Response 2", iteration: 1 },
        ],
      };

      // Mock executor methods
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: args,
      });
      server.executor.executeViaMCP = jest.fn().mockResolvedValue(mockResult);

      const result = await server.executeTool(toolName, args);

      expect(server.executor.validateParameters).toHaveBeenCalledWith(
        args,
        server.tools.get(toolName).inputSchema
      );
      expect(server.executor.executeViaMCP).toHaveBeenCalledWith(
        "dialogue",
        args,
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    test("should handle validation errors", async () => {
      const toolName = "run_pipeliner_dialogue";
      const args = { sourceText: "Test content" }; // Missing required discussionPrompt

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: false,
        errors: ["discussionPrompt is required"],
      });

      const result = await server.executeTool(toolName, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("validation");
      expect(result.details).toContain("discussionPrompt is required");
    });

    test("should handle execution errors", async () => {
      const toolName = "run_pipeliner_dialogue";
      const args = {
        sourceText: "Test content",
        discussionPrompt: "Discuss this content",
      };

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: args,
      });
      server.executor.executeViaMCP = jest
        .fn()
        .mockRejectedValue(new Error("Pipeline execution failed"));

      const result = await server.executeTool(toolName, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Pipeline execution failed");
    });

    test("should reject invalid tool names", async () => {
      await expect(server.executeTool("invalid_tool", {})).rejects.toThrow(
        "Invalid tool name"
      );
    });

    test("should reject non-existent tools", async () => {
      await expect(
        server.executeTool("run_pipeliner_nonexistent", {})
      ).rejects.toThrow("Tool not found");
    });
  });

  describe("Server Lifecycle", () => {
    beforeEach(() => {
      server = new PipelinerMCPServer(mockConfig);
    });

    test("should start server successfully", async () => {
      const mockTransport = {
        connect: jest.fn().mockResolvedValue(undefined),
      };

      // Mock the transport creation
      const { StdioServerTransport } = await import(
        "@modelcontextprotocol/sdk/server/stdio.js"
      );
      StdioServerTransport.mockImplementation(() => mockTransport);

      server.server.connect = jest.fn().mockResolvedValue(undefined);

      await server.start();

      expect(server.server.connect).toHaveBeenCalledWith(mockTransport);
    });

    test("should stop server successfully", async () => {
      server.server.close = jest.fn().mockResolvedValue(undefined);

      await server.stop();

      expect(server.server.close).toHaveBeenCalled();
    });
  });

  describe("Status and Information", () => {
    beforeEach(async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock initialization
      server.registry.discoverPipelines = jest.fn().mockResolvedValue([]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 0,
        registeredTools: 0,
      });

      await server.initialize();
    });

    test("should return correct status", () => {
      const status = server.getStatus();

      expect(status).toEqual({
        enabled: true,
        initialized: false, // No tools registered
        toolCount: 0,
        tools: [],
        config: {
          host: "localhost",
          port: 3001,
          logLevel: "info",
          localOnly: true,
        },
      });
    });

    test("should list tools correctly", () => {
      const tools = server.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(0);
    });

    test("should generate unique request IDs", () => {
      const id1 = server.generateRequestId();
      const id2 = server.generateRequestId();

      expect(id1).toMatch(/^mcp_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^mcp_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("Tool Refresh", () => {
    beforeEach(async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Initial setup
      server.registry.discoverPipelines = jest.fn().mockResolvedValue([]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 0,
        registeredTools: 0,
      });

      await server.initialize();
    });

    test("should refresh tools successfully", async () => {
      const newTools = [
        {
          name: "run_pipeliner_newPipeline",
          description: "New pipeline",
          inputSchema: { type: "object", properties: {} },
        },
      ];

      server.registry.refresh = jest.fn().mockResolvedValue(undefined);
      server.registry.getAllTools = jest.fn().mockReturnValue(newTools);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 1,
        registeredTools: 1,
      });
      server.executor.clearCache = jest.fn();

      await server.refresh();

      expect(server.executor.clearCache).toHaveBeenCalled();
      expect(server.registry.refresh).toHaveBeenCalled();
      expect(server.tools.size).toBe(1);
      expect(server.tools.has("run_pipeliner_newPipeline")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed requests gracefully", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock initialization
      server.registry.discoverPipelines = jest.fn().mockResolvedValue([]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 0,
        registeredTools: 0,
      });

      await server.initialize();

      // Test with null arguments
      await expect(
        server.executeTool("run_pipeliner_test", null)
      ).rejects.toThrow();
    });

    test("should handle server errors during startup", async () => {
      server = new PipelinerMCPServer(mockConfig);

      server.server.connect = jest
        .fn()
        .mockRejectedValue(new Error("Connection failed"));

      await expect(server.start()).rejects.toThrow("Connection failed");
    });
  });
});
