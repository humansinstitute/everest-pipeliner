import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "url";

import {
  getMCPConfig,
  createToolName,
  extractPipelineName,
  getPipelineConfig,
  ErrorMessages,
} from "./config.js";
import { UniversalPipelineExecutor } from "../shared/executor.js";
import {
  createMCPLogger,
  ErrorCodes,
  formatMCPError,
} from "../shared/logger.js";
import { PipelineToolRegistry } from "./toolRegistry.js";
import {
  formatForMCP,
  formatValidationErrorResponse,
} from "./responseFormatter.js";

/**
 * Pipeliner MCP Server
 *
 * Exposes Pipeliner pipelines as MCP tools for AI agent integration.
 * Designed for local Claude Desktop integration with synchronous execution.
 */
export class PipelinerMCPServer {
  constructor(config = null) {
    this.config = config || getMCPConfig();
    this.server = new Server(
      {
        name: "pipeliner",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.executor = new UniversalPipelineExecutor();
    this.registry = new PipelineToolRegistry(this.config);
    this.tools = new Map();
    this.logger = createMCPLogger({ requestId: "server" });

    this.setupHandlers();
  }

  /**
   * Sets up MCP request handlers
   */
  setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug("Tools list requested");
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.toolCall(name, args || {});

      try {
        const result = await this.executeTool(name, args || {});
        this.logger.toolResult(name, result.success, null);
        return result;
      } catch (error) {
        this.logger.error(`Tool execution failed: ${name}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * Discovers and registers all available pipelines as tools
   */
  async initialize() {
    this.logger.info("Initializing MCP server", { config: this.config });

    if (!this.config.enabled) {
      throw new Error(ErrorMessages.SERVER_DISABLED);
    }

    try {
      // Discover pipelines using the enhanced registry
      const pipelines = await this.registry.discoverPipelines();
      this.logger.info(`Discovered ${pipelines.length} pipelines`);

      // Register each pipeline as a tool using the registry
      for (const pipeline of pipelines) {
        const tool = this.registry.registerPipelineAsTool(pipeline);
        this.tools.set(tool.name, tool);
      }

      // Log registry statistics
      const stats = this.registry.getStats();
      this.logger.info("MCP server initialized successfully", {
        toolCount: this.tools.size,
        tools: Array.from(this.tools.keys()),
        registryStats: stats,
      });
    } catch (error) {
      this.logger.error("MCP server initialization failed", error);
      throw error;
    }
  }

  /**
   * Executes a tool (pipeline)
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool execution result
   */
  async executeTool(toolName, args) {
    const pipelineName = extractPipelineName(toolName, this.config);

    if (!pipelineName) {
      throw new Error(`Invalid tool name: ${toolName}`);
    }

    if (!this.tools.has(toolName)) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Create execution context
    const context = {
      type: "mcp",
      requestId: this.generateRequestId(),
      synchronous: true,
      timestamp: new Date().toISOString(),
      toolName,
      pipelineName,
    };

    const logger = createMCPLogger(context);

    try {
      // Validate parameters
      const tool = this.tools.get(toolName);
      const validation = this.executor.validateParameters(
        args,
        tool.inputSchema
      );

      if (!validation.isValid) {
        return formatValidationErrorResponse(validation.errors, context);
      }

      // Execute pipeline
      logger.info(`Executing pipeline: ${pipelineName}`, {
        args: Object.keys(args),
      });

      const startTime = Date.now();
      const result = await this.executor.executeViaMCP(
        pipelineName,
        validation.sanitized,
        logger
      );
      const duration = Date.now() - startTime;

      logger.info(`Pipeline execution completed: ${pipelineName}`, {
        success: result.success,
        duration,
      });

      // Format response for MCP using the new formatter
      return formatForMCP(result, {
        ...context,
        includeDebugInfo: this.config.includeDebugInfo,
      });
    } catch (error) {
      logger.error(`Pipeline execution failed: ${pipelineName}`, error);

      return formatForMCP(
        { success: false, error },
        {
          ...context,
          includeDebugInfo: this.config.includeDebugInfo,
        }
      );
    }
  }

  /**
   * Starts the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info("MCP server started", {
      host: this.config.host,
      port: this.config.port,
      tools: this.tools.size,
    });
  }

  /**
   * Stops the MCP server
   */
  async stop() {
    await this.server.close();
    this.logger.info("MCP server stopped");
  }

  /**
   * Lists all registered tools
   * @returns {Array} Array of tool information
   */
  listTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Gets server status information
   * @returns {Object} Server status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      initialized: this.tools.size > 0,
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys()),
      config: {
        host: this.config.host,
        port: this.config.port,
        logLevel: this.config.logLevel,
        localOnly: this.config.localOnly,
      },
    };
  }

  /**
   * Generates a unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Refreshes pipeline discovery and tool registration
   */
  async refresh() {
    this.logger.info("Refreshing pipeline tools");

    // Clear existing tools and refresh registry
    this.tools.clear();
    this.executor.clearCache();
    await this.registry.refresh();

    // Re-register all discovered pipelines
    const pipelines = this.registry.getAllTools();
    for (const tool of pipelines) {
      this.tools.set(tool.name, tool);
    }

    const stats = this.registry.getStats();
    this.logger.info("Pipeline tools refreshed", {
      toolCount: this.tools.size,
      registryStats: stats,
    });
  }
}

/**
 * Main function for running the MCP server as a standalone process
 */
async function main() {
  const config = getMCPConfig();

  if (!config.enabled) {
    console.error(
      "MCP server is disabled. Set ENABLE_MCP_SERVER=true to enable."
    );
    process.exit(1);
  }

  try {
    const server = new PipelinerMCPServer(config);
    await server.initialize();
    await server.start();

    // Send startup messages to stderr to avoid interfering with JSON-RPC on stdout
    console.error(`🚀 Pipeliner MCP Server started`);
    console.error(`📊 Registered ${server.tools.size} pipeline tools`);

    // List available tools to stderr
    const tools = server.listTools();
    console.error("\n🔧 Available tools:");
    for (const tool of tools) {
      console.error(`   - ${tool.name}: ${tool.description}`);
    }
  } catch (error) {
    console.error("❌ Failed to start MCP server:", error.message);
    process.exit(1);
  }
}

// ES Module main detection
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error("❌ MCP server error:", error);
    process.exit(1);
  });
}
