import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { PipelineToolRegistry } from "../../src/mcp/toolRegistry.js";
import { getMCPConfig } from "../../src/mcp/config.js";
import fs from "fs/promises";
import path from "path";

// Mock dependencies
jest.mock("../../src/mcp/config.js");
jest.mock("fs/promises");
jest.mock("path");

describe("PipelineToolRegistry", () => {
  let registry;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      enabled: true,
      pipelineDirectory: "./src/pipelines",
      toolPrefix: "run_pipeliner_",
      autoDiscovery: true,
      cacheEnabled: true,
      cacheTTL: 300000,
    };

    getMCPConfig.mockReturnValue(mockConfig);
    registry = new PipelineToolRegistry(mockConfig);
  });

  describe("Constructor", () => {
    test("should initialize with provided config", () => {
      expect(registry.config).toEqual(mockConfig);
      expect(registry.tools).toBeInstanceOf(Map);
      expect(registry.pipelines).toBeInstanceOf(Map);
      expect(registry.cache).toBeInstanceOf(Map);
    });

    test("should use default config when none provided", () => {
      const defaultRegistry = new PipelineToolRegistry();
      expect(defaultRegistry.config).toEqual(mockConfig);
    });
  });

  describe("Pipeline Discovery", () => {
    beforeEach(() => {
      // Mock file system operations
      fs.readdir = jest.fn();
      fs.stat = jest.fn();
      path.join = jest.fn((dir, file) => `${dir}/${file}`);
      path.extname = jest.fn((file) => {
        if (file.endsWith(".js")) return ".js";
        if (file.endsWith(".mjs")) return ".mjs";
        return "";
      });
      path.resolve = jest.fn((dir) => `/absolute${dir}`);
    });

    test("should discover pipeline files successfully", async () => {
      const mockFiles = [
        "dialoguePipeline.js",
        "facilitatedDialoguePipeline.js",
        "contentWaterfallPipeline.js",
        "simpleChatPipeline.js",
        "notAPipeline.txt", // Should be ignored
        "helper.js", // Should be ignored (doesn't end with Pipeline.js)
      ];

      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockImplementation((filePath) => ({
        isFile: () =>
          filePath.includes("Pipeline.js") || filePath.includes(".txt"),
        isDirectory: () => false,
      }));

      const pipelines = await registry.discoverPipelines();

      expect(pipelines).toHaveLength(4);
      expect(pipelines.map((p) => p.name)).toEqual([
        "dialogue",
        "facilitatedDialogue",
        "contentWaterfall",
        "simpleChat",
      ]);
      expect(pipelines.every((p) => p.path.includes("Pipeline.js"))).toBe(true);
    });

    test("should handle empty pipeline directory", async () => {
      fs.readdir.mockResolvedValue([]);

      const pipelines = await registry.discoverPipelines();

      expect(pipelines).toHaveLength(0);
    });

    test("should handle directory read errors", async () => {
      fs.readdir.mockRejectedValue(new Error("Directory not found"));

      await expect(registry.discoverPipelines()).rejects.toThrow(
        "Directory not found"
      );
    });

    test("should filter out non-pipeline files", async () => {
      const mockFiles = [
        "helper.js",
        "utils.js",
        "config.json",
        "README.md",
        "actualPipeline.js",
      ];

      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockImplementation((filePath) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));

      const pipelines = await registry.discoverPipelines();

      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].name).toBe("actual");
    });

    test("should handle subdirectories correctly", async () => {
      const mockFiles = ["subdir", "dialoguePipeline.js"];

      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockImplementation((filePath) => ({
        isFile: () => filePath.includes("Pipeline.js"),
        isDirectory: () => filePath.includes("subdir"),
      }));

      const pipelines = await registry.discoverPipelines();

      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].name).toBe("dialogue");
    });
  });

  describe("Pipeline Loading and Analysis", () => {
    test("should load and analyze pipeline module successfully", async () => {
      const mockPipeline = {
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
      };

      const mockModule = {
        dialoguePipeline: jest.fn(),
        executeViaMCP: jest.fn(),
        executeViaNostrMQ: jest.fn(),
        metadata: {
          name: "dialogue",
          description: "Execute dialogue between two agents",
          version: "1.0.0",
          parameters: {
            sourceText: { type: "string", required: true },
            discussionPrompt: { type: "string", required: true },
            iterations: { type: "number", required: false, default: 3 },
          },
          interfaces: ["mcp", "nostrmq", "cli"],
        },
      };

      // Mock dynamic import
      const originalImport = global.__import__;
      global.__import__ = jest.fn().mockResolvedValue(mockModule);

      const analysis = await registry.loadAndAnalyzePipeline(mockPipeline);

      expect(analysis).toEqual({
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
        metadata: mockModule.metadata,
        interfaces: ["mcp", "nostrmq", "cli"],
        hasMCPInterface: true,
        hasNostrMQInterface: true,
        mainFunction: "dialoguePipeline",
        mcpFunction: "executeViaMCP",
        nostrmqFunction: "executeViaNostrMQ",
      });

      // Restore original import
      global.__import__ = originalImport;
    });

    test("should handle missing metadata gracefully", async () => {
      const mockPipeline = {
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
      };

      const mockModule = {
        dialoguePipeline: jest.fn(),
        executeViaMCP: jest.fn(),
      };

      global.__import__ = jest.fn().mockResolvedValue(mockModule);

      const analysis = await registry.loadAndAnalyzePipeline(mockPipeline);

      expect(analysis.metadata).toEqual({
        name: "dialogue",
        description: "Pipeline: dialogue",
        version: "1.0.0",
        parameters: {},
        interfaces: ["cli"],
      });
      expect(analysis.interfaces).toContain("mcp");
      expect(analysis.hasMCPInterface).toBe(true);
    });

    test("should handle module loading errors", async () => {
      const mockPipeline = {
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
      };

      global.__import__ = jest
        .fn()
        .mockRejectedValue(new Error("Module not found"));

      await expect(
        registry.loadAndAnalyzePipeline(mockPipeline)
      ).rejects.toThrow("Module not found");
    });
  });

  describe("Tool Registration", () => {
    test("should register pipeline as MCP tool successfully", () => {
      const mockPipelineInfo = {
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
        metadata: {
          name: "dialogue",
          description: "Execute dialogue between two agents",
          version: "1.0.0",
          parameters: {
            sourceText: { type: "string", required: true },
            discussionPrompt: { type: "string", required: true },
            iterations: { type: "number", required: false, default: 3 },
          },
          interfaces: ["mcp", "nostrmq", "cli"],
        },
        interfaces: ["mcp", "nostrmq", "cli"],
        hasMCPInterface: true,
      };

      const tool = registry.registerPipelineAsTool(mockPipelineInfo);

      expect(tool).toEqual({
        name: "run_pipeliner_dialogue",
        description: "Execute dialogue between two agents",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string", description: "sourceText parameter" },
            discussionPrompt: {
              type: "string",
              description: "discussionPrompt parameter",
            },
            iterations: {
              type: "number",
              description: "iterations parameter (default: 3)",
            },
          },
          required: ["sourceText", "discussionPrompt"],
        },
        interfaces: ["mcp", "nostrmq", "cli"],
        metadata: mockPipelineInfo.metadata,
      });

      expect(registry.tools.has("run_pipeliner_dialogue")).toBe(true);
    });

    test("should handle pipelines without MCP interface", () => {
      const mockPipelineInfo = {
        name: "cliOnly",
        metadata: {
          name: "cliOnly",
          description: "CLI only pipeline",
          parameters: {},
          interfaces: ["cli"],
        },
        interfaces: ["cli"],
        hasMCPInterface: false,
      };

      expect(() => registry.registerPipelineAsTool(mockPipelineInfo)).toThrow(
        "Pipeline cliOnly does not support MCP interface"
      );
    });

    test("should generate correct input schema from parameters", () => {
      const mockPipelineInfo = {
        name: "test",
        metadata: {
          name: "test",
          description: "Test pipeline",
          parameters: {
            requiredParam: { type: "string", required: true },
            optionalParam: { type: "number", required: false, default: 42 },
            booleanParam: { type: "boolean", required: true },
            arrayParam: { type: "array", required: false },
          },
          interfaces: ["mcp"],
        },
        interfaces: ["mcp"],
        hasMCPInterface: true,
      };

      const tool = registry.registerPipelineAsTool(mockPipelineInfo);

      expect(tool.inputSchema).toEqual({
        type: "object",
        properties: {
          requiredParam: {
            type: "string",
            description: "requiredParam parameter",
          },
          optionalParam: {
            type: "number",
            description: "optionalParam parameter (default: 42)",
          },
          booleanParam: {
            type: "boolean",
            description: "booleanParam parameter",
          },
          arrayParam: { type: "array", description: "arrayParam parameter" },
        },
        required: ["requiredParam", "booleanParam"],
      });
    });
  });

  describe("Cache Management", () => {
    test("should cache pipeline analysis results", async () => {
      registry.config.cacheEnabled = true;

      const mockPipeline = {
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
      };

      const mockModule = {
        dialoguePipeline: jest.fn(),
        executeViaMCP: jest.fn(),
        metadata: {
          name: "dialogue",
          description: "Test pipeline",
          parameters: {},
          interfaces: ["mcp"],
        },
      };

      global.__import__ = jest.fn().mockResolvedValue(mockModule);

      // First call should load and cache
      const result1 = await registry.loadAndAnalyzePipeline(mockPipeline);
      expect(global.__import__).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await registry.loadAndAnalyzePipeline(mockPipeline);
      expect(global.__import__).toHaveBeenCalledTimes(1); // Still only called once
      expect(result1).toEqual(result2);
    });

    test("should bypass cache when disabled", async () => {
      registry.config.cacheEnabled = false;

      const mockPipeline = {
        name: "dialogue",
        path: "./src/pipelines/dialoguePipeline.js",
      };

      const mockModule = {
        dialoguePipeline: jest.fn(),
        executeViaMCP: jest.fn(),
        metadata: {
          name: "dialogue",
          description: "Test pipeline",
          parameters: {},
          interfaces: ["mcp"],
        },
      };

      global.__import__ = jest.fn().mockResolvedValue(mockModule);

      // Both calls should load from file
      await registry.loadAndAnalyzePipeline(mockPipeline);
      await registry.loadAndAnalyzePipeline(mockPipeline);

      expect(global.__import__).toHaveBeenCalledTimes(2);
    });

    test("should clear cache on refresh", async () => {
      registry.config.cacheEnabled = true;

      // Add something to cache
      registry.cache.set("test", { data: "cached" });
      expect(registry.cache.size).toBe(1);

      await registry.refresh();

      expect(registry.cache.size).toBe(0);
    });
  });

  describe("Statistics and Information", () => {
    beforeEach(() => {
      // Add some mock tools
      registry.tools.set("run_pipeliner_dialogue", {
        name: "run_pipeliner_dialogue",
        interfaces: ["mcp", "nostrmq", "cli"],
      });
      registry.tools.set("run_pipeliner_waterfall", {
        name: "run_pipeliner_waterfall",
        interfaces: ["mcp", "cli"],
      });
      registry.tools.set("run_pipeliner_simple", {
        name: "run_pipeliner_simple",
        interfaces: ["cli"],
      });
    });

    test("should return correct statistics", () => {
      const stats = registry.getStats();

      expect(stats).toEqual({
        totalPipelines: 3,
        registeredTools: 3,
        cacheSize: 0,
        interfaces: {
          mcp: 2,
          nostrmq: 1,
          cli: 3,
        },
        lastRefresh: null,
      });
    });

    test("should return all tools", () => {
      const tools = registry.getAllTools();

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toEqual([
        "run_pipeliner_dialogue",
        "run_pipeliner_waterfall",
        "run_pipeliner_simple",
      ]);
    });

    test("should filter tools by interface", () => {
      const mcpTools = registry.getToolsByInterface("mcp");
      const cliTools = registry.getToolsByInterface("cli");
      const nostrmqTools = registry.getToolsByInterface("nostrmq");

      expect(mcpTools).toHaveLength(2);
      expect(cliTools).toHaveLength(3);
      expect(nostrmqTools).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid pipeline names", () => {
      const invalidPipeline = {
        name: "",
        metadata: { interfaces: ["mcp"] },
        interfaces: ["mcp"],
        hasMCPInterface: true,
      };

      expect(() => registry.registerPipelineAsTool(invalidPipeline)).toThrow(
        "Invalid pipeline name"
      );
    });

    test("should handle missing metadata", () => {
      const pipelineWithoutMetadata = {
        name: "test",
        interfaces: ["mcp"],
        hasMCPInterface: true,
      };

      expect(() =>
        registry.registerPipelineAsTool(pipelineWithoutMetadata)
      ).toThrow("Pipeline metadata is required");
    });

    test("should handle duplicate tool registration", () => {
      const mockPipelineInfo = {
        name: "duplicate",
        metadata: {
          name: "duplicate",
          description: "Duplicate pipeline",
          parameters: {},
          interfaces: ["mcp"],
        },
        interfaces: ["mcp"],
        hasMCPInterface: true,
      };

      // Register once
      registry.registerPipelineAsTool(mockPipelineInfo);

      // Register again - should overwrite
      const tool = registry.registerPipelineAsTool(mockPipelineInfo);

      expect(tool.name).toBe("run_pipeliner_duplicate");
      expect(registry.tools.size).toBe(1);
    });
  });

  describe("Refresh Functionality", () => {
    test("should refresh successfully", async () => {
      // Add initial tools
      registry.tools.set("old_tool", { name: "old_tool" });
      registry.cache.set("old_cache", { data: "old" });

      await registry.refresh();

      expect(registry.tools.size).toBe(0);
      expect(registry.cache.size).toBe(0);
      expect(registry.lastRefresh).toBeInstanceOf(Date);
    });
  });
});
