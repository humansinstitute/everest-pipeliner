/**
 * Unit Tests for Panel Type Configuration Management
 *
 * Tests the panel type configuration classes and factory functions
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  BasePanelConfig,
  DiscussionConfig,
  SecurityConfig,
  TechReviewConfig,
  createPanelConfig,
  getAvailablePanelTypes,
  isValidPanelType,
} from "../../src/services/panelTypeConfig.js";

describe("BasePanelConfig", () => {
  let config;

  beforeEach(() => {
    config = new BasePanelConfig("test");
  });

  test("should initialize with panel type", () => {
    expect(config.panelType).toBe("test");
    expect(config.inputDirectory).toBe("input/test");
    expect(config.outputDirectory).toBe("output/panel/test");
    expect(config.agentDirectory).toBe("src/agents/panel/test");
  });

  test("should validate successfully with all required fields", () => {
    const validation = config.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("should fail validation with missing panel type", () => {
    config.panelType = "";
    const validation = config.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("Panel type is required");
  });

  test("should convert to object correctly", () => {
    const obj = config.toObject();
    expect(obj).toEqual({
      panelType: "test",
      inputDirectory: "input/test",
      outputDirectory: "output/panel/test",
      agentDirectory: "src/agents/panel/test",
    });
  });
});

describe("DiscussionConfig", () => {
  let config;

  beforeEach(() => {
    config = new DiscussionConfig();
  });

  test("should initialize with discussion-specific settings", () => {
    expect(config.panelType).toBe("discussion");
    expect(config.format).toBe("tl;dr podcast");
    expect(config.defaultInteractions).toBe(4);
    expect(config.participants).toBeDefined();
    expect(Object.keys(config.participants)).toHaveLength(4);
  });

  test("should have correct participant names", () => {
    expect(config.participants.panel1.name).toBe("Sarah");
    expect(config.participants.panel2.name).toBe("Mike");
    expect(config.participants.panel3.name).toBe("Lisa");
    expect(config.participants.moderator.name).toBe("Host");
  });

  test("should validate successfully", () => {
    const validation = config.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("should include type-specific config in object", () => {
    const obj = config.toObject();
    expect(obj.format).toBe("tl;dr podcast");
    expect(obj.participants).toBeDefined();
    expect(obj.defaultInteractions).toBe(4);
    expect(obj.summaryFocus).toContain("podcast-style format");
  });

  test("should fail validation with invalid participants", () => {
    config.participants = { only: "one" };
    const validation = config.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain(
      "Discussion panel must have exactly 4 participants (moderator, panel1, panel2, panel3)"
    );
  });
});

describe("SecurityConfig", () => {
  let config;

  beforeEach(() => {
    config = new SecurityConfig();
  });

  test("should initialize with security-specific settings", () => {
    expect(config.panelType).toBe("security");
    expect(config.focus).toBe("security analysis");
    expect(config.defaultInteractions).toBe(6);
    expect(config.participants).toBeDefined();
  });

  test("should have correct security participant roles", () => {
    expect(config.participants.panel1.name).toBe("Red Team");
    expect(config.participants.panel2.name).toBe("Blue Team");
    expect(config.participants.panel3.name).toBe("Compliance");
    expect(config.participants.moderator.name).toBe("Security Lead");
  });

  test("should validate successfully", () => {
    const validation = config.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("should include security-specific config in object", () => {
    const obj = config.toObject();
    expect(obj.focus).toBe("security analysis");
    expect(obj.defaultInteractions).toBe(6);
    expect(obj.summaryFocus).toContain("security assessment");
  });
});

describe("TechReviewConfig", () => {
  let config;

  beforeEach(() => {
    config = new TechReviewConfig();
  });

  test("should initialize with tech review-specific settings", () => {
    expect(config.panelType).toBe("techreview");
    expect(config.focus).toBe("technical architecture review");
    expect(config.defaultInteractions).toBe(5);
    expect(config.participants).toBeDefined();
  });

  test("should have correct tech review participant roles", () => {
    expect(config.participants.panel1.name).toBe("Systems Architect");
    expect(config.participants.panel2.name).toBe("DevOps Engineer");
    expect(config.participants.panel3.name).toBe("Quality Engineer");
    expect(config.participants.moderator.name).toBe("Tech Lead");
  });

  test("should validate successfully", () => {
    const validation = config.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("should include tech review-specific config in object", () => {
    const obj = config.toObject();
    expect(obj.focus).toBe("technical architecture review");
    expect(obj.defaultInteractions).toBe(5);
    expect(obj.summaryFocus).toContain("technical review");
  });
});

describe("createPanelConfig factory function", () => {
  test("should create DiscussionConfig for discussion type", () => {
    const config = createPanelConfig("discussion");
    expect(config).toBeInstanceOf(DiscussionConfig);
    expect(config.panelType).toBe("discussion");
  });

  test("should create SecurityConfig for security type", () => {
    const config = createPanelConfig("security");
    expect(config).toBeInstanceOf(SecurityConfig);
    expect(config.panelType).toBe("security");
  });

  test("should create TechReviewConfig for techreview type", () => {
    const config = createPanelConfig("techreview");
    expect(config).toBeInstanceOf(TechReviewConfig);
    expect(config.panelType).toBe("techreview");
  });

  test("should handle case insensitive input", () => {
    const config1 = createPanelConfig("DISCUSSION");
    const config2 = createPanelConfig("Security");
    const config3 = createPanelConfig("TechReview");

    expect(config1).toBeInstanceOf(DiscussionConfig);
    expect(config2).toBeInstanceOf(SecurityConfig);
    expect(config3).toBeInstanceOf(TechReviewConfig);
  });

  test("should throw error for unsupported panel type", () => {
    expect(() => createPanelConfig("invalid")).toThrow(
      "Unsupported panel type: invalid"
    );
    expect(() => createPanelConfig("")).toThrow("Unsupported panel type: ");
  });
});

describe("getAvailablePanelTypes", () => {
  test("should return array of supported panel types", () => {
    const types = getAvailablePanelTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types).toContain("discussion");
    expect(types).toContain("security");
    expect(types).toContain("techreview");
    expect(types).toHaveLength(3);
  });
});

describe("isValidPanelType", () => {
  test("should return true for valid panel types", () => {
    expect(isValidPanelType("discussion")).toBe(true);
    expect(isValidPanelType("security")).toBe(true);
    expect(isValidPanelType("techreview")).toBe(true);
  });

  test("should handle case insensitive input", () => {
    expect(isValidPanelType("DISCUSSION")).toBe(true);
    expect(isValidPanelType("Security")).toBe(true);
    expect(isValidPanelType("TechReview")).toBe(true);
  });

  test("should return false for invalid panel types", () => {
    expect(isValidPanelType("invalid")).toBe(false);
    expect(isValidPanelType("")).toBe(false);
    expect(isValidPanelType("random")).toBe(false);
  });
});
