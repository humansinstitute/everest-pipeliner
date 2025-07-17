import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateJobId } from "../utils/jobId.js";

/**
 * Pipeline Tool Registry for MCP Server
 * Automatically discovers and registers pipeline tools
 */
export class PipelineToolRegistry {
  constructor(config, logger = null) {
    this.config = config;
    this.logger = logger;
    this.tools = new Map();
    this.pipelines = new Map();
    this.stats = {
      totalTools: 0,
      totalPipelines: 0,
      discoveredPipelines: 0,
      inferredPipelines: 0,
      interfaces: {
        mcp: 0,
        nostrmq: 0,
        cli: 0,
      },
    };
  }

  /**
   * Initialize the registry by discovering pipelines
   */
  async initialize() {
    this.log("info", "Starting pipeline discovery", {
      directory: this.config.pipelineDirectory,
      autoDiscovery: this.config.autoDiscovery,
    });

    if (this.config.autoDiscovery) {
      await this.discoverPipelines();
    }

    this.registerContentStorageTools();
    this.updateStats();

    this.log("info", "Pipeline discovery completed", {
      discovered: this.pipelines.size,
      pipelines: Array.from(this.pipelines.keys()),
    });
  }

  /**
   * Discover all pipeline files in the pipelines directory
   */
  async discoverPipelines() {
    try {
      const pipelineDir = path.resolve(this.config.pipelineDirectory);
      const files = await fs.readdir(pipelineDir);
      const pipelineFiles = files.filter(
        (file) => file.endsWith("Pipeline.js") && !file.includes("test")
      );

      for (const file of pipelineFiles) {
        await this.loadPipeline(file, pipelineDir);
      }
    } catch (error) {
      this.log("error", "Failed to discover pipelines", {
        error: error.message,
        directory: this.config.pipelineDirectory,
      });
      throw error;
    }
  }

  /**
   * Load a specific pipeline file and register it as a tool
   */
  async loadPipeline(filename, pipelineDir) {
    try {
      const pipelinePath = path.join(pipelineDir, filename);
      const pipelineModule = await import(pipelinePath);

      // Extract pipeline name from filename (remove Pipeline.js suffix)
      const pipelineName = filename.replace("Pipeline.js", "");

      // Look for pipeline info and execution function
      const pipelineInfo = this.extractPipelineInfo(
        pipelineModule,
        pipelineName
      );
      const executeFunction = this.extractExecuteFunction(
        pipelineModule,
        pipelineName
      );

      if (!executeFunction) {
        this.log(
          "warn",
          `No execution function found for pipeline: ${pipelineName}`
        );
        return;
      }

      // Register the pipeline
      this.pipelines.set(pipelineName, {
        name: pipelineName,
        filename,
        path: pipelinePath,
        info: pipelineInfo,
        execute: executeFunction,
        module: pipelineModule,
        interfaces: this.detectInterfaces(pipelineModule),
      });

      // Register as MCP tool
      this.registerPipelineTool(pipelineName, pipelineInfo);

      this.log("info", `Pipeline registered: ${pipelineName}`, {
        hasExecuteFunction: !!executeFunction,
        info: pipelineInfo,
      });
    } catch (error) {
      this.log("error", `Failed to load pipeline: ${filename}`, {
        error: error.message,
      });
    }
  }

  /**
   * Extract pipeline info from module
   */
  extractPipelineInfo(module, pipelineName) {
    const defaultInfo = {
      name: pipelineName,
      description: `Execute ${pipelineName} pipeline`,
      version: "1.0.0",
      inputSchema: {},
      outputSchema: {},
      tags: [],
    };

    if (module.pipelineInfo && typeof module.pipelineInfo === "object") {
      return { ...defaultInfo, ...module.pipelineInfo };
    }

    return defaultInfo;
  }

  /**
   * Extract execution function from module
   */
  extractExecuteFunction(module, pipelineName) {
    // Try different naming conventions for MCP execution
    const possibleNames = [
      "executeViaNostrMQ", // Preferred for compatibility
      "executeForMCP",
      "executeForNostrMQ",
      "runPipeline",
      pipelineName + "Pipeline",
      "default",
    ];

    for (const name of possibleNames) {
      if (module[name] && typeof module[name] === "function") {
        return module[name];
      }
    }

    return null;
  }

  /**
   * Detect available interfaces for a pipeline
   */
  detectInterfaces(module) {
    const interfaces = [];

    if (module.executeViaNostrMQ || module.executeForNostrMQ) {
      interfaces.push("nostrmq");
    }

    if (module.executeForMCP || module.executeViaNostrMQ) {
      interfaces.push("mcp");
    }

    if (module.runPipeline || module[Object.keys(module)[0]]) {
      interfaces.push("cli");
    }

    return interfaces;
  }

  /**
   * Register a pipeline as an MCP tool
   */
  registerPipelineTool(pipelineName, pipelineInfo) {
    const toolName = this.config.toolPrefix + pipelineName;

    // Convert pipeline input schema to MCP tool schema
    const properties = {};
    const required = [];

    if (pipelineInfo.inputSchema) {
      Object.entries(pipelineInfo.inputSchema).forEach(([key, schema]) => {
        properties[key] = {
          type: schema.type || "string",
          description: schema.description || `${key} parameter`,
        };

        if (schema.default !== undefined) {
          properties[key].default = schema.default;
        }

        if (schema.minimum !== undefined) {
          properties[key].minimum = schema.minimum;
        }

        if (schema.maximum !== undefined) {
          properties[key].maximum = schema.maximum;
        }

        if (schema.required) {
          required.push(key);
        }
      });
    }

    const tool = {
      name: toolName,
      description:
        pipelineInfo.description || `Execute ${pipelineName} pipeline`,
      inputSchema: {
        type: "object",
        properties,
        required,
      },
    };

    this.tools.set(toolName, {
      ...tool,
      pipelineName,
      pipelineInfo,
    });
  }

  /**
   * Register content storage tools
   */
  registerContentStorageTools() {
    // Store content tool
    this.tools.set("store_content", {
      name: "store_content",
      description: "Store content in temporary storage for pipeline processing",
      inputSchema: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Content to store",
          },
          contentType: {
            type: "string",
            description: "Type of content (text, markdown, etc.)",
            default: "text",
          },
          description: {
            type: "string",
            description: "Description of the content",
          },
        },
        required: ["content"],
      },
    });

    // List stored content tool
    this.tools.set("list_stored_content", {
      name: "list_stored_content",
      description: "List all stored content files",
      inputSchema: {
        type: "object",
        properties: {},
      },
    });

    this.log("info", "Content storage tools registered", {
      tools: ["store_content", "list_stored_content"],
    });
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName, args) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      const error = new Error(`Tool not found: ${toolName}`);
      error.code = "TOOL_NOT_FOUND";
      throw error;
    }

    // Handle content storage tools
    if (toolName === "store_content") {
      return await this.executeStoreContent(args);
    }

    if (toolName === "list_stored_content") {
      return await this.executeListStoredContent(args);
    }

    // Handle pipeline tools
    if (tool.pipelineName) {
      return await this.executePipelineTool(tool.pipelineName, args);
    }

    throw new Error(`Unknown tool type: ${toolName}`);
  }

  /**
   * Execute a pipeline tool
   */
  async executePipelineTool(pipelineName, args) {
    const requestId = `mcp_${Date.now()}_${generateJobId().slice(0, 9)}`;

    this.log("info", `MCP pipeline execution started`, {
      pipeline: pipelineName,
      parameters: Object.keys(args),
      context: {
        type: "mcp",
        requestId,
        synchronous: true,
        timestamp: new Date().toISOString(),
      },
    });

    const pipeline = this.pipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineName}`);
    }

    try {
      const result = await pipeline.execute(args);

      this.log("info", `MCP pipeline execution completed`, {
        pipeline: pipelineName,
        success: result.success !== false,
      });

      return result;
    } catch (error) {
      this.log("error", `MCP pipeline execution failed`, {
        pipeline: pipelineName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute store content tool
   */
  async executeStoreContent(args) {
    const {
      content,
      contentType = "text",
      description = "stored_content",
    } = args;

    this.log("info", "Storing content", {
      contentType,
      description,
      size: content.length,
    });

    // Generate unique filename
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "")
      .slice(0, 15);
    const randomId = generateJobId().slice(0, 6);
    const filename = `content_${timestamp}_${randomId}_${description.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}.txt`;
    const filePath = path.join(this.config.tempDirectory, filename);

    // Ensure temp directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write content to file
    await fs.writeFile(filePath, content, "utf8");

    const result = {
      success: true,
      filePath: path.relative(process.cwd(), filePath),
      filename,
      size: content.length,
      contentType,
      description,
      timestamp: new Date().toISOString(),
      absolutePath: filePath,
    };

    this.log("info", "Content stored successfully", result);
    this.log("info", "Content storage tool executed: store_content", {
      success: true,
    });

    return result;
  }

  /**
   * Execute list stored content tool
   */
  async executeListStoredContent(args) {
    try {
      const tempDir = this.config.tempDirectory;
      const files = await fs.readdir(tempDir);
      const contentFiles = files.filter((file) => file.startsWith("content_"));

      const fileList = [];
      for (const file of contentFiles) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        fileList.push({
          filename: file,
          path: path.relative(process.cwd(), filePath),
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
        });
      }

      this.log("info", "Content storage tool executed: list_stored_content", {
        success: true,
      });

      return {
        success: true,
        files: fileList,
        count: fileList.length,
      };
    } catch (error) {
      this.log("error", "Failed to list stored content", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update statistics
   */
  updateStats() {
    this.stats.totalPipelines = this.pipelines.size;
    this.stats.totalTools = this.tools.size;
    this.stats.discoveredPipelines = this.pipelines.size;

    // Count interface support
    this.stats.interfaces = { mcp: 0, nostrmq: 0, cli: 0 };
    for (const pipeline of this.pipelines.values()) {
      pipeline.interfaces.forEach((iface) => {
        this.stats.interfaces[iface]++;
      });
    }
  }

  /**
   * Get all registered tools
   */
  getTools() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Get tool names
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   */
  getToolCount() {
    return this.tools.size;
  }

  /**
   * Get pipeline count
   */
  getPipelineCount() {
    return this.pipelines.size;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Internal logging method
   */
  log(level, message, context = {}) {
    if (this.logger) {
      this.logger[level](`[ToolRegistry] ${message}`, context);
    } else {
      console.log(`[ToolRegistry] ${level.toUpperCase()}: ${message}`, context);
    }
  }
}
