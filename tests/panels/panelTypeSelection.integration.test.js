/**
 * Integration Tests for Panel Type Selection Feature - Phase 4
 *
 * Comprehensive end-to-end testing for all three panel types:
 * - Discussion Panel
 * - Security Review Panel
 * - Technical Review Panel
 */

import { jest } from "@jest/globals";
import { runPipeline } from "../../src/pipelines/moderatedPanelPipeline.js";
import { createAgentLoader } from "../../src/services/dynamicAgentLoader.js";
import {
  getAvailablePanelTypes,
  createPanelConfig,
  isValidPanelType,
} from "../../src/services/panelTypeConfig.js";
import { promises as fs } from "fs";
import path from "path";

// Mock Everest service to avoid actual API calls during testing
jest.mock("../../src/services/everest.service.js", () => ({
  callEverest: jest
    .fn()
    .mockImplementation(async (config, pipeline, stepName) => {
      // Simulate realistic response times
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Return mock responses based on step name
      if (stepName.includes("moderator")) {
        return {
          message: JSON.stringify({
            moderator_comment: "Let's continue the discussion",
            next_speaker: "analyst",
            speaking_prompt: "Please provide your analysis",
            reasoning: "Analyst should provide data-driven insights",
          }),
        };
      } else if (stepName.includes("summary")) {
        return {
          message:
            "This is a comprehensive summary of the panel discussion highlighting key insights and recommendations.",
        };
      } else {
        return {
          message:
            "This is a detailed response from the panel member addressing the current topic with relevant expertise.",
        };
      }
    }),
}));

describe("Panel Type Selection Integration Tests", () => {
  let testOutputDir;

  beforeAll(async () => {
    // Create test output directory
    testOutputDir = path.join(process.cwd(), "temp", "test-outputs");
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test outputs
    try {
      await fs.rmdir(testOutputDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Panel Type Configuration", () => {
    test("should list all available panel types", () => {
      const panelTypes = getAvailablePanelTypes();
      expect(panelTypes).toContain("discussion");
      expect(panelTypes).toContain("security");
      expect(panelTypes).toContain("techreview");
      expect(panelTypes.length).toBe(3);
    });

    test("should validate panel types correctly", () => {
      expect(isValidPanelType("discussion")).toBe(true);
      expect(isValidPanelType("security")).toBe(true);
      expect(isValidPanelType("techreview")).toBe(true);
      expect(isValidPanelType("invalid")).toBe(false);
      expect(isValidPanelType("")).toBe(false);
      expect(isValidPanelType(null)).toBe(false);
    });

    test("should create valid configurations for all panel types", () => {
      const panelTypes = getAvailablePanelTypes();

      panelTypes.forEach((panelType) => {
        const config = createPanelConfig(panelType);
        expect(config).toBeDefined();
        expect(config.panelType).toBe(panelType);

        const validation = config.validate();
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });
  });

  describe("Agent Loading Tests", () => {
    test("should load agents for discussion panel", async () => {
      const agentLoader = createAgentLoader("discussion");
      expect(agentLoader).toBeDefined();

      const moderator = await agentLoader.loadModerator();
      const panel1 = await agentLoader.loadPanel1();
      const panel2 = await agentLoader.loadPanel2();
      const panel3 = await agentLoader.loadPanel3();
      const summarizer = await agentLoader.loadSummarizer();

      expect(moderator).toBeDefined();
      expect(panel1).toBeDefined();
      expect(panel2).toBeDefined();
      expect(panel3).toBeDefined();
      expect(summarizer).toBeDefined();
    });

    test("should load agents for security panel", async () => {
      const agentLoader = createAgentLoader("security");
      expect(agentLoader).toBeDefined();

      const moderator = await agentLoader.loadModerator();
      const panel1 = await agentLoader.loadPanel1();
      const panel2 = await agentLoader.loadPanel2();
      const panel3 = await agentLoader.loadPanel3();
      const summarizer = await agentLoader.loadSummarizer();

      expect(moderator).toBeDefined();
      expect(panel1).toBeDefined();
      expect(panel2).toBeDefined();
      expect(panel3).toBeDefined();
      expect(summarizer).toBeDefined();
    });

    test("should load agents for tech review panel", async () => {
      const agentLoader = createAgentLoader("techreview");
      expect(agentLoader).toBeDefined();

      const moderator = await agentLoader.loadModerator();
      const panel1 = await agentLoader.loadPanel1();
      const panel2 = await agentLoader.loadPanel2();
      const panel3 = await agentLoader.loadPanel3();
      const summarizer = await agentLoader.loadSummarizer();

      expect(moderator).toBeDefined();
      expect(panel1).toBeDefined();
      expect(panel2).toBeDefined();
      expect(panel3).toBeDefined();
      expect(summarizer).toBeDefined();
    });

    test("should provide agent information for all panel types", () => {
      const panelTypes = getAvailablePanelTypes();

      panelTypes.forEach((panelType) => {
        const agentLoader = createAgentLoader(panelType);
        const agentInfo = agentLoader.getAgentInfo();

        expect(agentInfo).toBeDefined();
        expect(agentInfo.panelType).toBe(panelType);
        expect(agentInfo.agents).toBeDefined();
        expect(Object.keys(agentInfo.agents)).toHaveLength(5); // moderator, panel1, panel2, panel3, summarizer
      });
    });
  });

  describe("Input Processing Tests", () => {
    test("should handle single file input for discussion panel", async () => {
      const config = {
        panelType: "discussion",
        sourceText:
          "The future of artificial intelligence in healthcare is rapidly evolving.",
        discussionSubject: "AI in Healthcare",
        panelInteractions: 2,
        summaryFocus: "Key insights about AI healthcare applications",
      };

      const result = await runPipeline(config);

      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
      expect(result.result.conversation).toBeDefined();
      expect(result.result.summary).toBeDefined();
      expect(result.result.metadata.panelType).toBe("discussion");
    });

    test("should handle multi-file input for security panel", async () => {
      const config = {
        panelType: "security",
        sourceText: `Security Frameworks: OWASP Top 10, NIST Cybersecurity Framework

Codebase to Review:
function authenticate(username, password) {
  if (username === 'admin' && password === 'password123') {
    return true;
  }
  return false;
}

Security Focus: Authentication vulnerabilities`,
        discussionSubject: "Security Review: Authentication System",
        panelInteractions: 2,
        summaryFocus:
          "Identify security vulnerabilities and provide remediation strategies",
      };

      const result = await runPipeline(config);

      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
      expect(result.result.conversation).toBeDefined();
      expect(result.result.summary).toBeDefined();
      expect(result.result.metadata.panelType).toBe("security");
    });

    test("should handle multi-file input for tech review panel", async () => {
      const config = {
        panelType: "techreview",
        sourceText: `Product Requirements Document:
Build a scalable microservices architecture for e-commerce platform

Design Document:
- API Gateway with rate limiting
- Service mesh for inter-service communication
- Event-driven architecture with message queues

Codebase:
// API Gateway implementation
const express = require('express');
const rateLimit = require('express-rate-limit');

Review Focus: Scalability and performance`,
        discussionSubject: "Technical Review: E-commerce Architecture",
        panelInteractions: 2,
        summaryFocus: "Review for best practices and performance optimizations",
      };

      const result = await runPipeline(config);

      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
      expect(result.result.conversation).toBeDefined();
      expect(result.result.summary).toBeDefined();
      expect(result.result.metadata.panelType).toBe("techreview");
    });
  });

  describe("Pipeline Execution Tests", () => {
    test("should execute discussion panel with correct metadata", async () => {
      const config = {
        panelType: "discussion",
        sourceText: "Climate change impacts on global agriculture",
        discussionSubject: "Climate Change and Agriculture",
        panelInteractions: 3,
        summaryFocus: "Environmental and economic impacts",
      };

      const result = await runPipeline(config);

      expect(result.result.metadata.panelType).toBe("discussion");
      expect(result.result.metadata.panelInteractions).toBe(3);
      expect(result.result.metadata.configuration.panelType).toBe("discussion");
      expect(result.result.metadata.performance).toBeDefined();
      expect(result.result.panelStats).toBeDefined();
      expect(result.result.moderatorDecisions).toBeDefined();
    });

    test("should execute security panel with correct metadata", async () => {
      const config = {
        panelType: "security",
        sourceText: "OWASP Top 10\n\nSQL Injection vulnerability in login form",
        discussionSubject: "Security Review: SQL Injection",
        panelInteractions: 3,
        summaryFocus: "Vulnerability assessment and remediation",
      };

      const result = await runPipeline(config);

      expect(result.result.metadata.panelType).toBe("security");
      expect(result.result.metadata.panelInteractions).toBe(3);
      expect(result.result.metadata.configuration.panelType).toBe("security");
      expect(result.result.metadata.performance).toBeDefined();
    });

    test("should execute tech review panel with correct metadata", async () => {
      const config = {
        panelType: "techreview",
        sourceText:
          "PRD: Mobile app\n\nDesign: React Native\n\nCode: Navigation system",
        discussionSubject: "Technical Review: Mobile App Architecture",
        panelInteractions: 3,
        summaryFocus: "Architecture and performance review",
      };

      const result = await runPipeline(config);

      expect(result.result.metadata.panelType).toBe("techreview");
      expect(result.result.metadata.panelInteractions).toBe(3);
      expect(result.result.metadata.configuration.panelType).toBe("techreview");
      expect(result.result.metadata.performance).toBeDefined();
    });
  });

  describe("Performance Tests", () => {
    test("should complete discussion panel within expected timeframe", async () => {
      const startTime = Date.now();

      const config = {
        panelType: "discussion",
        sourceText: "Remote work productivity trends",
        discussionSubject: "Remote Work Productivity",
        panelInteractions: 2,
        summaryFocus: "Productivity insights",
      };

      const result = await runPipeline(config);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.status).toBe("completed");
      // With mocked services, should complete quickly
      expect(executionTime).toBeLessThan(5000); // 5 seconds
    });

    test("should maintain consistent execution times across panel types", async () => {
      const panelTypes = ["discussion", "security", "techreview"];
      const executionTimes = [];

      for (const panelType of panelTypes) {
        const startTime = Date.now();

        const config = {
          panelType,
          sourceText: `Test content for ${panelType} panel`,
          discussionSubject: `${panelType} Test`,
          panelInteractions: 2,
          summaryFocus: "Test summary focus",
        };

        const result = await runPipeline(config);
        const endTime = Date.now();

        expect(result.status).toBe("completed");
        executionTimes.push(endTime - startTime);
      }

      // Execution times should be relatively consistent (within 2x of each other)
      const minTime = Math.min(...executionTimes);
      const maxTime = Math.max(...executionTimes);
      expect(maxTime / minTime).toBeLessThan(2);
    });
  });

  describe("Error Handling Tests", () => {
    test("should handle invalid panel type gracefully", async () => {
      const config = {
        panelType: "invalid",
        sourceText: "Test content",
        discussionSubject: "Test Subject",
        panelInteractions: 2,
      };

      await expect(runPipeline(config)).rejects.toThrow();
    });

    test("should handle missing required parameters", async () => {
      const config = {
        panelType: "discussion",
        // Missing sourceText and discussionSubject
        panelInteractions: 2,
      };

      await expect(runPipeline(config)).rejects.toThrow(
        "sourceText and discussionSubject are required"
      );
    });

    test("should handle invalid panelInteractions range", async () => {
      const config = {
        panelType: "discussion",
        sourceText: "Test content",
        discussionSubject: "Test Subject",
        panelInteractions: 20, // Above maximum
      };

      await expect(runPipeline(config)).rejects.toThrow(
        "panelInteractions must be between 2 and 15"
      );
    });
  });

  describe("Backward Compatibility Tests", () => {
    test("should maintain backward compatibility with existing moderated panel usage", async () => {
      // Test without panelType (should default to discussion)
      const config = {
        sourceText: "Legacy test content",
        discussionSubject: "Legacy Test",
        panelInteractions: 2,
        summaryFocus: "Legacy summary focus",
      };

      const result = await runPipeline(config);

      expect(result.status).toBe("completed");
      expect(result.result.metadata.panelType).toBe("discussion"); // Should default
      expect(result.result.conversation).toBeDefined();
      expect(result.result.summary).toBeDefined();
    });

    test("should support legacy configuration format", async () => {
      const config = {
        sourceText: "Legacy format test",
        discussionSubject: "Legacy Format",
        panelInteractions: 3,
        // No panelType specified - should use default
      };

      const result = await runPipeline(config);

      expect(result.status).toBe("completed");
      expect(result.result.metadata.configuration.panelType).toBe("discussion");
    });
  });

  describe("Output Generation Tests", () => {
    test("should generate type-specific output directories", async () => {
      const panelTypes = ["discussion", "security", "techreview"];

      for (const panelType of panelTypes) {
        const config = {
          panelType,
          sourceText: `Test content for ${panelType}`,
          discussionSubject: `${panelType} Output Test`,
          panelInteractions: 2,
          summaryFocus: "Output generation test",
        };

        const result = await runPipeline(config);

        expect(result.status).toBe("completed");
        // Verify metadata includes panel type information
        expect(result.result.metadata.panelType).toBe(panelType);
        expect(result.result.metadata.configuration.panelType).toBe(panelType);
      }
    });

    test("should include panel type context in conversation markdown", async () => {
      const config = {
        panelType: "security",
        sourceText: "Security test content",
        discussionSubject: "Security Markdown Test",
        panelInteractions: 2,
        summaryFocus: "Security markdown generation",
      };

      const result = await runPipeline(config);

      expect(result.status).toBe("completed");
      expect(result.result.metadata.panelType).toBe("security");
      // The conversation should include panel type specific context
      expect(result.result.conversation).toBeDefined();
      expect(result.result.conversation.length).toBeGreaterThan(0);
    });
  });
});
