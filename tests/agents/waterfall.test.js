/**
 * Test suite for Waterfall Pipeline Agents
 *
 * Tests the Phase 2 implementation of Content Analyzer, LinkedIn Creator,
 * and Reels Generator agents to ensure they generate proper configurations
 * and handle input validation correctly.
 */

import { describe, test, expect } from "@jest/globals";
import contentAnalyzer from "../../src/agents/waterfall/contentAnalyzer.js";
import linkedinCreator from "../../src/agents/waterfall/linkedinCreator.js";
import reelsGenerator from "../../src/agents/waterfall/reelsGenerator.js";

describe("Waterfall Pipeline Agents", () => {
  describe("Content Analyzer Agent", () => {
    test("generates valid agent configuration", async () => {
      const message =
        "This is a sample podcast transcript about leadership and productivity. It discusses frameworks for effective decision making and shares stories about successful entrepreneurs.";
      const context = "Focus on leadership insights";

      const result = await contentAnalyzer(message, context, []);

      expect(result.callID).toBeDefined();
      expect(result.callID).toMatch(/^content-analyzer-\d+$/);
      expect(result.model.model).toBe("anthropic/claude-sonnet-4");
      expect(result.model.temperature).toBe(0.7);
      expect(result.chat.systemPrompt).toContain("CONTENT ANALYZER");
      expect(result.chat.systemPrompt).toContain(
        "exactly 4 distinct, compelling topics"
      );
      expect(result.chat.userPrompt).toContain(message);
      expect(result.origin.conversationID).toBe("waterfall-content-analyzer");
    });

    test("handles empty message", async () => {
      await expect(contentAnalyzer("", "context", [])).rejects.toThrow(
        "Content Analyzer requires source material text"
      );
    });

    test("handles null message", async () => {
      await expect(contentAnalyzer(null, "context", [])).rejects.toThrow(
        "Content Analyzer requires source material text"
      );
    });

    test("includes context in system prompt when provided", async () => {
      const message = "Sample content";
      const context = "Focus on productivity tips";

      const result = await contentAnalyzer(message, context, []);

      expect(result.chat.systemPrompt).toContain(
        "Focus Areas: Focus on productivity tips"
      );
    });
  });

  describe("LinkedIn Creator Agent", () => {
    test("generates valid agent configuration", async () => {
      const topicChunks = JSON.stringify({
        topics: [
          {
            id: 1,
            title: "Leadership Framework",
            category: "framework-based",
            keyInsights: ["insight1", "insight2"],
            relevantQuotes: ["quote1"],
            recommendedAngle: "Educational approach",
            context: "Leadership context",
          },
        ],
      });
      const context = "Professional audience";

      const result = await linkedinCreator(topicChunks, context, []);

      expect(result.callID).toBeDefined();
      expect(result.callID).toMatch(/^linkedin-creator-\d+$/);
      expect(result.model.model).toBe("anthropic/claude-sonnet-4");
      expect(result.model.temperature).toBe(0.8);
      expect(result.chat.systemPrompt).toContain("LINKEDIN CONTENT CREATOR");
      expect(result.chat.systemPrompt).toContain("Story-driven approach");
      expect(result.chat.systemPrompt).toContain(
        "Framework/educational approach"
      );
      expect(result.chat.userPrompt).toContain(topicChunks);
      expect(result.origin.conversationID).toBe("waterfall-linkedin-creator");
    });

    test("handles empty message", async () => {
      await expect(linkedinCreator("", "context", [])).rejects.toThrow(
        "LinkedIn Creator requires topic chunks from Content Analyzer"
      );
    });

    test("handles invalid JSON", async () => {
      await expect(
        linkedinCreator("invalid json", "context", [])
      ).rejects.toThrow("LinkedIn Creator requires valid JSON topic chunks");
    });

    test("includes embedded style guide", async () => {
      const topicChunks = JSON.stringify({ topics: [] });

      const result = await linkedinCreator(topicChunks, "", []);

      expect(result.chat.systemPrompt).toContain("conversational");
      expect(result.chat.systemPrompt).toContain("actionable");
      expect(result.chat.systemPrompt).toContain("authentic");
      expect(result.chat.systemPrompt).toContain("lineBreaks");
      expect(result.chat.systemPrompt).toContain("hashtags");
    });
  });

  describe("Reels Generator Agent", () => {
    test("generates valid agent configuration", async () => {
      const linkedinPosts = JSON.stringify({
        linkedinPosts: [
          {
            id: 1,
            title: "Leadership Post",
            content: "Sample LinkedIn post content",
            approach: "story-driven",
          },
        ],
      });
      const context = "Video content focus";

      const result = await reelsGenerator(linkedinPosts, context, []);

      expect(result.callID).toBeDefined();
      expect(result.callID).toMatch(/^reels-generator-\d+$/);
      expect(result.model.model).toBe("anthropic/claude-sonnet-4");
      expect(result.model.temperature).toBe(0.8);
      expect(result.chat.systemPrompt).toContain(
        "YOUTUBE REELS CONCEPT CREATOR"
      );
      expect(result.chat.systemPrompt).toContain("2 distinct Reels concepts");
      expect(result.chat.userPrompt).toContain(linkedinPosts);
      expect(result.origin.conversationID).toBe("waterfall-reels-generator");
    });

    test("handles empty message", async () => {
      await expect(reelsGenerator("", "context", [])).rejects.toThrow(
        "Reels Generator requires LinkedIn posts from LinkedIn Creator"
      );
    });

    test("handles invalid JSON", async () => {
      await expect(
        reelsGenerator("invalid json", "context", [])
      ).rejects.toThrow("Reels Generator requires valid JSON LinkedIn posts");
    });

    test("includes embedded format guide", async () => {
      const linkedinPosts = JSON.stringify({ linkedinPosts: [] });

      const result = await reelsGenerator(linkedinPosts, "", []);

      expect(result.chat.systemPrompt).toContain(
        "First 3 seconds must grab attention"
      );
      expect(result.chat.systemPrompt).toContain(
        "Bold, readable fonts minimum 24pt"
      );
      expect(result.chat.systemPrompt).toContain("Quick, engaging delivery");
      expect(result.chat.systemPrompt).toContain("30-60 seconds optimal");
    });

    test("includes various reel types", async () => {
      const linkedinPosts = JSON.stringify({ linkedinPosts: [] });

      const result = await reelsGenerator(linkedinPosts, "", []);

      expect(result.chat.systemPrompt).toContain(
        "Quick tip/hack demonstration"
      );
      expect(result.chat.systemPrompt).toContain("Behind-the-scenes insight");
      expect(result.chat.systemPrompt).toContain("Question and answer format");
      expect(result.chat.systemPrompt).toContain(
        "Myth-busting or contrarian take"
      );
      expect(result.chat.systemPrompt).toContain("Step-by-step tutorial");
      expect(result.chat.systemPrompt).toContain("Story-driven narrative");
    });
  });

  describe("Agent Integration", () => {
    test("agents can be chained together with proper data flow", async () => {
      // Test that output from one agent can be input to the next
      const sourceContent =
        "Sample content about productivity and leadership frameworks.";

      // Step 1: Content Analyzer
      const analyzerConfig = await contentAnalyzer(
        sourceContent,
        "productivity focus",
        []
      );
      expect(analyzerConfig).toBeDefined();

      // Step 2: Simulate analyzer output for LinkedIn Creator
      const mockTopics = JSON.stringify({
        topics: [
          {
            id: 1,
            title: "Productivity Framework",
            category: "framework-based",
            keyInsights: ["Time management", "Priority setting"],
            relevantQuotes: ["Focus on what matters"],
            recommendedAngle: "Educational",
            context: "Workplace productivity",
          },
        ],
      });

      const creatorConfig = await linkedinCreator(
        mockTopics,
        "professional",
        []
      );
      expect(creatorConfig).toBeDefined();

      // Step 3: Simulate creator output for Reels Generator
      const mockPosts = JSON.stringify({
        linkedinPosts: [
          {
            id: 1,
            title: "Productivity Tips",
            content: "Sample LinkedIn post about productivity",
            approach: "framework",
          },
        ],
      });

      const reelsConfig = await reelsGenerator(mockPosts, "video content", []);
      expect(reelsConfig).toBeDefined();
    });
  });
});
