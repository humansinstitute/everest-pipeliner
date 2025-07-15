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

// Mock MCP SDK components to simulate Claude Desktop interaction
jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("@modelcontextprotocol/sdk/server/stdio.js");

describe("Claude Desktop Workflow Simulation", () => {
  let server;
  let mockConfig;
  let mockTransport;
  let mockMCPServer;

  beforeEach(async () => {
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
      cacheEnabled: false,
    };

    // Mock transport for stdio communication
    mockTransport = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      send: jest.fn(),
      onMessage: jest.fn(),
      onClose: jest.fn(),
    };

    // Mock MCP Server SDK
    mockMCPServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      setRequestHandler: jest.fn(),
      sendNotification: jest.fn(),
    };

    const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
    const {
      StdioServerTransport,
    } = await import("@modelcontextprotocol/sdk/server/stdio.js");

    Server.mockImplementation(() => mockMCPServer);
    StdioServerTransport.mockImplementation(() => mockTransport);
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
  });

  describe("Claude Desktop Connection Simulation", () => {
    test("should establish connection with Claude Desktop", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Mock pipeline discovery for realistic scenario
      const mockPipelines = [
        { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        {
          name: "facilitatedDialogue",
          path: "./src/pipelines/facilitatedDialoguePipeline.js",
        },
        {
          name: "contentWaterfall",
          path: "./src/pipelines/contentWaterfallPipeline.js",
        },
        { name: "simpleChat", path: "./src/pipelines/simpleChatPipeline.js" },
      ];

      const mockTools = [
        {
          name: "run_pipeliner_dialogue",
          description:
            "Execute dialogue between two agents to analyze and discuss content",
          inputSchema: {
            type: "object",
            properties: {
              sourceText: {
                type: "string",
                description:
                  "The source material to be discussed by the agents",
              },
              discussionPrompt: {
                type: "string",
                description:
                  "The specific prompt or question to guide the discussion",
              },
              iterations: {
                type: "number",
                description: "Number of back-and-forth exchanges (default: 3)",
                minimum: 1,
                maximum: 10,
              },
              summaryFocus: {
                type: "string",
                description: "Optional focus for the final summary",
              },
            },
            required: ["sourceText", "discussionPrompt"],
          },
        },
        {
          name: "run_pipeliner_facilitatedDialogue",
          description:
            "Execute facilitated dialogue with AI facilitator interventions",
          inputSchema: {
            type: "object",
            properties: {
              sourceText: {
                type: "string",
                description: "Source material for discussion",
              },
              discussionPrompt: {
                type: "string",
                description: "Discussion prompt",
              },
              iterations: {
                type: "number",
                description: "Number of iterations (must be even)",
              },
              summaryFocus: { type: "string", description: "Summary focus" },
            },
            required: ["sourceText", "discussionPrompt"],
          },
        },
        {
          name: "run_pipeliner_contentWaterfall",
          description:
            "Transform long-form content into social media posts and concepts",
          inputSchema: {
            type: "object",
            properties: {
              sourceText: {
                type: "string",
                description:
                  "Long-form content to transform (articles, transcripts, etc.)",
              },
              customFocus: {
                type: "string",
                description:
                  "Optional custom focus areas for content extraction",
              },
            },
            required: ["sourceText"],
          },
        },
        {
          name: "run_pipeliner_simpleChat",
          description: "Simple chat interaction with AI agent",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Message to send to the AI agent",
              },
              context: {
                type: "string",
                description: "Optional context for the conversation",
              },
            },
            required: ["message"],
          },
        },
      ];

      server.registry.discoverPipelines = jest
        .fn()
        .mockResolvedValue(mockPipelines);
      server.registry.registerPipelineAsTool = jest
        .fn()
        .mockReturnValueOnce(mockTools[0])
        .mockReturnValueOnce(mockTools[1])
        .mockReturnValueOnce(mockTools[2])
        .mockReturnValueOnce(mockTools[3]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 4,
        registeredTools: 4,
        interfaces: { mcp: 4, nostrmq: 4, cli: 4 },
      });

      // Initialize and start server (simulating Claude Desktop startup)
      await server.initialize();
      await server.start();

      // Verify connection was established
      expect(mockMCPServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(server.tools.size).toBe(4);

      // Verify request handlers were set up
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    test("should handle Claude Desktop tool discovery request", async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Setup with realistic tools
      const mockTools = [
        {
          name: "run_pipeliner_dialogue",
          description: "Execute dialogue between two agents to analyze content",
          inputSchema: {
            type: "object",
            properties: {
              sourceText: { type: "string" },
              discussionPrompt: { type: "string" },
            },
            required: ["sourceText", "discussionPrompt"],
          },
        },
      ];

      server.registry.discoverPipelines = jest
        .fn()
        .mockResolvedValue([
          { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        ]);
      server.registry.registerPipelineAsTool = jest
        .fn()
        .mockReturnValue(mockTools[0]);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 1,
        registeredTools: 1,
      });

      await server.initialize();

      // Simulate Claude Desktop requesting tool list
      let listToolsHandler;
      mockMCPServer.setRequestHandler.mockImplementation((schema, handler) => {
        if (schema.method === "tools/list") {
          listToolsHandler = handler;
        }
      });

      // Re-setup handlers
      server.setupHandlers();

      // Simulate the request
      const toolListResponse = await listToolsHandler();

      expect(toolListResponse).toEqual({
        tools: [mockTools[0]],
      });
    });
  });

  describe("Realistic Claude Desktop Usage Scenarios", () => {
    beforeEach(async () => {
      server = new PipelinerMCPServer(mockConfig);

      // Setup realistic dialogue tool
      const mockTool = {
        name: "run_pipeliner_dialogue",
        description: "Execute dialogue between two agents to analyze content",
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
    });

    test("should handle Claude analyzing a research paper", async () => {
      // Simulate Claude Desktop calling the dialogue tool to analyze a research paper
      const researchPaper = `
        Title: The Impact of AI on Software Development

        Abstract: This paper examines how artificial intelligence is transforming 
        software development practices, from code generation to testing and deployment.
        We analyze current trends and future implications for developers and organizations.

        Introduction: The software development landscape has undergone significant 
        changes with the introduction of AI-powered tools. These tools are not just 
        automating routine tasks but are beginning to assist in creative and 
        problem-solving aspects of development.

        Key Findings:
        1. AI code generation tools increase developer productivity by 30-40%
        2. Automated testing with AI reduces bug detection time by 50%
        3. AI-assisted code review improves code quality metrics
        4. Developer roles are evolving rather than being replaced

        Conclusion: AI is augmenting human capabilities in software development 
        rather than replacing developers entirely.
      `;

      const discussionPrompt = `
        Please analyze this research paper and discuss:
        1. The main claims and evidence presented
        2. Potential implications for the software industry
        3. Any limitations or areas that need further research
        4. How these findings align with current industry trends
      `;

      // Mock successful execution
      const mockResult = {
        success: true,
        runId: "claude-research-analysis-001",
        conversation: [
          {
            agent: "Agent1",
            content:
              "This research paper presents compelling evidence about AI's impact on software development. The productivity gains of 30-40% are significant and align with what we're seeing in the industry with tools like GitHub Copilot and ChatGPT.",
            iteration: 1,
          },
          {
            agent: "Agent2",
            content:
              "I agree with the productivity findings, but I'd like to examine the methodology behind these numbers. The paper mentions automated testing reducing bug detection time by 50% - this is particularly interesting because it suggests AI is not just helping with code generation but also with quality assurance.",
            iteration: 1,
          },
          {
            agent: "Agent1",
            content:
              "That's a crucial point. The quality aspect is often overlooked in discussions about AI coding tools. The finding about AI-assisted code review improving quality metrics suggests that AI can help catch issues that human reviewers might miss, especially in large codebases.",
            iteration: 2,
          },
          {
            agent: "Agent2",
            content:
              "However, we should consider the limitations. The paper doesn't deeply address the potential risks of over-reliance on AI tools, such as developers losing fundamental coding skills or the introduction of subtle biases in AI-generated code. These are important considerations for the industry.",
            iteration: 2,
          },
        ],
        summary: {
          content:
            "The research paper provides valuable insights into AI's transformative impact on software development. Key findings include significant productivity gains (30-40%), improved testing efficiency (50% faster bug detection), and enhanced code quality through AI-assisted reviews. The analysis reveals that AI is augmenting rather than replacing developers, leading to role evolution. However, the discussion highlights important considerations including the need for better methodology transparency, potential risks of over-reliance on AI tools, and the importance of maintaining fundamental development skills. The findings align well with current industry trends but warrant further research into long-term implications and potential drawbacks.",
        },
        pipeline: {
          statistics: {
            durationSeconds: 67,
            completedSteps: 5,
            totalSteps: 5,
          },
          costs: {
            total: 0.0456,
          },
        },
      };

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: {
          sourceText: researchPaper,
          discussionPrompt: discussionPrompt,
          iterations: 2,
        },
      });

      server.executor.executeViaMCP = jest.fn().mockResolvedValue(mockResult);

      // Execute the tool (simulating Claude Desktop call)
      const result = await server.executeTool("run_pipeliner_dialogue", {
        sourceText: researchPaper,
        discussionPrompt: discussionPrompt,
        iterations: 2,
      });

      // Verify Claude would receive a well-formatted response
      expect(result.success).toBe(true);
      expect(result.content[0].text).toContain(
        "Pipeline executed successfully"
      );
      expect(result.content[0].text).toContain(
        "Run ID: claude-research-analysis-001"
      );
      expect(result.content[0].text).toContain("Duration: 67 seconds");
      expect(result.content[0].text).toContain("=== Conversation ===");
      expect(result.content[0].text).toContain(
        "Agent1 (Iteration 1): This research paper presents compelling evidence"
      );
      expect(result.content[0].text).toContain(
        "Agent2 (Iteration 2): However, we should consider the limitations"
      );
      expect(result.content[0].text).toContain("=== Summary ===");
      expect(result.content[0].text).toContain(
        "The research paper provides valuable insights"
      );
    });

    test("should handle Claude creating social media content", async () => {
      // Setup content waterfall tool
      const waterfallTool = {
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

      server.tools.set("run_pipeliner_contentWaterfall", waterfallTool);

      const blogPost = `
        How to Build Better APIs: A Developer's Guide

        Building robust, scalable APIs is crucial for modern applications. Here are 
        the key principles every developer should follow:

        1. Design First: Always start with API design before implementation
        2. Use Consistent Naming: Follow RESTful conventions and be consistent
        3. Implement Proper Error Handling: Return meaningful error messages
        4. Version Your APIs: Plan for changes from the beginning
        5. Document Everything: Good documentation is as important as good code
        6. Test Thoroughly: Include unit, integration, and load testing
        7. Monitor Performance: Track usage patterns and performance metrics

        Following these principles will help you create APIs that are maintainable,
        scalable, and developer-friendly.
      `;

      const mockResult = {
        success: true,
        runId: "claude-content-waterfall-001",
        topics: {
          topics: [
            {
              title: "API Design Principles",
              description: "Core principles for building robust APIs",
            },
            {
              title: "API Documentation",
              description: "Importance of comprehensive API documentation",
            },
            {
              title: "API Testing Strategies",
              description: "Testing approaches for API reliability",
            },
            {
              title: "API Performance Monitoring",
              description: "Tracking and optimizing API performance",
            },
          ],
        },
        linkedinPosts: {
          linkedinPosts: [
            {
              content:
                "🚀 Building better APIs starts with design-first thinking. Before writing a single line of code, map out your endpoints, data structures, and user flows. This approach saves countless hours of refactoring later. #APIDesign #SoftwareDevelopment",
            },
            {
              content:
                "📚 Your API is only as good as its documentation. Developers will judge your API within minutes of reading the docs. Invest in clear examples, error codes, and getting-started guides. #APIDocs #DeveloperExperience",
            },
            {
              content:
                "🧪 API testing isn't just about unit tests. You need integration tests, load tests, and contract tests. Each layer catches different issues and ensures your API works reliably at scale. #APITesting #QualityAssurance",
            },
            {
              content:
                "📊 Monitor your APIs like you monitor your applications. Track response times, error rates, and usage patterns. This data helps you optimize performance and plan for scaling. #APIMonitoring #Performance",
            },
          ],
        },
        reelsConcepts: {
          reelsConcepts: [
            {
              title: "API Design in 60 Seconds",
              description: "Quick visual guide to API design principles",
            },
            {
              title: "Documentation That Developers Love",
              description: "Before/after examples of good vs bad API docs",
            },
            {
              title: "Testing Your API Like a Pro",
              description: "Visual demonstration of different testing layers",
            },
            {
              title: "API Performance Dashboard",
              description: "Screen recording of monitoring tools in action",
            },
          ],
        },
        pipeline: {
          statistics: {
            durationSeconds: 89,
            completedSteps: 4,
            totalSteps: 4,
          },
          costs: {
            total: 0.0678,
          },
        },
      };

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: {
          sourceText: blogPost,
          customFocus: "Focus on practical tips for developers",
        },
      });

      server.executor.executeViaMCP = jest.fn().mockResolvedValue(mockResult);

      const result = await server.executeTool(
        "run_pipeliner_contentWaterfall",
        {
          sourceText: blogPost,
          customFocus: "Focus on practical tips for developers",
        }
      );

      // Verify Claude receives comprehensive content transformation results
      expect(result.success).toBe(true);
      expect(result.content[0].text).toContain("=== Content Analysis ===");
      expect(result.content[0].text).toContain("Topics extracted: 4");
      expect(result.content[0].text).toContain("LinkedIn posts: 4");
      expect(result.content[0].text).toContain("Reels concepts: 4");
      expect(result.content[0].text).toContain("=== Topics ===");
      expect(result.content[0].text).toContain(
        "1. API Design Principles: Core principles for building robust APIs"
      );
      expect(result.content[0].text).toContain("=== LinkedIn Posts ===");
      expect(result.content[0].text).toContain(
        "🚀 Building better APIs starts with design-first thinking"
      );
      expect(result.content[0].text).toContain("=== Reels Concepts ===");
      expect(result.content[0].text).toContain(
        "1. API Design in 60 Seconds: Quick visual guide to API design principles"
      );
    });

    test("should handle Claude error scenarios gracefully", async () => {
      // Test various error scenarios that Claude might encounter

      // 1. Invalid parameters
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: false,
        errors: ["sourceText cannot be empty", "discussionPrompt is required"],
      });

      const invalidResult = await server.executeTool("run_pipeliner_dialogue", {
        sourceText: "",
        discussionPrompt: "",
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.isError).toBe(true);
      expect(invalidResult.content[0].text).toContain(
        "Parameter validation failed"
      );
      expect(invalidResult.content[0].text).toContain(
        "sourceText cannot be empty"
      );

      // 2. Pipeline execution failure
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: {
          sourceText: "Valid text",
          discussionPrompt: "Valid prompt",
        },
      });

      server.executor.executeViaMCP = jest
        .fn()
        .mockRejectedValue(
          new Error("API rate limit exceeded. Please try again in 60 seconds.")
        );

      const rateLimitResult = await server.executeTool(
        "run_pipeliner_dialogue",
        {
          sourceText: "Valid text",
          discussionPrompt: "Valid prompt",
        }
      );

      expect(rateLimitResult.success).toBe(false);
      expect(rateLimitResult.isError).toBe(true);
      expect(rateLimitResult.content[0].text).toContain(
        "API rate limit exceeded"
      );

      // 3. Timeout scenario
      server.executor.executeViaMCP = jest
        .fn()
        .mockRejectedValue(
          new Error("Pipeline execution timed out after 300 seconds")
        );

      const timeoutResult = await server.executeTool("run_pipeliner_dialogue", {
        sourceText: "Very long text that might cause timeout",
        discussionPrompt: "Complex analysis prompt",
      });

      expect(timeoutResult.success).toBe(false);
      expect(timeoutResult.content[0].text).toContain(
        "timed out after 300 seconds"
      );
    });
  });

  describe("Claude Desktop Integration Patterns", () => {
    test("should support Claude workflow chaining", async () => {
      // Simulate Claude using multiple tools in sequence
      server = new PipelinerMCPServer(mockConfig);

      // Setup multiple tools
      const dialogueTool = {
        name: "run_pipeliner_dialogue",
        description: "Analyze content through dialogue",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string" },
            discussionPrompt: { type: "string" },
          },
          required: ["sourceText", "discussionPrompt"],
        },
      };

      const waterfallTool = {
        name: "run_pipeliner_contentWaterfall",
        description: "Create social media content",
        inputSchema: {
          type: "object",
          properties: {
            sourceText: { type: "string" },
          },
          required: ["sourceText"],
        },
      };

      server.registry.discoverPipelines = jest.fn().mockResolvedValue([
        { name: "dialogue", path: "./src/pipelines/dialoguePipeline.js" },
        {
          name: "contentWaterfall",
          path: "./src/pipelines/contentWaterfallPipeline.js",
        },
      ]);
      server.registry.registerPipelineAsTool = jest
        .fn()
        .mockReturnValueOnce(dialogueTool)
        .mockReturnValueOnce(waterfallTool);
      server.registry.getStats = jest.fn().mockReturnValue({
        totalPipelines: 2,
        registeredTools: 2,
      });

      await server.initialize();

      const sourceContent = "Original article about productivity tips...";

      // Step 1: Claude analyzes content with dialogue
      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: {
          sourceText: sourceContent,
          discussionPrompt: "Analyze key insights",
        },
      });

      server.executor.executeViaMCP = jest.fn().mockResolvedValueOnce({
        success: true,
        runId: "analysis-step",
        conversation: [
          { agent: "Agent1", content: "Key insight 1...", iteration: 1 },
          { agent: "Agent2", content: "Key insight 2...", iteration: 1 },
        ],
        summary: { content: "Analyzed insights from the content..." },
      });

      const analysisResult = await server.executeTool(
        "run_pipeliner_dialogue",
        {
          sourceText: sourceContent,
          discussionPrompt: "Analyze the key insights and main themes",
        }
      );

      expect(analysisResult.success).toBe(true);

      // Step 2: Claude uses analysis results to create social content
      const enhancedContent =
        sourceContent + "\n\nAnalysis: " + analysisResult.content[0].text;

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: { sourceText: enhancedContent },
      });

      server.executor.executeViaMCP = jest.fn().mockResolvedValueOnce({
        success: true,
        runId: "content-creation-step",
        topics: {
          topics: [
            {
              title: "Productivity",
              description: "Tips for better productivity",
            },
          ],
        },
        linkedinPosts: {
          linkedinPosts: [{ content: "Productivity tip: ..." }],
        },
        reelsConcepts: {
          reelsConcepts: [
            { title: "Quick Tip", description: "Visual productivity tip" },
          ],
        },
      });

      const contentResult = await server.executeTool(
        "run_pipeliner_contentWaterfall",
        {
          sourceText: enhancedContent,
        }
      );

      expect(contentResult.success).toBe(true);
      expect(contentResult.content[0].text).toContain("Topics extracted: 1");
      expect(contentResult.content[0].text).toContain("LinkedIn posts: 1");

      // Verify both tools were called in sequence
      expect(server.executor.executeViaMCP).toHaveBeenCalledTimes(2);
    });

    test("should handle Claude context preservation across calls", async () => {
      server = new PipelinerMCPServer(mockConfig);

      const mockTool = {
        name: "run_pipeliner_dialogue",
        description: "Execute dialogue",
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

      // Simulate Claude making multiple related calls
      const baseContent = "Article about machine learning trends...";

      const calls = [
        {
          prompt: "What are the main technical concepts?",
          expectedResponse: "technical-analysis-001",
        },
        {
          prompt: "What are the business implications?",
          expectedResponse: "business-analysis-002",
        },
        {
          prompt: "How do these trends affect developers?",
          expectedResponse: "developer-impact-003",
        },
      ];

      server.executor.validateParameters = jest.fn().mockReturnValue({
        isValid: true,
        sanitized: { sourceText: baseContent, discussionPrompt: "test" },
      });

      // Each call should maintain context and generate unique insights
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];

        server.executor.executeViaMCP = jest.fn().mockResolvedValue({
          success: true,
          runId: call.expectedResponse,
          conversation: [
            {
              agent: "Agent1",
              content: `Analysis for: ${call.prompt}`,
              iteration: 1,
            },
            {
              agent: "Agent2",
              content: `Response to: ${call.prompt}`,
              iteration: 1,
            },
          ],
          summary: { content: `Summary for: ${call.prompt}` },
        });

        const result = await server.executeTool("run_pipeliner_dialogue", {
          sourceText: baseContent,
          discussionPrompt: call.prompt,
        });

        expect(result.success).toBe(true);
        expect(result.content[0].text).toContain(call.expectedResponse);
        expect(result.content[0].text).toContain(call.prompt);
      }
    });
  });
});
