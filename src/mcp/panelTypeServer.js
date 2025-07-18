/**
 * MCP Server for Panel Type Selection
 *
 * Provides tools for managing panel types and configurations
 * Supports the Panel Type Selection feature with enhanced execution tools
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  getAvailablePanelTypes,
  createPanelConfig,
  isValidPanelType,
} from "../services/panelTypeConfig.js";
import { createAgentLoader } from "../services/dynamicAgentLoader.js";
import { runPipeline } from "../pipelines/moderatedPanelPipeline.js";

/**
 * Panel Type MCP Server
 * Provides tools for panel type selection and configuration
 */
class PanelTypeServer {
  constructor() {
    this.server = new Server(
      {
        name: "panel-type-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Tool: List available panel types
    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: [
          {
            name: "list_panel_types",
            description: "List all available panel types",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "get_panel_config",
            description: "Get configuration for a specific panel type",
            inputSchema: {
              type: "object",
              properties: {
                panelType: {
                  type: "string",
                  description: "The panel type to get configuration for",
                  enum: getAvailablePanelTypes(),
                },
              },
              required: ["panelType"],
            },
          },
          {
            name: "validate_panel_type",
            description: "Validate if a panel type is supported",
            inputSchema: {
              type: "object",
              properties: {
                panelType: {
                  type: "string",
                  description: "The panel type to validate",
                },
              },
              required: ["panelType"],
            },
          },
          {
            name: "get_agent_info",
            description:
              "Get information about available agents for a panel type",
            inputSchema: {
              type: "object",
              properties: {
                panelType: {
                  type: "string",
                  description: "The panel type to get agent information for",
                  enum: getAvailablePanelTypes(),
                },
              },
              required: ["panelType"],
            },
          },
          {
            name: "run_discussion_panel",
            description:
              "Execute a discussion panel in tl;dr podcast format with named participants",
            inputSchema: {
              type: "object",
              properties: {
                sourceText: {
                  type: "string",
                  description: "The source text to be discussed by the panel",
                },
                discussionSubject: {
                  type: "string",
                  description: "The subject of the panel discussion",
                },
                panelInteractions: {
                  type: "integer",
                  description: "Number of panel member interactions",
                  default: 4,
                  minimum: 2,
                  maximum: 15,
                },
                summaryFocus: {
                  type: "string",
                  description: "What the summary should focus on",
                  default:
                    "Provide a comprehensive summary of the discussion highlighting key insights, diverse perspectives, points of agreement/disagreement, and actionable recommendations from the panel discussion",
                },
              },
              required: ["sourceText", "discussionSubject"],
            },
          },
          {
            name: "run_security_review",
            description:
              "Conduct security review with offensive/defensive experts",
            inputSchema: {
              type: "object",
              properties: {
                vulnerabilityFrameworks: {
                  type: "string",
                  description:
                    "Security frameworks and standards to apply (e.g., OWASP, NIST, CWE)",
                },
                codebase: {
                  type: "string",
                  description:
                    "The codebase or system to be reviewed for security vulnerabilities",
                },
                securityFocus: {
                  type: "string",
                  description:
                    "Specific security aspects to focus on (e.g., authentication, data protection, API security)",
                },
                panelInteractions: {
                  type: "integer",
                  description: "Number of panel member interactions",
                  default: 4,
                  minimum: 2,
                  maximum: 15,
                },
                summaryFocus: {
                  type: "string",
                  description: "What the summary should focus on",
                  default:
                    "Identify all security vulnerabilities, assess risk levels, provide remediation strategies, and prioritize security improvements based on the panel discussion",
                },
              },
              required: ["vulnerabilityFrameworks", "codebase"],
            },
          },
          {
            name: "run_tech_review",
            description:
              "Technical review with architecture/performance/innovation experts",
            inputSchema: {
              type: "object",
              properties: {
                prd: {
                  type: "string",
                  description: "Product Requirements Document content",
                },
                designDoc: {
                  type: "string",
                  description: "Technical design document content",
                },
                codebase: {
                  type: "string",
                  description: "Codebase or implementation to be reviewed",
                },
                reviewFocus: {
                  type: "string",
                  description:
                    "Specific technical aspects to focus on (e.g., scalability, performance, maintainability)",
                },
                panelInteractions: {
                  type: "integer",
                  description: "Number of panel member interactions",
                  default: 4,
                  minimum: 2,
                  maximum: 15,
                },
                summaryFocus: {
                  type: "string",
                  description: "What the summary should focus on",
                  default:
                    "Review conversation for best practices, architectural improvements, performance optimizations, and innovation opportunities based on the technical panel discussion",
                },
              },
              required: ["prd", "designDoc", "codebase"],
            },
          },
        ],
      };
    });

    // Tool call handler
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list_panel_types":
            return await this.listPanelTypes();

          case "get_panel_config":
            return await this.getPanelConfig(args.panelType);

          case "validate_panel_type":
            return await this.validatePanelType(args.panelType);

          case "get_agent_info":
            return await this.getAgentInfo(args.panelType);

          case "run_discussion_panel":
            return await this.runDiscussionPanel(args);

          case "run_security_review":
            return await this.runSecurityReview(args);

          case "run_tech_review":
            return await this.runTechReview(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * List all available panel types
   */
  async listPanelTypes() {
    const panelTypes = getAvailablePanelTypes();

    const typeDescriptions = {
      discussion:
        "tl;dr podcast format with named participants (Sarah, Mike, Lisa)",
      security:
        "Security-focused analysis panel (Red Team, Blue Team, Compliance)",
      techreview:
        "Technical architecture review panel (Systems, DevOps, Quality)",
    };

    const result = panelTypes.map((type) => ({
      type,
      description:
        typeDescriptions[type] || "Panel type description not available",
      status: "Available",
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              availablePanelTypes: result,
              total: panelTypes.length,
              currentlyImplemented: ["discussion", "security", "techreview"],
              comingSoon: [],
              mcpToolsAvailable: [
                "run_discussion_panel",
                "run_security_review",
                "run_tech_review",
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Get configuration for a specific panel type
   */
  async getPanelConfig(panelType) {
    if (!isValidPanelType(panelType)) {
      throw new Error(`Invalid panel type: ${panelType}`);
    }

    const config = createPanelConfig(panelType);
    const validation = config.validate();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              panelType,
              configuration: config.toObject(),
              validation,
              isValid: validation.isValid,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Validate if a panel type is supported
   */
  async validatePanelType(panelType) {
    const isValid = isValidPanelType(panelType);
    const availableTypes = getAvailablePanelTypes();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              panelType,
              isValid,
              availableTypes,
              message: isValid
                ? `Panel type '${panelType}' is valid and supported`
                : `Panel type '${panelType}' is not supported. Available types: ${availableTypes.join(
                    ", "
                  )}`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Get agent information for a panel type
   */
  async getAgentInfo(panelType) {
    if (!isValidPanelType(panelType)) {
      throw new Error(`Invalid panel type: ${panelType}`);
    }

    const agentLoader = createAgentLoader(panelType);
    const agentInfo = agentLoader.getAgentInfo();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              panelType,
              agentInfo,
              summary: {
                totalAgents: Object.keys(agentInfo.agents).length,
                typeSpecificAgents: Object.values(agentInfo.agents).filter(
                  (a) => a.typeSpecific
                ).length,
                fallbackAgents: Object.values(agentInfo.agents).filter(
                  (a) => a.fallbackAvailable
                ).length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Execute a discussion panel
   */
  async runDiscussionPanel(args) {
    try {
      // Validate required parameters
      if (!args.sourceText || !args.discussionSubject) {
        throw new Error("sourceText and discussionSubject are required");
      }

      // Prepare configuration for discussion panel
      const config = {
        panelType: "discussion",
        sourceText: args.sourceText,
        discussionSubject: args.discussionSubject,
        panelInteractions: args.panelInteractions || 4,
        summaryFocus:
          args.summaryFocus ||
          "Provide a comprehensive summary of the discussion highlighting key insights, diverse perspectives, points of agreement/disagreement, and actionable recommendations from the panel discussion",
      };

      // Execute the pipeline
      const result = await runPipeline(config);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "completed",
                panelType: "discussion",
                runId: result.runId,
                summary: result.result.summary,
                panelStats: result.result.panelStats,
                metadata: result.result.metadata,
                conversationLength: result.result.conversation.length,
                executionTime: result.endTime
                  ? new Date(result.endTime).getTime() -
                    new Date(result.startTime).getTime()
                  : null,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Discussion panel execution failed: ${error.message}`);
    }
  }

  /**
   * Execute a security review panel
   */
  async runSecurityReview(args) {
    try {
      // Validate required parameters
      if (!args.vulnerabilityFrameworks || !args.codebase) {
        throw new Error("vulnerabilityFrameworks and codebase are required");
      }

      // Prepare configuration for security panel
      const config = {
        panelType: "security",
        sourceText: `Security Frameworks: ${
          args.vulnerabilityFrameworks
        }\n\nCodebase to Review:\n${args.codebase}${
          args.securityFocus ? `\n\nSecurity Focus: ${args.securityFocus}` : ""
        }`,
        discussionSubject: `Security Review: ${
          args.securityFocus || "Comprehensive Security Analysis"
        }`,
        panelInteractions: args.panelInteractions || 4,
        summaryFocus:
          args.summaryFocus ||
          "Identify all security vulnerabilities, assess risk levels, provide remediation strategies, and prioritize security improvements based on the panel discussion",
      };

      // Execute the pipeline
      const result = await runPipeline(config);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "completed",
                panelType: "security",
                runId: result.runId,
                summary: result.result.summary,
                panelStats: result.result.panelStats,
                metadata: result.result.metadata,
                conversationLength: result.result.conversation.length,
                executionTime: result.endTime
                  ? new Date(result.endTime).getTime() -
                    new Date(result.startTime).getTime()
                  : null,
                securityFocus: args.securityFocus,
                frameworksUsed: args.vulnerabilityFrameworks,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Security review execution failed: ${error.message}`);
    }
  }

  /**
   * Execute a technical review panel
   */
  async runTechReview(args) {
    try {
      // Validate required parameters
      if (!args.prd || !args.designDoc || !args.codebase) {
        throw new Error("prd, designDoc, and codebase are required");
      }

      // Prepare configuration for tech review panel
      const config = {
        panelType: "techreview",
        sourceText: `Product Requirements Document:\n${
          args.prd
        }\n\nDesign Document:\n${args.designDoc}\n\nCodebase:\n${
          args.codebase
        }${args.reviewFocus ? `\n\nReview Focus: ${args.reviewFocus}` : ""}`,
        discussionSubject: `Technical Review: ${
          args.reviewFocus || "Comprehensive Technical Analysis"
        }`,
        panelInteractions: args.panelInteractions || 4,
        summaryFocus:
          args.summaryFocus ||
          "Review conversation for best practices, architectural improvements, performance optimizations, and innovation opportunities based on the technical panel discussion",
      };

      // Execute the pipeline
      const result = await runPipeline(config);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "completed",
                panelType: "techreview",
                runId: result.runId,
                summary: result.result.summary,
                panelStats: result.result.panelStats,
                metadata: result.result.metadata,
                conversationLength: result.result.conversation.length,
                executionTime: result.endTime
                  ? new Date(result.endTime).getTime() -
                    new Date(result.startTime).getTime()
                  : null,
                reviewFocus: args.reviewFocus,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Technical review execution failed: ${error.message}`);
    }
  }

  /**
   * Start the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Panel Type MCP Server started");
  }
}

// Start server if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = new PanelTypeServer();
  server.start().catch(console.error);
}

export default PanelTypeServer;
