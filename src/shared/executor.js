import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Universal Pipeline Executor
 *
 * This class provides a unified execution layer that can serve both MCP and NostrMQ interfaces.
 * It handles pipeline discovery, loading, and execution with context-aware logging.
 */
export class UniversalPipelineExecutor {
  constructor() {
    this.pipelineCache = new Map();
    this.pipelineDirectory = path.join(process.cwd(), "src", "pipelines");
  }

  /**
   * Discovers all available pipelines in the pipelines directory
   * @returns {Promise<Array>} Array of pipeline information objects
   */
  async discoverPipelines() {
    try {
      const files = await fs.readdir(this.pipelineDirectory);
      const pipelines = [];

      for (const file of files) {
        if (file.endsWith("Pipeline.js")) {
          try {
            const pipelineModule = await this.loadPipelineModule(file);
            if (pipelineModule && pipelineModule.pipelineInfo) {
              pipelines.push(pipelineModule.pipelineInfo);
            }
          } catch (error) {
            console.warn(
              `[UniversalExecutor] Failed to load pipeline ${file}:`,
              error.message
            );
          }
        }
      }

      console.log(
        `[UniversalExecutor] Discovered ${pipelines.length} pipelines`
      );
      return pipelines;
    } catch (error) {
      console.error("[UniversalExecutor] Pipeline discovery failed:", error);
      return [];
    }
  }

  /**
   * Loads a pipeline module from file
   * @param {string} filename - Pipeline filename
   * @returns {Promise<Object>} Pipeline module
   */
  async loadPipelineModule(filename) {
    const pipelinePath = path.join(this.pipelineDirectory, filename);
    const pipelineUrl = `file://${pipelinePath}`;

    // Use dynamic import with cache busting for development
    const module = await import(`${pipelineUrl}?t=${Date.now()}`);
    return module;
  }

  /**
   * Loads a specific pipeline by name
   * @param {string} pipelineName - Name of the pipeline to load
   * @returns {Promise<Object>} Pipeline module
   */
  async loadPipeline(pipelineName) {
    // Check cache first
    if (this.pipelineCache.has(pipelineName)) {
      return this.pipelineCache.get(pipelineName);
    }

    // Find pipeline file
    const filename = `${pipelineName}Pipeline.js`;
    const pipelineModule = await this.loadPipelineModule(filename);

    if (!pipelineModule) {
      throw new Error(`Pipeline '${pipelineName}' not found`);
    }

    // Cache the module
    this.pipelineCache.set(pipelineName, pipelineModule);
    return pipelineModule;
  }

  /**
   * Executes a pipeline via MCP interface
   * @param {string} pipelineName - Name of the pipeline to execute
   * @param {Object} parameters - Pipeline parameters
   * @param {Object} logger - Context-aware logger
   * @returns {Promise<Object>} Execution result formatted for MCP
   */
  async executeViaMCP(pipelineName, parameters, logger) {
    const context = {
      type: "mcp",
      requestId: this.generateRequestId(),
      synchronous: true,
      timestamp: new Date().toISOString(),
    };

    logger.info("MCP pipeline execution started", {
      pipeline: pipelineName,
      parameters: Object.keys(parameters),
      context,
    });

    try {
      const pipeline = await this.loadPipeline(pipelineName);

      // Check if pipeline supports MCP execution
      if (!pipeline.executeViaMCP) {
        throw new Error(
          `Pipeline '${pipelineName}' does not support MCP execution`
        );
      }

      // Execute with MCP-optimized handling
      const result = await pipeline.executeViaMCP(parameters, logger);

      logger.info("MCP pipeline execution completed", {
        pipeline: pipelineName,
        success: !result.error,
        runId: result.runId,
      });

      return this.formatMCPResponse(result);
    } catch (error) {
      logger.error("MCP pipeline execution failed", {
        pipeline: pipelineName,
        error: error.message,
      });

      return this.formatMCPError(error);
    }
  }

  /**
   * Executes a pipeline via NostrMQ interface
   * @param {string} pipelineName - Name of the pipeline to execute
   * @param {Object} parameters - Pipeline parameters
   * @param {Object} jobLogger - Job-specific logger
   * @returns {Promise<Object>} Execution result formatted for NostrMQ
   */
  async executeViaNostrMQ(pipelineName, parameters, jobLogger) {
    const context = {
      type: "nostrmq",
      requestId: this.generateRequestId(),
      synchronous: false,
      timestamp: new Date().toISOString(),
    };

    jobLogger.info("NostrMQ pipeline execution started", {
      pipeline: pipelineName,
      parameters: Object.keys(parameters),
      context,
    });

    try {
      const pipeline = await this.loadPipeline(pipelineName);

      // Check if pipeline supports NostrMQ execution
      if (!pipeline.executeViaNostrMQ) {
        // Fallback to main pipeline function for backward compatibility
        if (typeof pipeline[pipelineName + "Pipeline"] === "function") {
          const result = await pipeline[pipelineName + "Pipeline"](parameters);
          return this.formatNostrMQResponse(result);
        }
        throw new Error(
          `Pipeline '${pipelineName}' does not support NostrMQ execution`
        );
      }

      // Execute with NostrMQ handling
      const result = await pipeline.executeViaNostrMQ(parameters, jobLogger);

      jobLogger.info("NostrMQ pipeline execution completed", {
        pipeline: pipelineName,
        success: !result.error,
        runId: result.runId,
      });

      return this.formatNostrMQResponse(result);
    } catch (error) {
      jobLogger.error("NostrMQ pipeline execution failed", {
        pipeline: pipelineName,
        error: error.message,
      });

      return this.formatNostrMQError(error);
    }
  }

  /**
   * Executes a pipeline via CLI interface (backward compatibility)
   * @param {string} pipelineName - Name of the pipeline to execute
   * @param {Object} parameters - Pipeline parameters
   * @returns {Promise<Object>} Execution result
   */
  async executeViaCLI(pipelineName, parameters) {
    try {
      const pipeline = await this.loadPipeline(pipelineName);

      // Use the main pipeline function
      const pipelineFunction = pipeline[pipelineName + "Pipeline"];
      if (typeof pipelineFunction !== "function") {
        throw new Error(
          `Pipeline function '${pipelineName}Pipeline' not found`
        );
      }

      return await pipelineFunction(parameters);
    } catch (error) {
      console.error(
        `[UniversalExecutor] CLI execution failed for ${pipelineName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Formats execution result for MCP consumption
   * @param {Object} result - Raw pipeline result
   * @returns {Object} MCP-formatted response
   */
  formatMCPResponse(result) {
    if (result.error) {
      return {
        success: false,
        error: {
          code: "PIPELINE_ERROR",
          message: result.error,
          details: result.details || null,
        },
      };
    }

    return {
      success: true,
      result: {
        runId: result.runId,
        status: result.error ? "failed" : "completed",
        summary: result.summary?.content || "Pipeline completed successfully",
        files: result.files ? Object.values(result.files) : [],
        conversation: result.conversation
          ? result.conversation.slice(0, 3)
          : [], // Preview for Claude
        executionTime: result.pipeline?.statistics?.durationSeconds,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Formats execution result for NostrMQ consumption
   * @param {Object} result - Raw pipeline result
   * @returns {Object} NostrMQ-formatted response
   */
  formatNostrMQResponse(result) {
    return {
      success: !result.error,
      runId: result.runId,
      result: result.error ? null : result,
      error: result.error || null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formats error for MCP consumption
   * @param {Error} error - Error object
   * @returns {Object} MCP-formatted error response
   */
  formatMCPError(error) {
    return {
      success: false,
      error: {
        code: "EXECUTION_FAILED",
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Formats error for NostrMQ consumption
   * @param {Error} error - Error object
   * @returns {Object} NostrMQ-formatted error response
   */
  formatNostrMQError(error) {
    return {
      success: false,
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generates a unique request ID
   * @returns {string} Unique request identifier
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validates pipeline parameters against schema
   * @param {Object} parameters - Parameters to validate
   * @param {Object} schema - Parameter schema
   * @returns {Object} Validation result
   */
  validateParameters(parameters, schema) {
    const errors = [];
    const sanitized = {};

    if (!schema || !schema.properties) {
      return { isValid: true, errors: [], sanitized: parameters };
    }

    // Check required parameters
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in parameters)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    // Validate each parameter
    for (const [key, value] of Object.entries(parameters)) {
      const propSchema = schema.properties[key];
      if (!propSchema) {
        // Allow extra parameters for flexibility
        sanitized[key] = value;
        continue;
      }

      // Basic type validation
      if (propSchema.type && typeof value !== propSchema.type) {
        errors.push(`Parameter '${key}' must be of type ${propSchema.type}`);
        continue;
      }

      // Range validation for numbers
      if (propSchema.type === "number") {
        if (propSchema.minimum !== undefined && value < propSchema.minimum) {
          errors.push(`Parameter '${key}' must be >= ${propSchema.minimum}`);
          continue;
        }
        if (propSchema.maximum !== undefined && value > propSchema.maximum) {
          errors.push(`Parameter '${key}' must be <= ${propSchema.maximum}`);
          continue;
        }
      }

      sanitized[key] = value;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : null,
    };
  }

  /**
   * Clears the pipeline cache
   */
  clearCache() {
    this.pipelineCache.clear();
    console.log("[UniversalExecutor] Pipeline cache cleared");
  }
}

// Export singleton instance
export const universalExecutor = new UniversalPipelineExecutor();
