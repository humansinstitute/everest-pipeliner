import {
  PipelineRegistry,
  createPipelineRegistry,
} from "../../src/pipelines/registry/index.js";
import { promises as fs } from "fs";
import path from "path";
import { jest } from "@jest/globals";

// Mock the file system
const mockFs = {
  readdir: jest.fn(),
  stat: jest.fn(),
};
jest.unstable_mockModule("fs", () => ({
  promises: mockFs,
}));

// Mock the pipeline modules
const mockDialoguePipeline = {
  dialoguePipeline: jest.fn(),
  executeViaNostrMQ: jest.fn(),
  pipelineInfo: {
    name: "dialogue",
    description: "Test dialogue pipeline",
    version: "1.0.0",
    parameters: {
      required: ["sourceText", "discussionPrompt"],
      optional: ["iterations"],
    },
  },
};

const mockFacilitatedDialoguePipeline = {
  facilitatedDialoguePipeline: jest.fn(),
  executeViaNostrMQ: jest.fn(),
  pipelineInfo: {
    name: "facilitatedDialogue",
    description: "Test facilitated dialogue pipeline",
    version: "1.0.0",
    parameters: {
      required: ["sourceText", "discussionPrompt"],
      optional: ["iterations", "facilitatorEnabled"],
    },
  },
};

const mockSimpleChatPipeline = {
  simpleChatPipeline: jest.fn(),
  // No executeViaNostrMQ - should not be NostrMQ enabled
  pipelineInfo: {
    name: "simpleChat",
    description: "Test simple chat pipeline",
    version: "1.0.0",
  },
};

describe("PipelineRegistry", () => {
  let registry;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    registry = new PipelineRegistry(mockLogger);

    // Reset mocks
    jest.clearAllMocks();
    mockFs.readdir.mockClear();
    mockFs.stat.mockClear();
  });

  describe("constructor", () => {
    test("should create registry with logger", () => {
      expect(registry.logger).toBe(mockLogger);
      expect(registry.pipelines).toBeInstanceOf(Map);
      expect(registry.pipelines.size).toBe(0);
    });

    test("should create registry without logger", () => {
      const registryNoLogger = new PipelineRegistry();
      expect(registryNoLogger.logger).toBeNull();
      expect(registryNoLogger.pipelines).toBeInstanceOf(Map);
    });
  });

  describe("discoverPipelines", () => {
    test("should discover pipeline files", async () => {
      mockFs.readdir.mockResolvedValue([
        "dialoguePipeline.js",
        "facilitatedDialoguePipeline.js",
        "simpleChatPipeline.js",
        "registry", // Should be ignored
        "otherFile.js", // Should be ignored
      ]);

      // Mock the loadPipeline method to avoid actual file loading
      registry.loadPipeline = jest.fn().mockResolvedValue();

      await registry.discoverPipelines();

      expect(mockFs.readdir).toHaveBeenCalledWith(registry.pipelineDirectory);
      expect(registry.loadPipeline).toHaveBeenCalledTimes(3);
      expect(registry.loadPipeline).toHaveBeenCalledWith("dialoguePipeline.js");
      expect(registry.loadPipeline).toHaveBeenCalledWith(
        "facilitatedDialoguePipeline.js"
      );
      expect(registry.loadPipeline).toHaveBeenCalledWith(
        "simpleChatPipeline.js"
      );
    });

    test("should handle readdir error", async () => {
      const error = new Error("Permission denied");
      mockFs.readdir.mockRejectedValue(error);

      await expect(registry.discoverPipelines()).rejects.toThrow(
        "Permission denied"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to discover pipelines",
        expect.objectContaining({
          error: "Permission denied",
        })
      );
    });
  });

  describe("extractPipelineFunction", () => {
    test("should extract function by pipeline name", () => {
      const module = { dialoguePipeline: jest.fn() };
      const func = registry.extractPipelineFunction(module, "dialogue");
      expect(func).toBe(module.dialoguePipeline);
    });

    test("should extract function by exact name", () => {
      const module = { dialogue: jest.fn() };
      const func = registry.extractPipelineFunction(module, "dialogue");
      expect(func).toBe(module.dialogue);
    });

    test("should extract default export", () => {
      const module = { default: jest.fn() };
      const func = registry.extractPipelineFunction(module, "dialogue");
      expect(func).toBe(module.default);
    });

    test("should return null if no function found", () => {
      const module = { someOtherFunction: jest.fn() };
      const func = registry.extractPipelineFunction(module, "dialogue");
      expect(func).toBeNull();
    });
  });

  describe("extractPipelineInfo", () => {
    test("should extract pipeline info from module", () => {
      const module = {
        pipelineInfo: {
          name: "test",
          description: "Test pipeline",
          version: "2.0.0",
        },
      };
      const info = registry.extractPipelineInfo(module, "test");
      expect(info).toEqual({
        name: "test",
        description: "Test pipeline",
        version: "2.0.0",
        parameters: {},
        capabilities: [],
      });
    });

    test("should return default info if no pipelineInfo", () => {
      const module = {};
      const info = registry.extractPipelineInfo(module, "test");
      expect(info).toEqual({
        name: "test",
        description: "test pipeline",
        version: "1.0.0",
        parameters: {},
        capabilities: [],
      });
    });
  });

  describe("pipeline management", () => {
    beforeEach(async () => {
      // Manually register test pipelines
      registry.pipelines.set("dialogue", {
        name: "dialogue",
        execute: mockDialoguePipeline.dialoguePipeline,
        executeViaNostrMQ: mockDialoguePipeline.executeViaNostrMQ,
        info: mockDialoguePipeline.pipelineInfo,
      });

      registry.pipelines.set("facilitatedDialogue", {
        name: "facilitatedDialogue",
        execute: mockFacilitatedDialoguePipeline.facilitatedDialoguePipeline,
        executeViaNostrMQ: mockFacilitatedDialoguePipeline.executeViaNostrMQ,
        info: mockFacilitatedDialoguePipeline.pipelineInfo,
      });

      registry.pipelines.set("simpleChat", {
        name: "simpleChat",
        execute: mockSimpleChatPipeline.simpleChatPipeline,
        executeViaNostrMQ: null,
        info: mockSimpleChatPipeline.pipelineInfo,
      });
    });

    describe("getAvailablePipelines", () => {
      test("should return all available pipelines", () => {
        const pipelines = registry.getAvailablePipelines();
        expect(Object.keys(pipelines)).toHaveLength(3);
        expect(pipelines.dialogue).toEqual({
          name: "dialogue",
          info: mockDialoguePipeline.pipelineInfo,
          hasNostrMQInterface: true,
        });
        expect(pipelines.simpleChat.hasNostrMQInterface).toBe(false);
      });
    });

    describe("hasPipeline", () => {
      test("should return true for existing pipeline", () => {
        expect(registry.hasPipeline("dialogue")).toBe(true);
      });

      test("should return false for non-existing pipeline", () => {
        expect(registry.hasPipeline("nonexistent")).toBe(false);
      });
    });

    describe("getPipeline", () => {
      test("should return existing pipeline", () => {
        const pipeline = registry.getPipeline("dialogue");
        expect(pipeline.name).toBe("dialogue");
        expect(pipeline.execute).toBe(mockDialoguePipeline.dialoguePipeline);
      });

      test("should return undefined for non-existing pipeline", () => {
        const pipeline = registry.getPipeline("nonexistent");
        expect(pipeline).toBeUndefined();
      });
    });

    describe("getPipelineForNostrMQ", () => {
      test("should return pipeline with NostrMQ interface", () => {
        const pipeline = registry.getPipelineForNostrMQ("dialogue");
        expect(pipeline.name).toBe("dialogue");
        expect(pipeline.executeViaNostrMQ).toBe(
          mockDialoguePipeline.executeViaNostrMQ
        );
      });

      test("should throw error for non-existing pipeline", () => {
        expect(() => registry.getPipelineForNostrMQ("nonexistent")).toThrow(
          "Pipeline 'nonexistent' not found"
        );
      });

      test("should throw error for pipeline without NostrMQ interface", () => {
        expect(() => registry.getPipelineForNostrMQ("simpleChat")).toThrow(
          "Pipeline 'simpleChat' does not support NostrMQ execution"
        );
      });
    });

    describe("getNostrMQEnabledPipelines", () => {
      test("should return only NostrMQ enabled pipelines", () => {
        const enabled = registry.getNostrMQEnabledPipelines();
        expect(enabled).toEqual(["dialogue", "facilitatedDialogue"]);
      });
    });

    describe("getStats", () => {
      test("should return registry statistics", () => {
        const stats = registry.getStats();
        expect(stats).toEqual({
          totalPipelines: 3,
          nostrMQEnabled: 2,
          nostrMQDisabled: 1,
          pipelines: ["dialogue", "facilitatedDialogue", "simpleChat"],
        });
      });
    });

    describe("validatePipelineConfig", () => {
      test("should validate valid pipeline config", () => {
        const result = registry.validatePipelineConfig("dialogue", {
          sourceText: "test",
          discussionPrompt: "test prompt",
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test("should reject missing required parameters", () => {
        const result = registry.validatePipelineConfig("dialogue", {
          sourceText: "test",
          // missing discussionPrompt
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Missing required parameter: discussionPrompt"
        );
      });

      test("should reject non-existing pipeline", () => {
        const result = registry.validatePipelineConfig("nonexistent", {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Pipeline 'nonexistent' not found");
      });

      test("should reject pipeline without NostrMQ interface", () => {
        const result = registry.validatePipelineConfig("simpleChat", {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Pipeline 'simpleChat' does not support NostrMQ execution"
        );
      });
    });
  });

  describe("logging", () => {
    test("should log with logger when available", () => {
      registry.log("info", "test message", { key: "value" });
      expect(mockLogger.info).toHaveBeenCalledWith(
        "[PipelineRegistry] test message",
        { key: "value" }
      );
    });

    test("should use console when no logger available", () => {
      const registryNoLogger = new PipelineRegistry();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      registryNoLogger.log("info", "test message", { key: "value" });
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineRegistry] INFO: test message",
        { key: "value" }
      );

      consoleSpy.mockRestore();
    });
  });
});

describe("createPipelineRegistry", () => {
  test("should create and initialize registry", async () => {
    const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    // Mock the initialize method
    const initializeSpy = jest
      .spyOn(PipelineRegistry.prototype, "initialize")
      .mockResolvedValue();

    const registry = await createPipelineRegistry(mockLogger);

    expect(registry).toBeInstanceOf(PipelineRegistry);
    expect(registry.logger).toBe(mockLogger);
    expect(initializeSpy).toHaveBeenCalled();

    initializeSpy.mockRestore();
  });
});
