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
import { ServiceManager } from "../../src/services/serviceManager.js";

// Mock external dependencies
jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("@modelcontextprotocol/sdk/server/stdio.js");
jest.mock("../../src/services/everest.service.js");

describe("MCP Integration Tests", () => {
  let server;
  let serviceManager;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      enabled: true,
      port: 3001,
      host: "localhost",
      logLevel: "info",
      toolPrefix: "run_pipeliner_",
      includeDebugInfo: false,
      localOnly: true,
      pipelineDirectory: "./src/pipelines",
      autoDiscovery: true,
      cacheEnabled: false, // Disable cache for testing
    };

    serviceManager = new ServiceManager();
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
      server = null;
    }

    if (serviceManager) {
      try {
        await serviceManager.stopAllServices();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("End-to-End MCP Workflow", () => {
    test("should complete full server lifecycle", async () => {
      // Mock pipeline discovery
      const mockPipelines = [
        { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        {
          name: "contentWaterfall",
          path: "./src/pipelines/contentWaterfallPipeline.js",
        },
      ];

      const mockDialogueTool = {
        name: "run_pipeliner_dialogue",
        description: "Execute dialogue between two agents",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string" },
            discussionPrompt: { type: "string" },
            iterations: { type: "number" },
          },
          required: ["sourceText", "discussionPrompt"],
        },
      };

      const mockWaterfallTool = {
        name: "run_pipeliner_contentWaterfall",
        description: "Transform content into social media posts",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string" },
            customFocus: { type: "string" },
          },
          required: ["sourceText"],
        },
      };

      // Create server instance
      server = new PipelinerMCPServer(mockConfig);

      // Mock registry methods
      server.registry.discoverPipelines = jest
        .fn()
        .mockResolvedValue(mockPipelines);
      server.registry.registerPipelineAsTool = jest
        .fn()
        .mockReturnValueOnce(mockDialogueTool)
        .mockReturnValueOnce(mockWaterfallTool);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 2,
        registeredTools: 2,
        interfaces: { mcp: 2, nostrmq: 2, cli: 2 },
      });

      // Mock server connection
      server.server.connect = jest.fn().mockResolvedValue(undefined);
      server.server.close = jest.fn().mockResolvedValue(undefined);

      // 1. Initialize server
      await server.initialize();

      expect(server.tools.size).toBe(2);
      expect(server.tools.has("run_pipeliner_dialogue")).toBe(true);
      expect(server.tools.has("run_pipeliner_contentWaterfall")).toBe(true);

      // 2. Start server
      await server.start();

      expect(server.server.connect).toHaveBeenCalled();

      // 3. Verify server status
      const status = server.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.initialized).toBe(true);
      expect(status.toolCount).toBe(2);

      // 4. List available tools
      const tools = server.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual([
        "run_pipeliner_dialogue",
        "run_pipeliner_contentWaterfall",
      ]);

      // 5. Stop server
      await server.stop();

      expect(server.server.close).toHaveBeenCalled();
    });

    test("should handle tool execution workflow", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock a single dialogue tool
      const mockTool = {
        name: "run_pipeliner_dialogue",
        description: "Execute dialogue pipeline",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string" },
            discussionPrompt: { type: "string" },
            iterations: { type: "number" },
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

      // Mock successful pipeline execution
      const mockResult = {
        success: true,
        runId: "integration-test-123",
        conversation: [
          {
            agent: "Agent1",
            content: "Hello, let's discuss this topic.",
            iteration: 1,
          },
          {
            agent: "Agent2",
            content: "Great! I have some thoughts on this.",
            iteration: 1,
          },
          {
            agent: "Agent1",
            content: "Please share your perspective.",
            iteration: 2,
          },
          { agent: "Agent2", content: "Here's what I think...", iteration: 2 },
        ],
        summary: {
          content: "The agents had a productive discussion about the topic.",
        },
        pipeline: {
          statistics: {
            durationSeconds: 45,
            completedSteps: 4,
            totalSteps: 4,
          },
          costs: {
            total: 0.0234,
          },
        },
      };

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: {
          sourceText: "Integration test content for discussion",
          discussionPrompt: "Please analyze and discuss the key themes",
          iterations: 2,
        },
      });

      server.executor.executeViaMCP = jest.fn().mockResolvedValue(mockResult);

      // Execute tool
      const toolArgs = {
        sourceText: "Integration test content for discussion",
        discussionPrompt: "Please analyze and discuss the key themes",
        iterations: 2,
      };

      const result = await server.executeTool(
        "run_pipeliner_dialogue",
        toolArgs
      );

      // Verify execution
      expect(server.executor.validateParameters).toHaveBeenCalledWith(
        toolArgs,
        mockTool.inputSchema
      );
      expect(server.executor.executeViaMCP).toHaveBeenCalledWith(
        "dialogue",
        toolArgs,
        expect.any(Object)
      );

      // Verify result format
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain(
        "Pipeline executed successfully"
      );
      expect(result.content[0].text).toContain("Run ID: integration-test-123");
      expect(result.content[0].text).toContain("Duration: 45 seconds");
      expect(result.content[0].text).toContain("Cost: $0.0234");
      expect(result._meta.success).toBe(true);
      expect(result._meta.pipeline).toBe("dialogue");
    });

    test("should handle validation errors gracefully", async () => {
      server = new PipelinerMCPServer(mockConfig);

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

      // Mock validation failure
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: false,
        errors: [
          "sourceText is required",
          "discussionPrompt must be a non-empty string",
        ],
      });

      // Execute tool with invalid parameters
      const invalidArgs = {
        sourceText: "", // Empty string
        // Missing discussionPrompt
      };

      const result = await server.executeTool(
        "run_pipeliner_dialogue",
        invalidArgs
      );

      // Verify validation error response
      expect(result.success).toBe(false);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Parameter validation failed");
      expect(result.content[0].text).toContain("sourceText is required");
      expect(result.content[0].text).toContain(
        "discussionPrompt must be a non-empty string"
      );
      expect(result._meta.success).toBe(false);
    });

    test("should handle pipeline execution errors", async () => {
      server = new PipelinerMCPServer(mockConfig);

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

      // Mock successful validation but failed execution
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: {
          sourceText: "Test content",
          discussionPrompt: "Test prompt",
        },
      });

      server.executor.executeViaMCP = jest
        .fn()
        .mockRejectedValue(new Error("Pipeline execution failed: API timeout"));

      const validArgs = {
        sourceText: "Test content",
        discussionPrompt: "Test prompt",
      };

      const result = await server.executeTool(
        "run_pipeliner_dialogue",
        validArgs
      );

      // Verify error response
      expect(result.success).toBe(false);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Pipeline execution failed: API timeout"
      );
      expect(result._meta.success).toBe(false);
    });
  });

  describe("Service Manager Integration", () => {
    test("should manage MCP server lifecycle through service manager", async () => {
      // Mock MCP server creation
      const mockServer = {
        initialize: jest.fn().mockResolvedValue(undefined),
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getStatus: jest.fn().mockReturnValue({
          enabled: true,
          initialized: true,
          toolCount: 2,
          tools: ["run_pipeliner_dialogue", "run_pipeliner_contentWaterfall"],
          config: {
            host: "localhost",
            port: 3001,
            logLevel: "info",
            localOnly: true,
          },
        }),
        tools: new Map([
          ["run_pipeliner_dialogue", { name: "run_pipeliner_dialogue" }],
          [
            "run_pipeliner_contentWaterfall",
            { name: "run_pipeliner_contentWaterfall" },
          ],
        ]),
        listTools: jest
          .fn()
          .mockReturnValue([
            { name: "run_pipeliner_dialogue" },
            { name: "run_pipeliner_contentWaterfall" },
          ]),
      };

      // Mock the PipelinerMCPServer constructor
      const originalPipelinerMCPServer = PipelinerMCPServer;
      global.PipelinerMCPServer = jest
        .fn()
        .mockImplementation(() => mockServer);

      try {
        // Start MCP server through service manager
        const startResult = await serviceManager.startMCPServer(mockConfig);

        expect(startResult.success).toBe(true);
        expect(startResult.service).toBe("mcp");
        expect(startResult.state).toBe("running");
        expect(startResult.details.toolCount).toBe(2);
        expect(startResult.details.tools).toEqual([
          "run_pipeliner_dialogue",
          "run_pipeliner_contentWaterfall",
        ]);

        // Verify server was initialized and started
        expect(mockServer.initialize).toHaveBeenCalled();
        expect(mockServer.start).toHaveBeenCalled();

        // Check service status
        const status = serviceManager.getServiceStatus();
        expect(status.services.mcp.state).toBe("running");
        expect(status.services.mcp.running).toBe(true);
        expect(status.services.mcp.toolCount).toBe(2);

        // Stop MCP server
        const stopResult = await serviceManager.stopMCPServer();
        expect(stopResult.success).toBe(true);
        expect(stopResult.service).toBe("mcp");
        expect(stopResult.state).toBe("stopped");

        expect(mockServer.stop).toHaveBeenCalled();
      } finally {
        // Restore original constructor
        global.PipelinerMCPServer = originalPipelinerMCPServer;
      }
    });

    test("should handle dual service startup", async () => {
      const startResult = await serviceManager.startBothServices({
        mcp: mockConfig,
        nostrmq: {},
      });

      expect(startResult.overall.servicesStarted).toBe(1); // Only MCP should start
      expect(startResult.overall.partialSuccess).toBe(true);
      expect(startResult.mcp.success).toBe(true);
      expect(startResult.nostrmq.success).toBe(false);
      expect(startResult.nostrmq.error).toContain("not yet implemented");
    });

    test("should provide comprehensive service health status", () => {
      const healthStatus = serviceManager.getHealthStatus();

      expect(healthStatus).toHaveProperty("healthy");
      expect(healthStatus).toHaveProperty("services");
      expect(healthStatus).toHaveProperty("summary");

      expect(healthStatus.services).toBeInstanceOf(Array);
      expect(healthStatus.summary.total).toBe(2); // MCP + NostrMQ
      expect(healthStatus.summary.percentage).toBeGreaterThanOrEqual(0);
      expect(healthStatus.summary.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    test("should handle server initialization failure", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock initialization failure
      server.registry.discoverPipelines = jest
        .fn()
        .mockRejectedValue(new Error("Pipeline directory not found"));

      await expect(server.initialize()).rejects.toThrow(
        "Pipeline directory not found"
      );
    });

    test("should handle server startup failure", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock successful initialization but failed startup
      server.registry.discoverPipelines = jest.fn().mockResolvedValue([]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 0,
        registeredTools: 0,
      });

      await server.initialize();

      server.server.connect = jest
        .fn()
        .mockRejectedValue(new Error("Failed to bind to port 3001"));

      await expect(server.start()).rejects.toThrow(
        "Failed to bind to port 3001"
      );
    });

    test("should handle tool refresh during operation", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Initial setup
      server.registry.discoverPipelines = jest
        .fn()
        .mockResolvedValue([
          { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        ]);
      server.registry.registerPipelineAsTool = jest.fn().mockReturnValue({
        name: "run_pipeliner_dialogue",
        description: "Dialogue pipeline",
      });
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 1,
        registeredTools: 1,
      });

      await server.initialize();
      expect(server.tools.size).toBe(1);

      // Mock refresh with new tools
      const newTools = [
        { name: "run_pipeliner_dialogue", description: "Updated dialogue" },
        { name: "run_pipeliner_newPipeline", description: "New pipeline" },
      ];

      server.registry.refresh = jest.fn().mockResolvedValue(undefined);
      server.registry.getAllTools = jest.fn().mockReturnValue(newTools);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 2,
        registeredTools: 2,
      });
      server.executor.clearCache = jest.fn();

      await server.refresh();

      expect(server.tools.size).toBe(2);
      expect(server.tools.has("run_pipeliner_dialogue")).toBe(true);
      expect(server.tools.has("run_pipeliner_newPipeline")).toBe(true);
      expect(server.executor.clearCache).toHaveBeenCalled();
    });

    test("should handle concurrent tool executions", async () => {
      server = new PipelinerMCPServer(mockConfig);

      const mockTool = {
        name: "run_pipeliner_dialogue",
        description: "Dialogue pipeline",
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

      // Mock validation and execution
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: { sourceText: "Test", discussionPrompt: "Test" },
      });

      let executionCount = 0;
      server.executor.executeViaMCP = jest.fn().mockImplementation(async () => {
        executionCount++;
        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          success: true,
          runId: `concurrent-test-${executionCount}`,
          conversation: [],
        };
      });

      // Execute multiple tools concurrently
      const args = {
        sourceText: "Test content",
        discussionPrompt: "Test prompt",
      };
      const promises = [
        server.executeTool("run_pipeliner_dialogue", args),
        server.executeTool("run_pipeliner_dialogue", args),
        server.executeTool("run_pipeliner_dialogue", args),
      ];

      const results = await Promise.all(promises);

      // All executions should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.content[0].text).toContain(
          `concurrent-test-${index + 1}`
        );
      });

      expect(server.executor.executeViaMCP).toHaveBeenCalledTimes(3);
    });
  });
});
