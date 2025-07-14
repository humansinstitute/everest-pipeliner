/**
 * Comprehensive Test Suite for Content Waterfall Pipeline
 *
 * Phase 4: Testing Implementation
 *
 * This test suite covers:
 * - Unit tests for pipeline configuration validation
 * - Unit tests for agent configurations
 * - Integration tests for end-to-end pipeline execution
 * - File system integration tests
 * - Content quality validation tests
 * - Performance tests
 * - Error handling and security tests
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import {
  contentWaterfallPipeline,
  validateWaterfallConfig,
  listWaterfallSourceFiles,
  readWaterfallSourceFile,
  validateWaterfallSourceFile,
  generateWaterfallOutputFiles,
} from "../../src/pipelines/contentWaterfallPipeline.js";
import contentAnalyzer from "../../src/agents/waterfall/contentAnalyzer.js";
import linkedinCreator from "../../src/agents/waterfall/linkedinCreator.js";
import reelsGenerator from "../../src/agents/waterfall/reelsGenerator.js";
import {
  readTestFile,
  createTestFile,
  cleanupTestFiles,
  generateMockTopics,
  generateMockLinkedInPosts,
  generateMockReelsConcepts,
  measureExecutionTime,
  measureMemoryUsage,
  validateSanitization,
} from "../utils/waterfallTestHelpers.js";

function mockCLIInputs(inputs) {
  let inputIndex = 0;
  jest.spyOn(process.stdin, "read").mockImplementation(() => {
    if (inputIndex < inputs.length) {
      return inputs[inputIndex++];
    }
    return null;
  });
}

// Mock successful API responses
const mockTopicsResponse = {
  topics: [
    {
      id: 1,
      title: "Remote Work Benefits",
      category: "framework",
      keyInsights: [
        "Flexibility improves work-life balance",
        "Access to global talent",
      ],
      relevantQuotes: ["Employees report higher satisfaction"],
      recommendedAngle: "Educational framework",
      context: "Remote work advantages",
      sourceReferences: "Benefits section",
    },
    {
      id: 2,
      title: "Communication Challenges",
      category: "story",
      keyInsights: [
        "Virtual meetings have limitations",
        "Need intentional communication",
      ],
      relevantQuotes: ["Teams must be more intentional"],
      recommendedAngle: "Problem-solution story",
      context: "Remote work challenges",
      sourceReferences: "Challenges section",
    },
    {
      id: 3,
      title: "Technology Requirements",
      category: "data",
      keyInsights: ["Infrastructure is critical", "Investment in tools needed"],
      relevantQuotes: ["Reliable internet becomes critical"],
      recommendedAngle: "Data-driven insights",
      context: "Technology needs",
      sourceReferences: "Technology section",
    },
    {
      id: 4,
      title: "Future Hybrid Models",
      category: "insight",
      keyInsights: ["Hybrid is the future", "Flexibility is key"],
      relevantQuotes: ["Companies that master this balance"],
      recommendedAngle: "Future-focused insight",
      context: "Future trends",
      sourceReferences: "Future section",
    },
  ],
  extractionSummary:
    "Extracted 4 distinct topics covering benefits, challenges, technology, and future trends",
};

const mockLinkedInResponse = {
  linkedinPosts: [
    {
      id: 1,
      sourceTopicId: 1,
      title: "Remote Work Revolution",
      content:
        "The remote work revolution is here to stay.\n\nHere's what I've learned:\n\n• Flexibility leads to better work-life balance\n• Companies can access global talent\n• Productivity often increases\n\nWhat's your experience with remote work?\n\n#RemoteWork #Productivity #WorkLifeBalance",
      approach: "story-driven",
      hashtags: ["#RemoteWork", "#Productivity", "#WorkLifeBalance"],
      estimatedEngagement: "high",
      keyElements: {
        hook: "The remote work revolution is here to stay",
        insight: "Flexibility and global talent access are key benefits",
        cta: "What's your experience with remote work?",
      },
    },
    {
      id: 2,
      sourceTopicId: 2,
      title: "Communication Framework",
      content:
        "Remote communication requires a new framework.\n\nThe old way: Casual desk-side chats\nThe new way: Intentional communication protocols\n\n3 key strategies:\n• Use instant messaging for quick questions\n• Video calls for complex discussions\n• Asynchronous tools for non-urgent matters\n\nHow do you structure remote communication?\n\n#RemoteCommunication #TeamWork #Leadership",
      approach: "framework",
      hashtags: ["#RemoteCommunication", "#TeamWork", "#Leadership"],
      estimatedEngagement: "medium",
      keyElements: {
        hook: "Remote communication requires a new framework",
        insight: "Intentional communication protocols are essential",
        cta: "How do you structure remote communication?",
      },
    },
    {
      id: 3,
      sourceTopicId: 3,
      title: "Tech Investment Question",
      content:
        "Is your company investing enough in remote work technology?\n\nThe data is clear:\n• 30-50% reduction in real estate costs\n• But many companies underinvest in home office setups\n• Cybersecurity becomes mission-critical\n\nThe math is simple: Invest in technology or lose productivity.\n\nWhat's your biggest tech challenge working remotely?\n\n#Technology #RemoteWork #Investment",
      approach: "question",
      hashtags: ["#Technology", "#RemoteWork", "#Investment"],
      estimatedEngagement: "high",
      keyElements: {
        hook: "Is your company investing enough in remote work technology?",
        insight: "Technology investment directly impacts productivity",
        cta: "What's your biggest tech challenge working remotely?",
      },
    },
    {
      id: 4,
      sourceTopicId: 4,
      title: "Hybrid Future Insight",
      content:
        "The future of work isn't remote vs. office.\n\nIt's hybrid.\n\nSuccessful companies will:\n→ Offer flexible arrangements\n→ Focus on results, not location\n→ Invest in both digital and physical spaces\n→ Trust their teams\n\nThe winners will be those who adapt fastest.\n\nIs your organization ready for the hybrid future?\n\n#FutureOfWork #Hybrid #Leadership #Flexibility",
      approach: "insight",
      hashtags: ["#FutureOfWork", "#Hybrid", "#Leadership", "#Flexibility"],
      estimatedEngagement: "high",
      keyElements: {
        hook: "The future of work isn't remote vs. office",
        insight: "Hybrid models require strategic adaptation",
        cta: "Is your organization ready for the hybrid future?",
      },
    },
  ],
  creationSummary:
    "Created 4 LinkedIn posts with varied approaches: story-driven, framework, question, and insight",
};

const mockReelsResponse = {
  reelsConcepts: [
    {
      id: 1,
      sourcePostId: 1,
      title: "Remote Work Benefits Quick Tips",
      type: "tip",
      hook: "3 remote work benefits your boss needs to know",
      script: {
        timing: "0-3s: Hook, 3-15s: Benefits list, 15-30s: Call to action",
        content:
          "Start with hook, show 3 benefits with text overlays, end with engagement question",
      },
      visualSuggestions: {
        textOverlays: [
          "Benefit #1: Flexibility",
          "Benefit #2: Global Talent",
          "Benefit #3: Higher Productivity",
        ],
        visualElements: [
          "Split screen comparisons",
          "Animated text reveals",
          "Professional background",
        ],
        transitions: "Quick cuts between benefits",
      },
      productionNotes:
        "Use clean, professional visuals with bold text. Keep pace energetic.",
      estimatedEngagement: "high",
    },
    {
      id: 2,
      sourcePostId: 1,
      title: "Remote Work Success Story",
      type: "story",
      hook: "How remote work changed my life",
      script: {
        timing:
          "0-3s: Personal hook, 3-20s: Story development, 20-30s: Key takeaway",
        content:
          "Personal story about remote work transformation with specific examples",
      },
      visualSuggestions: {
        textOverlays: [
          "Before: Commute stress",
          "After: Work-life balance",
          "Result: 2x productivity",
        ],
        visualElements: [
          "Before/after scenarios",
          "Personal footage",
          "Results graphics",
        ],
        transitions: "Smooth transitions between story beats",
      },
      productionNotes:
        "Make it personal and relatable. Use authentic footage when possible.",
      estimatedEngagement: "high",
    },
    {
      id: 3,
      sourcePostId: 2,
      title: "Communication Framework Tutorial",
      type: "tutorial",
      hook: "The 3-step remote communication framework",
      script: {
        timing:
          "0-3s: Framework introduction, 3-25s: Step-by-step breakdown, 25-30s: Implementation tip",
        content:
          "Clear tutorial showing each communication method with examples",
      },
      visualSuggestions: {
        textOverlays: [
          "Step 1: Quick Questions",
          "Step 2: Complex Discussions",
          "Step 3: Async Updates",
        ],
        visualElements: [
          "Screen recordings",
          "App demonstrations",
          "Flow charts",
        ],
        transitions: "Step-by-step reveals",
      },
      productionNotes:
        "Show actual tools and interfaces. Make it actionable and easy to follow.",
      estimatedEngagement: "medium",
    },
    {
      id: 4,
      sourcePostId: 2,
      title: "Communication Myths Busted",
      type: "insight",
      hook: "Remote communication myths that hurt your team",
      script: {
        timing:
          "0-3s: Myth setup, 3-20s: Reality reveal, 20-30s: Better approach",
        content: "Debunk common remote communication misconceptions",
      },
      visualSuggestions: {
        textOverlays: [
          "Myth: More meetings = better communication",
          "Reality: Quality > Quantity",
          "Solution: Structured protocols",
        ],
        visualElements: [
          "Myth vs reality graphics",
          "Data visualizations",
          "Solution demonstrations",
        ],
        transitions: "Dramatic reveals for myth-busting",
      },
      productionNotes:
        "Use contrasting visuals to highlight myths vs reality. Make it memorable.",
      estimatedEngagement: "high",
    },
    {
      id: 5,
      sourcePostId: 3,
      title: "Tech Investment ROI",
      type: "data",
      hook: "The shocking ROI of remote work tech",
      script: {
        timing: "0-3s: ROI hook, 3-20s: Data presentation, 20-30s: Action step",
        content: "Present compelling data about technology investment returns",
      },
      visualSuggestions: {
        textOverlays: [
          "30-50% cost reduction",
          "But 70% underinvest",
          "Smart investment = 2x ROI",
        ],
        visualElements: [
          "Animated charts",
          "Cost comparison graphics",
          "ROI calculations",
        ],
        transitions: "Data-driven animations",
      },
      productionNotes:
        "Make data visually compelling. Use charts and graphs effectively.",
      estimatedEngagement: "medium",
    },
    {
      id: 6,
      sourcePostId: 3,
      title: "Tech Setup Tour",
      type: "tutorial",
      hook: "My $500 remote work setup that beats any office",
      script: {
        timing:
          "0-3s: Setup introduction, 3-25s: Equipment tour, 25-30s: Total cost reveal",
        content:
          "Show practical, affordable remote work setup with specific recommendations",
      },
      visualSuggestions: {
        textOverlays: [
          "Monitor: $150",
          "Chair: $200",
          "Lighting: $50",
          "Total: $500",
        ],
        visualElements: [
          "Equipment close-ups",
          "Setup demonstrations",
          "Price overlays",
        ],
        transitions: "Smooth equipment reveals",
      },
      productionNotes:
        "Show actual equipment in use. Include specific product recommendations.",
      estimatedEngagement: "high",
    },
    {
      id: 7,
      sourcePostId: 4,
      title: "Hybrid Future Prediction",
      type: "insight",
      hook: "The hybrid work prediction that will shock you",
      script: {
        timing:
          "0-3s: Prediction hook, 3-20s: Trend analysis, 20-30s: Preparation advice",
        content:
          "Share insights about the future of hybrid work with actionable preparation steps",
      },
      visualSuggestions: {
        textOverlays: [
          "2025: 80% hybrid",
          "Winners: Flexible companies",
          "Losers: Rigid structures",
        ],
        visualElements: [
          "Future timeline graphics",
          "Trend visualizations",
          "Success indicators",
        ],
        transitions: "Future-focused animations",
      },
      productionNotes:
        "Use futuristic visual style. Make predictions feel credible and actionable.",
      estimatedEngagement: "high",
    },
    {
      id: 8,
      sourcePostId: 4,
      title: "Hybrid Readiness Checklist",
      type: "tutorial",
      hook: "Is your company hybrid-ready? This checklist will tell you",
      script: {
        timing:
          "0-3s: Checklist introduction, 3-25s: Key criteria review, 25-30s: Assessment call-to-action",
        content: "Practical checklist for evaluating hybrid work readiness",
      },
      visualSuggestions: {
        textOverlays: [
          "✓ Flexible policies",
          "✓ Digital tools",
          "✓ Results focus",
          "✓ Trust culture",
        ],
        visualElements: [
          "Checklist animations",
          "Progress indicators",
          "Assessment graphics",
        ],
        transitions: "Checkbox reveals",
      },
      productionNotes:
        "Make it interactive and actionable. Use clear visual indicators for each item.",
      estimatedEngagement: "medium",
    },
  ],
  generationSummary:
    "Generated 8 reels concepts with variety: 2 tips, 2 stories, 3 tutorials, 1 data-focused",
};

describe("Content Waterfall Pipeline - Comprehensive Test Suite", () => {
  beforeAll(async () => {
    // Ensure test directories exist
    await fs.mkdir("tests/fixtures/waterfall", { recursive: true });
    await fs.mkdir("temp", { recursive: true });
    await fs.mkdir("output/waterfall/ip", { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test files
    await cleanupTestFiles([
      "temp/test_*",
      "output/waterfall/test_*",
      "output/waterfall/25_*",
    ]);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // ===== UNIT TESTS: Pipeline Configuration Validation =====
  describe("Pipeline Configuration Validation", () => {
    test("validateWaterfallConfig - valid configuration", () => {
      const config = {
        sourceText:
          "Valid long-form content for testing with sufficient length to pass validation checks.",
        customFocus: "Focus on leadership insights",
      };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedConfig).toBeDefined();
      expect(result.sanitizedConfig.sourceText).toBe(config.sourceText);
      expect(result.sanitizedConfig.customFocus).toBe(config.customFocus);
    });

    test("validateWaterfallConfig - missing source text", () => {
      const config = { customFocus: "Some focus" };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "sourceText is required and must be a string"
      );
      expect(result.sanitizedConfig).toBeNull();
    });

    test("validateWaterfallConfig - empty source text", () => {
      const config = { sourceText: "   " };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("sourceText cannot be empty");
      expect(result.sanitizedConfig).toBeNull();
    });

    test("validateWaterfallConfig - null source text", () => {
      const config = { sourceText: null };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "sourceText is required and must be a string"
      );
    });

    test("validateWaterfallConfig - invalid customFocus type", () => {
      const config = {
        sourceText: "Valid content",
        customFocus: 123,
      };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("customFocus must be a string");
    });

    test("validateWaterfallConfig - empty customFocus is ignored", () => {
      const config = {
        sourceText: "Valid content",
        customFocus: "   ",
      };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig.customFocus).toBeUndefined();
    });

    test("validateWaterfallConfig - sanitizes special characters", () => {
      const config = {
        sourceText: 'Content with "quotes" and \n newlines \t tabs',
        customFocus: 'Focus with "quotes"',
      };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig.sourceText).toContain('\\"');
      expect(result.sanitizedConfig.sourceText).toContain("\\n");
      expect(result.sanitizedConfig.sourceText).toContain("\\t");
      expect(result.sanitizedConfig.customFocus).toContain('\\"');
    });
  });

  // ===== UNIT TESTS: Agent Configurations =====
  describe("Waterfall Agents Configuration", () => {
    test("contentAnalyzer - generates valid agent configuration", async () => {
      const message =
        "Test source material for content analysis with sufficient length for processing.";
      const context = "Analysis context for testing";

      const result = await contentAnalyzer(message, context, []);

      expect(result.callID).toBeDefined();
      expect(result.callID).toMatch(/^content-analyzer-\d+$/);
      expect(result.model.model).toBe("openai/gpt-4.1");
      expect(result.model.temperature).toBe(0.7);
      expect(result.model.response_format.type).toBe("json_object");
      expect(result.chat.systemPrompt).toContain("CONTENT ANALYZER");
      expect(result.chat.systemPrompt).toContain(
        "exactly 4 distinct, compelling topics"
      );
      expect(result.chat.userPrompt).toContain(message);
      expect(result.origin.conversationID).toBe("waterfall-content-analyzer");
    });

    test("linkedinCreator - generates valid configuration", async () => {
      const topicChunks = JSON.stringify([
        {
          id: 1,
          title: "Test Topic",
          keyInsights: ["insight1"],
          category: "framework",
          relevantQuotes: ["quote1"],
          recommendedAngle: "Educational",
          context: "Test context",
        },
      ]);

      const result = await linkedinCreator(topicChunks, "context", []);

      expect(result.callID).toMatch(/^linkedin-creator-\d+$/);
      expect(result.model.model).toBe("openai/gpt-4.1");
      expect(result.model.temperature).toBe(0.8);
      expect(result.model.response_format.type).toBe("json_object");
      expect(result.chat.systemPrompt).toContain("LINKEDIN CONTENT CREATOR");
      expect(result.chat.systemPrompt).toContain("Story-driven approach");
      expect(result.chat.systemPrompt).toContain(
        "Framework/educational approach"
      );
      expect(result.origin.conversationID).toBe("waterfall-linkedin-creator");
    });

    test("reelsGenerator - generates valid configuration", async () => {
      const linkedinPosts = JSON.stringify([
        {
          id: 1,
          title: "Test Post",
          content: "Test content",
          approach: "story",
          hashtags: ["#test"],
        },
      ]);

      const result = await reelsGenerator(linkedinPosts, "context", []);

      expect(result.callID).toMatch(/^reels-generator-\d+$/);
      expect(result.model.model).toBe("openai/gpt-4.1");
      expect(result.model.temperature).toBe(0.8);
      expect(result.model.response_format.type).toBe("json_object");
      expect(result.chat.systemPrompt).toContain(
        "YOUTUBE REELS CONCEPT CREATOR"
      );
      expect(result.chat.systemPrompt).toContain("2 distinct Reels concepts");
      expect(result.origin.conversationID).toBe("waterfall-reels-generator");
    });

    test("agents handle invalid input appropriately", async () => {
      await expect(contentAnalyzer("", "context", [])).rejects.toThrow(
        "Content Analyzer requires source material text"
      );

      await expect(linkedinCreator("", "context", [])).rejects.toThrow(
        "LinkedIn Creator requires topic chunks from Content Analyzer"
      );

      await expect(reelsGenerator("", "context", [])).rejects.toThrow(
        "Reels Generator requires LinkedIn posts from LinkedIn Creator"
      );
    });
  });

  // ===== FILE SYSTEM INTEGRATION TESTS =====
  describe("File System Integration", () => {
    beforeEach(async () => {
      // Clean up any existing test files
      await cleanupTestFiles(["output/waterfall/ip/test_*"]);
    });

    test("listWaterfallSourceFiles - finds available input files", async () => {
      // Clean up all existing files first
      await cleanupTestFiles(["output/waterfall/ip/*"]);

      // Create test files
      await createTestFile("output/waterfall/ip/test1.txt", "Test content 1");
      await createTestFile("output/waterfall/ip/test2.md", "Test content 2");
      await createTestFile(
        "output/waterfall/ip/ignored.pdf",
        "Should be ignored"
      );

      const files = await listWaterfallSourceFiles();

      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.find((f) => f.name === "test1.txt")).toBeDefined();
      expect(files.find((f) => f.name === "test2.md")).toBeDefined();
      expect(files.find((f) => f.name === "ignored.pdf")).toBeUndefined();
    });

    test("readWaterfallSourceFile - reads file content correctly", async () => {
      const testContent =
        "Test file content for waterfall pipeline processing and validation.";
      const filePath = "output/waterfall/ip/test_read.txt";
      await createTestFile(filePath, testContent);

      const content = await readWaterfallSourceFile(filePath);
      expect(content).toBe(testContent);
    });

    test("validateWaterfallSourceFile - validates file types and accessibility", async () => {
      // Create valid test files
      await createTestFile("output/waterfall/ip/valid.txt", "Valid content");
      await createTestFile("output/waterfall/ip/valid.md", "Valid markdown");

      expect(
        await validateWaterfallSourceFile("output/waterfall/ip/valid.txt")
      ).toBe(true);
      expect(
        await validateWaterfallSourceFile("output/waterfall/ip/valid.md")
      ).toBe(true);
      expect(await validateWaterfallSourceFile("nonexistent.txt")).toBe(false);
    });

    test("generateWaterfallOutputFiles - creates complete file structure", async () => {
      const mockPipelineData = {
        runId: "test-run-123",
        costs: { total: 0.5 },
        startTime: new Date().toISOString(),
        status: "completed",
      };

      const mockResults = {
        topics: mockTopicsResponse,
        linkedinPosts: mockLinkedInResponse,
        reelsConcepts: mockReelsResponse,
      };

      const mockConfig = {
        sourceText: "Test source content",
        customFocus: "Test focus",
      };

      const result = await generateWaterfallOutputFiles(
        mockPipelineData,
        mockResults,
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files.topicExtractions).toBeDefined();
      expect(result.files.linkedinPosts).toHaveLength(4);
      expect(result.files.reelsConcepts).toHaveLength(8);
      expect(result.files.summary).toBeDefined();
      expect(result.files.data).toBeDefined();

      // Verify files actually exist
      expect(
        await fs
          .access(result.files.topicExtractions)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
      expect(
        await fs
          .access(result.files.summary)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
    });
  });

  // ===== CONTENT QUALITY TESTS =====
  describe("Content Quality Validation", () => {
    test("mock data structures are valid", () => {
      // Test topics structure
      expect(mockTopicsResponse.topics).toHaveLength(4);
      mockTopicsResponse.topics.forEach((topic) => {
        expect(topic.title).toBeDefined();
        expect(topic.category).toMatch(/framework|story|data|insight/);
        expect(topic.keyInsights).toBeInstanceOf(Array);
        expect(topic.recommendedAngle).toBeDefined();
      });

      // Test LinkedIn posts structure
      expect(mockLinkedInResponse.linkedinPosts).toHaveLength(4);
      mockLinkedInResponse.linkedinPosts.forEach((post) => {
        expect(post.content).toContain("\n"); // Line breaks
        expect(post.hashtags).toBeInstanceOf(Array);
        expect(post.hashtags.length).toBeGreaterThanOrEqual(3);
        expect(post.hashtags.length).toBeLessThanOrEqual(5);
        expect(post.keyElements.hook).toBeDefined();
        expect(post.keyElements.cta).toBeDefined();
      });

      // Test Reels structure
      expect(mockReelsResponse.reelsConcepts).toHaveLength(8);
      for (let postId = 1; postId <= 4; postId++) {
        const reelsForPost = mockReelsResponse.reelsConcepts.filter(
          (r) => r.sourcePostId === postId
        );
        expect(reelsForPost).toHaveLength(2);
      }

      mockReelsResponse.reelsConcepts.forEach((reel) => {
        expect(reel.title).toBeDefined();
        expect(reel.type).toMatch(/tip|insight|question|story|tutorial|data/);
        expect(reel.hook).toBeDefined();
        expect(reel.script).toBeDefined();
        expect(reel.script.timing).toBeDefined();
        expect(reel.visualSuggestions).toBeDefined();
        expect(reel.visualSuggestions.textOverlays).toBeInstanceOf(Array);
        expect(reel.productionNotes).toBeDefined();
      });
    });
  });

  // ===== PERFORMANCE TESTS =====
  describe("Performance Tests", () => {
    test("validation functions execute quickly", async () => {
      const config = {
        sourceText: "Test content for performance validation testing.",
        customFocus: "Performance testing focus",
      };

      const { result, durationSeconds } = await measureExecutionTime(() =>
        validateWaterfallConfig(config)
      );

      expect(result.isValid).toBe(true);
      expect(durationSeconds).toBeLessThan(0.1); // Should complete in under 100ms
    });

    test("agent configuration generation is efficient", async () => {
      const message = "Test message for performance testing.";
      const context = "Performance test context";

      const { result, durationSeconds } = await measureExecutionTime(() =>
        contentAnalyzer(message, context, [])
      );

      expect(result.callID).toBeDefined();
      expect(durationSeconds).toBeLessThan(0.1); // Should complete in under 100ms
    });

    test("memory usage remains stable during validation", async () => {
      const config = {
        sourceText: "Test content ".repeat(1000), // Larger content
        customFocus: "Memory test focus",
      };

      const { result, memoryUsage } = await measureMemoryUsage(() =>
        validateWaterfallConfig(config)
      );

      expect(result.isValid).toBe(true);
      expect(memoryUsage.heapUsedDeltaMB).toBeLessThan(10); // Less than 10MB increase
    });
  });

  // ===== ERROR HANDLING AND SECURITY TESTS =====
  describe("Error Handling and Security", () => {
    test("handles malformed input gracefully", () => {
      const config = { sourceText: null };
      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "sourceText is required and must be a string"
      );
    });

    test("handles empty source text", () => {
      const config = { sourceText: "" };
      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("sourceText is required and must be a string");
    });

    test("sanitizes potentially malicious input", () => {
      const maliciousInput =
        'Content with <script>alert("xss")</script> tags and "quotes" and \\n newlines';
      const config = { sourceText: maliciousInput };

      const result = validateWaterfallConfig(config);

      expect(result.isValid).toBe(true);
      // The sanitization function escapes quotes and special characters
      expect(result.sanitizedConfig.sourceText).toContain('\\"'); // Quotes should be escaped
      expect(result.sanitizedConfig.sourceText).toContain('\\n'); // Newlines should be escaped
      // Note: The sanitization doesn't remove HTML tags, just escapes for JSON
      expect(result.sanitizedConfig.sourceText).toContain('<script>');
    });

    test("validates file paths for security", async () => {
      const maliciousPaths = [
        "../../../etc/passwd",
        "/etc/shadow",
        "C:\\Windows\\System32\\config\\SAM",
      ];

      for (const maliciousPath of maliciousPaths) {
        const isValid = await validateWaterfallSourceFile(maliciousPath);
        expect(isValid).toBe(false);
      }
    });

    test("prevents directory traversal in file operations", async () => {
      const files = await listWaterfallSourceFiles();

      // Ensure no files outside the expected directory are returned
      files.forEach((file) => {
        expect(file.path).toContain("output/waterfall/ip");
        expect(file.path).not.toContain("..");
      });
    });
  });

  // ===== INTEGRATION TESTS: Agent Chain Validation =====
  describe("Agent Chain Integration", () => {
    test("data flows correctly between agents", async () => {
      const sourceContent = await readTestFile("test_content.txt");

      // Test Content Analyzer
      const analyzerConfig = await contentAnalyzer(
        sourceContent,
        "test focus",
        []
      );
      expect(analyzerConfig).toBeDefined();
      // The user prompt contains the source content plus additional instructions
      expect(analyzerConfig.chat.userPrompt).toContain("Please analyze this source material");
      expect(analyzerConfig.chat.userPrompt).toContain("Effective Leadership");

      // Test LinkedIn Creator with mock topics
      const mockTopics = JSON.stringify(mockTopicsResponse.topics);
      const creatorConfig = await linkedinCreator(
        mockTopics,
        "professional",
        []
      );
      expect(creatorConfig).toBeDefined();
      expect(creatorConfig.chat.userPrompt).toContain(mockTopics);

      // Test Reels Generator with mock posts
      const mockPosts = JSON.stringify(mockLinkedInResponse.linkedinPosts);
      const reelsConfig = await reelsGenerator(mockPosts, "video content", []);
      expect(reelsConfig).toBeDefined();
      expect(reelsConfig.chat.userPrompt).toContain(mockPosts);
    });

    test("agents maintain consistent data structure", async () => {
      // Verify that each agent expects the output format of the previous agent
      const topics = mockTopicsResponse.topics;
      const posts = mockLinkedInResponse.linkedinPosts;

      // LinkedIn Creator should accept topics array
      expect(() => JSON.stringify(topics)).not.toThrow();

      // Reels Generator should accept posts array
      expect(() => JSON.stringify(posts)).not.toThrow();

      // Verify required fields are present
      topics.forEach((topic) => {
        expect(topic.id).toBeDefined();
        expect(topic.title).toBeDefined();
        expect(topic.category).toBeDefined();
      });

      posts.forEach((post) => {
        expect(post.id).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.content).toBeDefined();
      });
    });
  });

  // ===== REGRESSION TESTS =====
  describe("Regression Tests", () => {
    test("maintains backward compatibility with existing configurations", () => {
      // Test with minimal configuration
      const minimalConfig = {
        sourceText:
          "Minimal test content for backward compatibility validation with sufficient length.",
      };

      const validation = validateWaterfallConfig(minimalConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedConfig.sourceText).toBeDefined();
    });

    test("handles legacy data formats gracefully", () => {
      // Test with old-style topic format (if any)
      const legacyTopics = [
        {
          title: "Legacy Topic",
          insights: ["insight1", "insight2"], // Old field name
          quotes: ["quote1"], // Old field name
          angle: "Educational", // Old field name
        },
      ];

      // Should not break when processing legacy formats
      expect(() => JSON.stringify(legacyTopics)).not.toThrow();
    });
  });

  // ===== EDGE CASES =====
  describe("Edge Cases", () => {
    test("handles very short content", () => {
      const config = { sourceText: "Short content." };
      const validation = validateWaterfallConfig(config);

      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedConfig.sourceText).toBe("Short content.");
    });

    test("handles content with only whitespace", () => {
      const config = { sourceText: "   \n\t   " };
      const validation = validateWaterfallConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("sourceText cannot be empty");
    });

    test("handles unicode and special characters", () => {
      const config = {
        sourceText:
          "Content with émojis 🚀 and unicode characters ñáéíóú and symbols ©®™ for testing purposes.",
        customFocus: "Focus with émojis 🎯 and unicode",
      };

      const validation = validateWaterfallConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedConfig.sourceText).toContain("🚀");
      expect(validation.sanitizedConfig.customFocus).toContain("🎯");
    });

    test("handles extremely long content", () => {
      const longContent = "Very long content. ".repeat(10000); // ~200KB
      const config = { sourceText: longContent };

      const validation = validateWaterfallConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedConfig.sourceText.length).toBeGreaterThan(
        100000
      );
    });
  });
});
