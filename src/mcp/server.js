#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { getMCPConfig } from "./config.js";
import { PipelineToolRegistry } from "./toolRegistry.js";
import { createLogger } from "../services/logger.js";

// ES Module main detection
import { fileURLToPath } from "url";
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

class PipelinerMCPServer {
  constructor() {
    this.config = null;
    this.logger = null;
    this.server = null;
    this.toolRegistry = null;
  }

  async initialize() {
    // Load configuration
    this.config = getMCPConfig();

    // Create logger
    this.logger = createLogger("mcp", {
      level: this.config.logLevel,
      context: "mcp",
    });

    this.logger.info("Initializing MCP server", { config: this.config });

    // Initialize tool registry
    this.toolRegistry = new PipelineToolRegistry(this.config, this.logger);
    await this.toolRegistry.initialize();

    // Create MCP server
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

    // Set up tool handlers
    this.setupToolHandlers();

    this.logger.info("MCP server initialized successfully", {
      toolCount: this.toolRegistry.getToolCount(),
      tools: this.toolRegistry.getToolNames(),
      registryStats: this.toolRegistry.getStats(),
    });
  }

  setupToolHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getTools();
      this.logger.debug("Listed tools", { count: tools.length });
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.info(`Executing tool: ${name}`, {
        args: Object.keys(args || {}),
      });

      try {
        const result = await this.toolRegistry.executeTool(name, args || {});

        this.logger.info(`Tool execution completed: ${name}`, {
          success: result.success || true,
        });

        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.logger.error(`Tool execution failed: ${name}`, {
          error: error.message,
          stack: error.stack,
        });

        if (error.code === "TOOL_NOT_FOUND") {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool not found: ${name}`
          );
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async start() {
    if (!this.config.enabled) {
      this.logger.warn("MCP server is disabled in configuration");
      return;
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info("MCP server started", {
      host: this.config.host,
      port: this.config.port,
      tools: this.toolRegistry.getToolCount(),
    });

    // Log discovered pipelines
    this.logger.info(
      `Discovered ${this.toolRegistry.getPipelineCount()} pipelines`,
      {}
    );
  }

  async stop() {
    if (this.server) {
      await this.server.close();
      this.logger.info("MCP server stopped");
    }
  }
}

// Main execution
async function main() {
  const server = new PipelinerMCPServer();

  try {
    await server.initialize();
    await server.start();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.error("\nReceived SIGINT, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.error("\nReceived SIGTERM, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start MCP server:", error.message);
    process.exit(1);
  }
}

// Run main function if this is the main module
if (isMain) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { PipelinerMCPServer };
