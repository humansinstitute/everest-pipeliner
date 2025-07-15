/**
 * Tool Registry
 *
 * Advanced pipeline discovery and tool registration management for MCP server.
 * Handles automatic pipeline scanning, tool schema generation, and registry management.
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createMCPLogger } from "../shared/logger.js";
import {
  createToolName,
  extractPipelineName,
  getPipelineConfig,
  getAbsolutePath,
} from "./config.js";

/**
 * Pipeline Tool Registry
 * Manages discovery, registration, and metadata for pipeline tools
 */
export class PipelineToolRegistry {
  constructor(config = {}) {
    this.config = config;
    this.tools = new Map();
    this.pipelines = new Map();
    this.logger = createMCPLogger({ requestId: "registry" });
    // Convert relative path to absolute path to ensure it works regardless of working directory
    this.pipelineDirectory = getAbsolutePath(
      config.pipelineDirectory || "./src/pipelines"
    );
    this.autoDiscovery = config.autoDiscovery !== false;
  }

  /**
   * Discovers all available pipelines in the pipeline directory
   * @returns {Promise<Array>} Array of pipeline information objects
   */
  async discoverPipelines() {
    this.logger.info("Starting pipeline discovery", {
      directory: this.pipelineDirectory,
      autoDiscovery: this.autoDiscovery,
    });

    const pipelines = [];

    try {
      // Get all JavaScript files in the pipeline directory
      const files = await fs.readdir(this.pipelineDirectory);
      const pipelineFiles = files.filter(
        (file) => file.endsWith("Pipeline.js") || file.endsWith(".js")
      );

      this.logger.debug(
        `Found ${pipelineFiles.length} potential pipeline files`
      );

      for (const file of pipelineFiles) {
        try {
          const pipelineInfo = await this.loadPipelineInfo(file);
          if (pipelineInfo) {
            pipelines.push(pipelineInfo);
            this.pipelines.set(pipelineInfo.name, pipelineInfo);
            this.logger.debug(`Loaded pipeline: ${pipelineInfo.name}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to load pipeline from ${file}`, error);
        }
      }

      this.logger.info(`Pipeline discovery completed`, {
        discovered: pipelines.length,
        pipelines: pipelines.map((p) => p.name),
      });

      return pipelines;
    } catch (error) {
      this.logger.error("Pipeline discovery failed", error);
      throw new Error(`Pipeline discovery failed: ${error.message}`);
    }
  }

  /**
   * Loads pipeline information from a file
   * @param {string} filename - Pipeline file name
   * @returns {Promise<Object|null>} Pipeline information or null if invalid
   */
  async loadPipelineInfo(filename) {
    const filePath = path.join(this.pipelineDirectory, filename);
    const absolutePath = path.resolve(filePath);

    try {
      // Dynamic import of the pipeline module
      const module = await import(`file://${absolutePath}`);

      // Check if module exports pipelineInfo
      if (module.pipelineInfo) {
        return this.validatePipelineInfo(module.pipelineInfo, filename);
      }

      // If no pipelineInfo, try to infer from filename and exports
      return this.inferPipelineInfo(module, filename);
    } catch (error) {
      this.logger.warn(`Failed to import pipeline ${filename}`, error);
      return null;
    }
  }

  /**
   * Validates pipeline information object
   * @param {Object} pipelineInfo - Pipeline information to validate
   * @param {string} filename - Source filename for context
   * @returns {Object|null} Validated pipeline info or null if invalid
   */
  validatePipelineInfo(pipelineInfo, filename) {
    const required = ["name", "description"];
    const missing = required.filter((field) => !pipelineInfo[field]);

    if (missing.length > 0) {
      this.logger.warn(
        `Pipeline ${filename} missing required fields: ${missing.join(", ")}`
      );
      return null;
    }

    // Ensure interfaces array exists
    if (!pipelineInfo.interfaces) {
      pipelineInfo.interfaces = ["mcp", "cli"];
    }

    // Ensure MCP interface is supported
    if (!pipelineInfo.interfaces.includes("mcp")) {
      this.logger.warn(`Pipeline ${filename} does not support MCP interface`);
      return null;
    }

    return {
      ...pipelineInfo,
      filename,
      discovered: true,
    };
  }

  /**
   * Infers pipeline information from module exports and filename
   * @param {Object} module - Imported pipeline module
   * @param {string} filename - Pipeline filename
   * @returns {Object|null} Inferred pipeline info or null if cannot infer
   */
  inferPipelineInfo(module, filename) {
    // Extract pipeline name from filename
    const baseName = path.basename(filename, ".js");
    const pipelineName = baseName.replace(/Pipeline$/, "");

    // Check for main pipeline function
    const mainFunction =
      module[baseName] || module[pipelineName] || module.default;
    if (!mainFunction || typeof mainFunction !== "function") {
      this.logger.debug(`No main function found in ${filename}`);
      return null;
    }

    // Check for MCP interface functions
    const hasMCPInterface = typeof module.executeViaMCP === "function";
    const hasNostrMQInterface = typeof module.executeViaNostrMQ === "function";

    if (!hasMCPInterface) {
      this.logger.debug(`Pipeline ${filename} missing executeViaMCP function`);
      return null;
    }

    // Create inferred pipeline info
    const pipelineInfo = {
      name: pipelineName,
      description: `${pipelineName} pipeline`,
      parameters: this.inferParameterSchema(pipelineName),
      interfaces: ["mcp", "cli"],
      filename,
      inferred: true,
    };

    if (hasNostrMQInterface) {
      pipelineInfo.interfaces.push("nostrmq");
    }

    this.logger.debug(`Inferred pipeline info for ${filename}`, pipelineInfo);
    return pipelineInfo;
  }

  /**
   * Infers parameter schema for a pipeline based on its name and config
   * @param {string} pipelineName - Name of the pipeline
   * @returns {Object} JSON schema for pipeline parameters
   */
  inferParameterSchema(pipelineName) {
    const pipelineConfig = getPipelineConfig(pipelineName);

    const schema = {
      type: "object",
      properties: {},
      required: [],
    };

    // Add common parameters based on pipeline type
    if (
      pipelineName.includes("dialogue") ||
      pipelineName.includes("Dialogue")
    ) {
      schema.properties.sourceText = {
        type: "string",
        description: "Source text or content for dialogue analysis",
        minLength: 1,
      };
      schema.properties.discussionPrompt = {
        type: "string",
        description: "Discussion prompt to guide the conversation",
        minLength: 1,
      };
      schema.properties.iterations = {
        type: "integer",
        description: "Number of dialogue iterations",
        minimum: 1,
        maximum: 10,
        default: 3,
      };
      schema.properties.summaryFocus = {
        type: "string",
        description: "Focus or perspective for the final summary",
      };
      schema.required = ["sourceText", "discussionPrompt"];

      // Add facilitator-specific parameters
      if (pipelineName.includes("facilitated")) {
        schema.properties.facilitatorEnabled = {
          type: "boolean",
          description: "Enable facilitator interventions during dialogue",
          default: false,
        };
      }
    } else if (
      pipelineName.includes("waterfall") ||
      pipelineName.includes("content")
    ) {
      schema.properties.sourceText = {
        type: "string",
        description: "Source content for waterfall processing",
        minLength: 1,
      };
      schema.properties.customFocus = {
        type: "string",
        description: "Custom focus for content analysis",
      };
      schema.required = ["sourceText"];
    } else if (
      pipelineName.includes("chat") ||
      pipelineName.includes("simple")
    ) {
      schema.properties.message = {
        type: "string",
        description: "Message or query for the chat pipeline",
        minLength: 1,
      };
      schema.required = ["message"];
    }

    // Add any pipeline-specific parameters from config
    if (pipelineConfig.requiredParams) {
      pipelineConfig.requiredParams.forEach((param) => {
        if (!schema.properties[param]) {
          schema.properties[param] = this.getParameterSchema(param);
        }
        if (!schema.required.includes(param)) {
          schema.required.push(param);
        }
      });
    }

    if (pipelineConfig.optionalParams) {
      pipelineConfig.optionalParams.forEach((param) => {
        if (!schema.properties[param]) {
          schema.properties[param] = this.getParameterSchema(param);
        }
      });
    }

    return schema;
  }

  /**
   * Gets parameter schema for common parameter types
   * @param {string} paramName - Parameter name
   * @returns {Object} Parameter schema
   */
  getParameterSchema(paramName) {
    const commonSchemas = {
      sourceText: {
        type: "string",
        description: "Source text or content to process",
        minLength: 1,
      },
      sourceContent: {
        type: "string",
        description: "Source content for processing",
        minLength: 1,
      },
      discussionPrompt: {
        type: "string",
        description: "Discussion prompt or question to guide the conversation",
        minLength: 1,
      },
      iterations: {
        type: "integer",
        description: "Number of iterations",
        minimum: 1,
        maximum: 10,
        default: 3,
      },
      summaryFocus: {
        type: "string",
        description: "Focus or perspective for the final summary",
      },
      message: {
        type: "string",
        description: "Message or query to process",
        minLength: 1,
      },
      context: {
        type: "string",
        description: "Additional context for processing",
      },
      customFocus: {
        type: "string",
        description: "Custom focus for analysis",
      },
      facilitatorEnabled: {
        type: "boolean",
        description: "Enable facilitator functionality",
        default: false,
      },
      platforms: {
        type: "array",
        description: "Target platforms for content generation",
        items: {
          type: "string",
        },
      },
      style: {
        type: "string",
        description: "Style or tone for content generation",
      },
      outputFormat: {
        type: "string",
        description: "Desired output format",
      },
    };

    return (
      commonSchemas[paramName] || {
        type: "string",
        description: `${paramName} parameter`,
      }
    );
  }

  /**
   * Generates MCP tool definition from pipeline information
   * @param {Object} pipelineInfo - Pipeline information object
   * @returns {Object} MCP tool definition
   */
  generateMCPTool(pipelineInfo) {
    const toolName = createToolName(pipelineInfo.name, this.config);

    return {
      name: toolName,
      description:
        pipelineInfo.description || `Execute ${pipelineInfo.name} pipeline`,
      inputSchema:
        pipelineInfo.parameters || this.inferParameterSchema(pipelineInfo.name),
      pipelineName: pipelineInfo.name,
      interfaces: pipelineInfo.interfaces || ["mcp", "cli"],
      metadata: {
        filename: pipelineInfo.filename,
        discovered: pipelineInfo.discovered || false,
        inferred: pipelineInfo.inferred || false,
      },
    };
  }

  /**
   * Registers a pipeline as an MCP tool
   * @param {Object} pipelineInfo - Pipeline information object
   * @returns {Object} Generated tool definition
   */
  registerPipelineAsTool(pipelineInfo) {
    const tool = this.generateMCPTool(pipelineInfo);
    this.tools.set(tool.name, tool);

    this.logger.debug(`Registered tool: ${tool.name}`, {
      pipeline: pipelineInfo.name,
      interfaces: tool.interfaces,
    });

    return tool;
  }

  /**
   * Gets all registered tools
   * @returns {Array} Array of tool definitions
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Gets a specific tool by name
   * @param {string} toolName - Name of the tool
   * @returns {Object|null} Tool definition or null if not found
   */
  getTool(toolName) {
    return this.tools.get(toolName) || null;
  }

  /**
   * Gets pipeline information by name
   * @param {string} pipelineName - Name of the pipeline
   * @returns {Object|null} Pipeline information or null if not found
   */
  getPipeline(pipelineName) {
    return this.pipelines.get(pipelineName) || null;
  }

  /**
   * Checks if a tool exists
   * @param {string} toolName - Name of the tool
   * @returns {boolean} True if tool exists
   */
  hasTool(toolName) {
    return this.tools.has(toolName);
  }

  /**
   * Checks if a pipeline exists
   * @param {string} pipelineName - Name of the pipeline
   * @returns {boolean} True if pipeline exists
   */
  hasPipeline(pipelineName) {
    return this.pipelines.has(pipelineName);
  }

  /**
   * Clears all registered tools and pipelines
   */
  clear() {
    this.tools.clear();
    this.pipelines.clear();
    this.logger.debug("Registry cleared");
  }

  /**
   * Gets registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    const tools = this.getAllTools();
    const pipelines = Array.from(this.pipelines.values());

    return {
      totalTools: tools.length,
      totalPipelines: pipelines.length,
      discoveredPipelines: pipelines.filter((p) => p.discovered).length,
      inferredPipelines: pipelines.filter((p) => p.inferred).length,
      interfaces: {
        mcp: tools.filter((t) => t.interfaces.includes("mcp")).length,
        nostrmq: tools.filter((t) => t.interfaces.includes("nostrmq")).length,
        cli: tools.filter((t) => t.interfaces.includes("cli")).length,
      },
    };
  }

  /**
   * Validates that a pipeline supports the required interface
   * @param {string} pipelineName - Name of the pipeline
   * @param {string} interfaceType - Interface type to check
   * @returns {boolean} True if pipeline supports the interface
   */
  validatePipelineInterface(pipelineName, interfaceType) {
    const pipeline = this.getPipeline(pipelineName);
    if (!pipeline) {
      return false;
    }

    return pipeline.interfaces && pipeline.interfaces.includes(interfaceType);
  }

  /**
   * Refreshes the registry by re-discovering all pipelines
   * @returns {Promise<Array>} Array of discovered pipelines
   */
  async refresh() {
    this.logger.info("Refreshing pipeline registry");
    this.clear();
    return await this.discoverPipelines();
  }

  /**
   * Exports registry data for debugging or persistence
   * @returns {Object} Registry export data
   */
  export() {
    return {
      tools: Object.fromEntries(this.tools),
      pipelines: Object.fromEntries(this.pipelines),
      stats: this.getStats(),
      config: this.config,
    };
  }
}

/**
 * Creates a new pipeline tool registry instance
 * @param {Object} config - Registry configuration
 * @returns {PipelineToolRegistry} New registry instance
 */
export function createToolRegistry(config = {}) {
  return new PipelineToolRegistry(config);
}

/**
 * Default registry instance for convenience
 */
export const defaultRegistry = new PipelineToolRegistry();
