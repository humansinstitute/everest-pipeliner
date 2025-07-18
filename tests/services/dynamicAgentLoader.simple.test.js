/**
 * Simple Unit Tests for Dynamic Agent Loading Framework
 *
 * Basic tests without complex mocking
 */

import { describe, test, expect } from "@jest/globals";
import {
  createAgentLoader,
  DynamicAgentLoader,
} from "../../src/services/dynamicAgentLoader.js";

describe("DynamicAgentLoader - Basic Tests", () => {
  test("should create agent loader instance", () => {
    const loader = createAgentLoader("discussion");
    expect(loader).toBeInstanceOf(DynamicAgentLoader);
    expect(loader.panelType).toBe("discussion");
  });

  test("should have correct directory paths", () => {
    const loader = createAgentLoader("discussion");
    const agentDir = loader.getAgentDirectory();
    const fallbackDir = loader.getFallbackAgentDirectory();

    expect(agentDir).toContain("src/agents/panel/discussion");
    expect(fallbackDir).toContain("src/agents/panel");
    expect(fallbackDir).not.toContain("discussion");
  });

  test("should initialize with empty cache", () => {
    const loader = createAgentLoader("discussion");
    expect(loader.agentCache).toBeInstanceOf(Map);
    expect(loader.agentCache.size).toBe(0);
  });

  test("should clear cache correctly", () => {
    const loader = createAgentLoader("discussion");
    loader.agentCache.set("test", "value");
    expect(loader.agentCache.size).toBe(1);

    loader.clearCache();
    expect(loader.agentCache.size).toBe(0);
  });

  test("should get panel configuration", () => {
    const loader = createAgentLoader("discussion");
    const config = loader.getConfig();
    expect(config).toBeDefined();
    expect(config.panelType).toBe("discussion");
  });

  test("should support different panel types", () => {
    const discussionLoader = createAgentLoader("discussion");
    const securityLoader = createAgentLoader("security");
    const techLoader = createAgentLoader("techreview");

    expect(discussionLoader.panelType).toBe("discussion");
    expect(securityLoader.panelType).toBe("security");
    expect(techLoader.panelType).toBe("techreview");
  });
});
