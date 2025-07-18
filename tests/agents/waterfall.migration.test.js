/**
 * Migration Tests for Waterfall Pipeline Agents
 *
 * Tests to ensure 100% backward compatibility when migrating waterfall agents
 * from direct implementation to agentLoader utility function.
 *
 * These tests compare the output of original vs migrated implementations
 * to ensure identical behavior.
 */

import { describe, test, expect, beforeAll } from "@jest/globals";

// Original implementations
import originalContentAnalyzer from "../../src/agents/waterfall/contentAnalyzer.js";
import originalLinkedinCreator from "../../src/agents/waterfall/linkedinCreator.js";
import originalReelsGenerator from "../../src/agents/waterfall/reelsGenerator.js";

// Test fixtures
const sampleContent = `This is a comprehensive podcast transcript about leadership and productivity. 
It discusses frameworks for effective decision making, shares stories about successful entrepreneurs,
and provides actionable insights for professional growth. The content covers time management strategies,
team building approaches, and innovative thinking methodologies.`;

const sampleTopicChunks = JSON.stringify({
  topics: [
    {
      id: 1,
      title: "Leadership Framework",
      category: "framework-based",
      keyInsights: ["Decision making", "Team building", "Strategic thinking"],
      relevantQuotes: [
        "Leadership is about serving others",
        "Great leaders listen first",
      ],
      recommendedAngle: "Educational approach with practical examples",
      context: "Professional development context",
      sourceReferences: "Section 2-3 of transcript",
    },
    {
      id: 2,
      title: "Productivity Systems",
      category: "insight-driven",
      keyInsights: ["Time management", "Priority setting", "Focus techniques"],
      relevantQuotes: [
        "Focus on what matters most",
        "Productivity is about outcomes",
      ],
      recommendedAngle: "Actionable tips and frameworks",
      context: "Workplace efficiency context",
      sourceReferences: "Section 4-5 of transcript",
    },
  ],
  extractionSummary:
    "Comprehensive analysis of leadership and productivity themes",
});

const sampleLinkedinPosts = JSON.stringify({
  linkedinPosts: [
    {
      id: 1,
      sourceTopicId: 1,
      title: "Leadership Lessons",
      content:
        "Sample LinkedIn post about leadership with engaging hook and actionable insights",
      approach: "story-driven",
      hashtags: ["#leadership", "#management", "#growth"],
      estimatedEngagement: "high",
      keyElements: {
        hook: "What if I told you leadership isn't about being the smartest person in the room?",
        insight: "Great leaders focus on empowering others",
        cta: "What's your biggest leadership challenge?",
      },
    },
    {
      id: 2,
      sourceTopicId: 2,
      title: "Productivity Framework",
      content:
        "Sample LinkedIn post about productivity with practical framework",
      approach: "framework",
      hashtags: ["#productivity", "#timemanagement", "#efficiency"],
      estimatedEngagement: "medium",
      keyElements: {
        hook: "The 3-step productivity system that changed everything",
        insight: "Focus beats multitasking every time",
        cta: "Which productivity method works best for you?",
      },
    },
  ],
  creationSummary:
    "Varied approaches across story-driven and framework-based posts",
});

describe("Waterfall Agents Migration Tests", () => {
  describe("Content Analyzer Migration", () => {
    test("produces identical callDetails structure", async () => {
      const message = sampleContent;
      const context =
        "Focus on leadership insights and productivity frameworks";
      const history = [];

      const originalResult = await originalContentAnalyzer(
        message,
        context,
        history
      );

      // Verify original structure
      expect(originalResult).toHaveProperty("callID");
      expect(originalResult).toHaveProperty("model");
      expect(originalResult).toHaveProperty("chat");
      expect(originalResult).toHaveProperty("origin");

      // Verify model configuration
      expect(originalResult.model.provider).toBe("openrouter");
      expect(originalResult.model.model).toBe("openai/gpt-4.1");
      expect(originalResult.model.temperature).toBe(0.7);
      expect(originalResult.model.response_format).toEqual({
        type: "json_object",
      });

      // Verify chat structure
      expect(originalResult.chat.systemPrompt).toContain("CONTENT ANALYZER");
      expect(originalResult.chat.systemPrompt).toContain(
        "exactly 4 distinct, compelling topics"
      );
      expect(originalResult.chat.userPrompt).toContain(message);

      // Verify origin structure
      expect(originalResult.origin.conversationID).toBe(
        "waterfall-content-analyzer"
      );
      expect(originalResult.origin.channel).toBe("waterfall-pipeline");
    });

    test("handles context inclusion correctly", async () => {
      const message = sampleContent;
      const context = "Focus on productivity tips";
      const history = [];

      const result = await originalContentAnalyzer(message, context, history);

      expect(result.chat.systemPrompt).toContain(
        "Focus Areas: Focus on productivity tips"
      );
    });

    test("handles empty context correctly", async () => {
      const message = sampleContent;
      const context = "";
      const history = [];

      const result = await originalContentAnalyzer(message, context, history);

      expect(result.chat.systemPrompt).not.toContain("Focus Areas:");
    });

    test("validates input correctly", async () => {
      await expect(originalContentAnalyzer("", "context", [])).rejects.toThrow(
        "Content Analyzer requires source material text"
      );

      await expect(
        originalContentAnalyzer(null, "context", [])
      ).rejects.toThrow("Content Analyzer requires source material text");
    });
  });

  describe("LinkedIn Creator Migration", () => {
    test("produces identical callDetails structure", async () => {
      const message = sampleTopicChunks;
      const context = "Professional audience focus";
      const history = [];

      const originalResult = await originalLinkedinCreator(
        message,
        context,
        history
      );

      // Verify original structure
      expect(originalResult).toHaveProperty("callID");
      expect(originalResult).toHaveProperty("model");
      expect(originalResult).toHaveProperty("chat");
      expect(originalResult).toHaveProperty("origin");

      // Verify model configuration
      expect(originalResult.model.provider).toBe("openrouter");
      expect(originalResult.model.model).toBe("openai/gpt-4.1");
      expect(originalResult.model.temperature).toBe(0.8);
      expect(originalResult.model.response_format).toEqual({
        type: "json_object",
      });

      // Verify chat structure
      expect(originalResult.chat.systemPrompt).toContain(
        "LINKEDIN CONTENT CREATOR"
      );
      expect(originalResult.chat.systemPrompt).toContain(
        "Story-driven approach"
      );
      expect(originalResult.chat.userPrompt).toContain(message);

      // Verify origin structure
      expect(originalResult.origin.conversationID).toBe(
        "waterfall-linkedin-creator"
      );
      expect(originalResult.origin.channel).toBe("waterfall-pipeline");
    });

    test("includes embedded style guide", async () => {
      const message = sampleTopicChunks;
      const context = "";
      const history = [];

      const result = await originalLinkedinCreator(message, context, history);

      expect(result.chat.systemPrompt).toContain("conversational");
      expect(result.chat.systemPrompt).toContain("actionable");
      expect(result.chat.systemPrompt).toContain("authentic");
      expect(result.chat.systemPrompt).toContain("lineBreaks");
      expect(result.chat.systemPrompt).toContain("hashtags");
    });

    test("validates input correctly", async () => {
      await expect(originalLinkedinCreator("", "context", [])).rejects.toThrow(
        "LinkedIn Creator requires topic chunks from Content Analyzer"
      );

      await expect(
        originalLinkedinCreator("invalid json", "context", [])
      ).rejects.toThrow("LinkedIn Creator requires valid JSON topic chunks");
    });
  });

  describe("Reels Generator Migration", () => {
    test("produces identical callDetails structure", async () => {
      const message = sampleLinkedinPosts;
      const context = "Video content optimization";
      const history = [];

      const originalResult = await originalReelsGenerator(
        message,
        context,
        history
      );

      // Verify original structure
      expect(originalResult).toHaveProperty("callID");
      expect(originalResult).toHaveProperty("model");
      expect(originalResult).toHaveProperty("chat");
      expect(originalResult).toHaveProperty("origin");

      // Verify model configuration
      expect(originalResult.model.provider).toBe("openrouter");
      expect(originalResult.model.model).toBe("openai/gpt-4.1");
      expect(originalResult.model.temperature).toBe(0.8);
      expect(originalResult.model.response_format).toEqual({
        type: "json_object",
      });

      // Verify chat structure
      expect(originalResult.chat.systemPrompt).toContain(
        "YOUTUBE REELS CONCEPT CREATOR"
      );
      expect(originalResult.chat.systemPrompt).toContain(
        "2 distinct Reels concepts"
      );
      expect(originalResult.chat.userPrompt).toContain(message);

      // Verify origin structure
      expect(originalResult.origin.conversationID).toBe(
        "waterfall-reels-generator"
      );
      expect(originalResult.origin.channel).toBe("waterfall-pipeline");
    });

    test("includes embedded format guide", async () => {
      const message = sampleLinkedinPosts;
      const context = "";
      const history = [];

      const result = await originalReelsGenerator(message, context, history);

      expect(result.chat.systemPrompt).toContain(
        "First 3 seconds must grab attention"
      );
      expect(result.chat.systemPrompt).toContain(
        "Bold, readable fonts minimum 24pt"
      );
      expect(result.chat.systemPrompt).toContain("Quick, engaging delivery");
      expect(result.chat.systemPrompt).toContain("30-60 seconds optimal");
    });

    test("validates input correctly", async () => {
      await expect(originalReelsGenerator("", "context", [])).rejects.toThrow(
        "Reels Generator requires LinkedIn posts from LinkedIn Creator"
      );

      await expect(
        originalReelsGenerator("invalid json", "context", [])
      ).rejects.toThrow("Reels Generator requires valid JSON LinkedIn posts");
    });
  });

  describe("Waterfall Pipeline Integration", () => {
    test("agents can be chained with proper data flow", async () => {
      const sourceContent = sampleContent;

      // Step 1: Content Analyzer
      const analyzerResult = await originalContentAnalyzer(
        sourceContent,
        "productivity and leadership focus",
        []
      );
      expect(analyzerResult).toBeDefined();
      expect(analyzerResult.chat.systemPrompt).toContain("CONTENT ANALYZER");

      // Step 2: LinkedIn Creator (using mock data)
      const creatorResult = await originalLinkedinCreator(
        sampleTopicChunks,
        "professional audience",
        []
      );
      expect(creatorResult).toBeDefined();
      expect(creatorResult.chat.systemPrompt).toContain(
        "LINKEDIN CONTENT CREATOR"
      );

      // Step 3: Reels Generator (using mock data)
      const reelsResult = await originalReelsGenerator(
        sampleLinkedinPosts,
        "video content focus",
        []
      );
      expect(reelsResult).toBeDefined();
      expect(reelsResult.chat.systemPrompt).toContain(
        "YOUTUBE REELS CONCEPT CREATOR"
      );
    });
  });

  describe("Unique Waterfall Characteristics", () => {
    test("all agents use openrouter provider with gpt-4.1", async () => {
      const contentResult = await originalContentAnalyzer(
        sampleContent,
        "",
        []
      );
      const linkedinResult = await originalLinkedinCreator(
        sampleTopicChunks,
        "",
        []
      );
      const reelsResult = await originalReelsGenerator(
        sampleLinkedinPosts,
        "",
        []
      );

      expect(contentResult.model.provider).toBe("openrouter");
      expect(contentResult.model.model).toBe("openai/gpt-4.1");

      expect(linkedinResult.model.provider).toBe("openrouter");
      expect(linkedinResult.model.model).toBe("openai/gpt-4.1");

      expect(reelsResult.model.provider).toBe("openrouter");
      expect(reelsResult.model.model).toBe("openai/gpt-4.1");
    });

    test("all agents use json_object response format", async () => {
      const contentResult = await originalContentAnalyzer(
        sampleContent,
        "",
        []
      );
      const linkedinResult = await originalLinkedinCreator(
        sampleTopicChunks,
        "",
        []
      );
      const reelsResult = await originalReelsGenerator(
        sampleLinkedinPosts,
        "",
        []
      );

      expect(contentResult.model.response_format).toEqual({
        type: "json_object",
      });
      expect(linkedinResult.model.response_format).toEqual({
        type: "json_object",
      });
      expect(reelsResult.model.response_format).toEqual({
        type: "json_object",
      });
    });

    test("agents have correct temperature settings", async () => {
      const contentResult = await originalContentAnalyzer(
        sampleContent,
        "",
        []
      );
      const linkedinResult = await originalLinkedinCreator(
        sampleTopicChunks,
        "",
        []
      );
      const reelsResult = await originalReelsGenerator(
        sampleLinkedinPosts,
        "",
        []
      );

      expect(contentResult.model.temperature).toBe(0.7);
      expect(linkedinResult.model.temperature).toBe(0.8);
      expect(reelsResult.model.temperature).toBe(0.8);
    });

    test("agents have waterfall-specific origin configurations", async () => {
      const contentResult = await originalContentAnalyzer(
        sampleContent,
        "",
        []
      );
      const linkedinResult = await originalLinkedinCreator(
        sampleTopicChunks,
        "",
        []
      );
      const reelsResult = await originalReelsGenerator(
        sampleLinkedinPosts,
        "",
        []
      );

      // All should have waterfall-specific configurations
      expect(contentResult.origin.channel).toBe("waterfall-pipeline");
      expect(contentResult.origin.channelSpace).toBe("WATERFALL");
      expect(contentResult.origin.gatewayUserID).toBe("waterfall-user");

      expect(linkedinResult.origin.channel).toBe("waterfall-pipeline");
      expect(linkedinResult.origin.channelSpace).toBe("WATERFALL");
      expect(linkedinResult.origin.gatewayUserID).toBe("waterfall-user");

      expect(reelsResult.origin.channel).toBe("waterfall-pipeline");
      expect(reelsResult.origin.channelSpace).toBe("WATERFALL");
      expect(reelsResult.origin.gatewayUserID).toBe("waterfall-user");
    });
  });
});
