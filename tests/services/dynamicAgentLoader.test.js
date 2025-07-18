/**
 * Unit Tests for Dynamic Agent Loading Framework
 *
 * Tests the dynamic agent loader functionality
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { existsSync } from "fs";
import {
  DynamicAgentLoader,
  createAgentLoader,
  loadPanelAgent,
  loadAllPanelAgents,
} from "../../src/services/dynamicAgentLoader.js";

// Mock fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

// Mock the panel type config
jest.mock("../../src/services/panelTypeConfig.js", () => ({
  createPanelConfig: jest.fn((type) => ({
    panelType: type,
    toObject: () => ({ panelType: type, test: true }),
  })),
}));

describe("DynamicAgentLoader", () => {
  let loader;
  const mockExistsSync = existsSync;

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new DynamicAgentLoader("discussion");
  });

  describe("constructor", () => {
    test("should initialize with panel type", () => {
      expect(loader.panelType).toBe("discussion");
      expect(loader.agentCache).toBeInstanceOf(Map);
    });
  });

  describe("getAgentDirectory", () => {
    test("should return correct agent directory path", () => {
      const dir = loader.getAgentDirectory();
      expect(dir).toContain("src/agents/panel/discussion");
    });
  });

  describe("getFallbackAgentDirectory", () => {
    test("should return correct fallback directory path", () => {
      const dir = loader.getFallbackAgentDirectory();
      expect(dir).toContain("src/agents/panel");
      expect(dir).not.toContain("discussion");
    });
  });

  describe("agentExists", () => {
    test("should return true when agent file exists", () => {
      mockExistsSync.mockReturnValue(true);
      const exists = loader.agentExists("moderator");
      expect(exists).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith(
        expect.stringContaining("src/agents/panel/discussion/moderator.js")
      );
    });

    test("should return false when agent file does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const exists = loader.agentExists("nonexistent");
      expect(exists).toBe(false);
    });
  });

  describe("fallbackAgentExists", () => {
    test("should return true when fallback agent exists", () => {
      mockExistsSync.mockReturnValue(true);
      const exists = loader.fallbackAgentExists("moderator");
      expect(exists).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith(
        expect.stringContaining("src/agents/panel/moderator.js")
      );
    });

    test("should return false when fallback agent does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const exists = loader.fallbackAgentExists("nonexistent");
      expect(exists).toBe(false);
    });
  });

  describe("loadAgent", () => {
    test("should load type-specific agent when available", async () => {
      // Mock agent exists
      mockExistsSync.mockImplementation((path) =>
        path.includes("discussion/moderator.js")
      );

      // Mock dynamic import
      const mockAgent = jest.fn();
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockAgent });

      const agent = await loader.loadAgent("moderator");

      expect(agent).toBe(mockAgent);
      expect(global.import).toHaveBeenCalledWith(
        expect.stringContaining("../agents/panel/discussion/moderator.js")
      );

      // Restore original import
      global.import = originalImport;
    });

    test("should load fallback agent when type-specific not available", async () => {
      // Mock only fallback exists
      mockExistsSync.mockImplementation(
        (path) =>
          path.includes("src/agents/panel/moderator.js") &&
          !path.includes("discussion")
      );

      // Mock dynamic import
      const mockAgent = jest.fn();
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockAgent });

      const agent = await loader.loadAgent("moderator");

      expect(agent).toBe(mockAgent);
      expect(global.import).toHaveBeenCalledWith(
        expect.stringContaining("../agents/panel/moderator.js")
      );

      // Restore original import
      global.import = originalImport;
    });

    test("should throw error when agent not found", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(loader.loadAgent("nonexistent")).rejects.toThrow(
        "Agent 'nonexistent' not found"
      );
    });

    test("should throw error when agent does not export function", async () => {
      mockExistsSync.mockReturnValue(true);

      const originalImport = global.import;
      global.import = jest
        .fn()
        .mockResolvedValue({ default: "not a function" });

      await expect(loader.loadAgent("moderator")).rejects.toThrow(
        "Agent 'moderator' does not export a function as default export"
      );

      // Restore original import
      global.import = originalImport;
    });

    test("should cache loaded agents", async () => {
      mockExistsSync.mockReturnValue(true);

      const mockAgent = jest.fn();
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockAgent });

      // Load agent twice
      const agent1 = await loader.loadAgent("moderator");
      const agent2 = await loader.loadAgent("moderator");

      expect(agent1).toBe(agent2);
      expect(global.import).toHaveBeenCalledTimes(1); // Should only import once

      // Restore original import
      global.import = originalImport;
    });
  });

  describe("convenience methods", () => {
    beforeEach(() => {
      // Mock loadAgent method
      loader.loadAgent = jest.fn().mockResolvedValue(jest.fn());
    });

    test("loadModerator should call loadAgent with correct parameter", async () => {
      await loader.loadModerator();
      expect(loader.loadAgent).toHaveBeenCalledWith("moderator");
    });

    test("loadPanel1 should call loadAgent with correct parameter", async () => {
      await loader.loadPanel1();
      expect(loader.loadAgent).toHaveBeenCalledWith("panel1_challenger");
    });

    test("loadPanel2 should call loadAgent with correct parameter", async () => {
      await loader.loadPanel2();
      expect(loader.loadAgent).toHaveBeenCalledWith("panel2_analyst");
    });

    test("loadPanel3 should call loadAgent with correct parameter", async () => {
      await loader.loadPanel3();
      expect(loader.loadAgent).toHaveBeenCalledWith("panel3_explorer");
    });

    test("loadSummarizer should call loadAgent with correct parameter", async () => {
      await loader.loadSummarizer();
      expect(loader.loadAgent).toHaveBeenCalledWith("summarizePanel");
    });
  });

  describe("loadAllAgents", () => {
    test("should load all agents and return object", async () => {
      const mockAgents = {
        moderator: jest.fn(),
        panel1: jest.fn(),
        panel2: jest.fn(),
        panel3: jest.fn(),
        summarizer: jest.fn(),
      };

      loader.loadModerator = jest.fn().mockResolvedValue(mockAgents.moderator);
      loader.loadPanel1 = jest.fn().mockResolvedValue(mockAgents.panel1);
      loader.loadPanel2 = jest.fn().mockResolvedValue(mockAgents.panel2);
      loader.loadPanel3 = jest.fn().mockResolvedValue(mockAgents.panel3);
      loader.loadSummarizer = jest
        .fn()
        .mockResolvedValue(mockAgents.summarizer);

      const result = await loader.loadAllAgents();

      expect(result).toEqual(mockAgents);
      expect(loader.loadModerator).toHaveBeenCalled();
      expect(loader.loadPanel1).toHaveBeenCalled();
      expect(loader.loadPanel2).toHaveBeenCalled();
      expect(loader.loadPanel3).toHaveBeenCalled();
      expect(loader.loadSummarizer).toHaveBeenCalled();
    });
  });

  describe("getAgentInfo", () => {
    test("should return agent availability information", () => {
      mockExistsSync.mockImplementation((path) => {
        // Mock that discussion-specific moderator exists, others use fallback
        return (
          path.includes("discussion/moderator.js") ||
          (path.includes("src/agents/panel/") && !path.includes("discussion"))
        );
      });

      const info = loader.getAgentInfo();

      expect(info.panelType).toBe("discussion");
      expect(info.agents).toBeDefined();
      expect(info.agents.moderator.typeSpecific).toBe(true);
      expect(info.agents.moderator.willUse).toBe("type-specific");
      expect(info.agents.panel1_challenger.typeSpecific).toBe(false);
      expect(info.agents.panel1_challenger.willUse).toBe("fallback");
    });
  });

  describe("clearCache", () => {
    test("should clear the agent cache", () => {
      loader.agentCache.set("test", "value");
      expect(loader.agentCache.size).toBe(1);

      loader.clearCache();
      expect(loader.agentCache.size).toBe(0);
    });
  });

  describe("getConfig", () => {
    test("should return panel configuration object", () => {
      const config = loader.getConfig();
      expect(config.panelType).toBe("discussion");
      expect(config.test).toBe(true);
    });
  });
});

describe("Factory functions", () => {
  describe("createAgentLoader", () => {
    test("should create DynamicAgentLoader instance", () => {
      const loader = createAgentLoader("security");
      expect(loader).toBeInstanceOf(DynamicAgentLoader);
      expect(loader.panelType).toBe("security");
    });
  });

  describe("loadPanelAgent", () => {
    test("should create loader and load specific agent", async () => {
      mockExistsSync.mockReturnValue(true);

      const mockAgent = jest.fn();
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockAgent });

      const agent = await loadPanelAgent("discussion", "moderator");

      expect(agent).toBe(mockAgent);

      // Restore original import
      global.import = originalImport;
    });
  });

  describe("loadAllPanelAgents", () => {
    test("should create loader and load all agents", async () => {
      mockExistsSync.mockReturnValue(true);

      const mockAgent = jest.fn();
      const originalImport = global.import;
      global.import = jest.fn().mockResolvedValue({ default: mockAgent });

      const agents = await loadAllPanelAgents("discussion");

      expect(agents).toHaveProperty("moderator");
      expect(agents).toHaveProperty("panel1");
      expect(agents).toHaveProperty("panel2");
      expect(agents).toHaveProperty("panel3");
      expect(agents).toHaveProperty("summarizer");

      // Restore original import
      global.import = originalImport;
    });
  });
});
