import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Pipeline Registry - Automatic discovery and management of all pipelines
 * Provides dynamic loading and routing for pipeline execution via NostrMQ
 */
export class PipelineRegistry {
  constructor(logger = null) {
    this.logger = logger;
    this.pipelines = new Map();
    this.pipelineDirectory = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );
  }

  /**
   * Initialize the registry by discovering all available pipelines
   */
  async initialize() {
    this.log("info", "Initializing Pipeline Registry");
    await this.discoverPipelines();
    this.log(
      "info",
      `Pipeline Registry initialized with ${this.pipelines.size} pipelines`,
      {
        pipelines: Array.from(this.pipelines.keys()),
      }
    );
  }

  /**
   * Discover all pipeline files in the pipelines directory
   */
  async discoverPipelines() {
    try {
      const files = await fs.readdir(this.pipelineDirectory);
      const pipelineFiles = files.filter(
        (file) => file.endsWith("Pipeline.js") && file !== "registry"
      );

      for (const file of pipelineFiles) {
        await this.loadPipeline(file);
      }
    } catch (error) {
      this.log("error", "Failed to discover pipelines", {
        error: error.message,
        directory: this.pipelineDirectory,
      });
      throw error;
    }
  }

  /**
   * Load a specific pipeline file and register it
   */
  async loadPipeline(filename) {
    try {
      const pipelinePath = path.join(this.pipelineDirectory, filename);
      const pipelineModule = await import(pipelinePath);

      // Extract pipeline name from filename (remove Pipeline.js suffix)
      const pipelineName = filename.replace("Pipeline.js", "");

      // Look for the main pipeline function and metadata
      const pipelineFunction = this.extractPipelineFunction(
        pipelineModule,
        pipelineName
      );
      const pipelineInfo = this.extractPipelineInfo(
        pipelineModule,
        pipelineName
      );

      if (!pipelineFunction) {
        this.log(
          "warn",
          `No main function found for pipeline: ${pipelineName}`
        );
        return;
      }

      // Register the pipeline
      this.pipelines.set(pipelineName, {
        name: pipelineName,
        filename,
        path: pipelinePath,
        execute: pipelineFunction,
        executeViaNostrMQ: pipelineModule.executeViaNostrMQ || null,
        info: pipelineInfo,
        module: pipelineModule,
      });

      this.log("info", `Pipeline registered: ${pipelineName}`, {
        hasNostrMQInterface: !!pipelineModule.executeViaNostrMQ,
        info: pipelineInfo,
      });
    } catch (error) {
      this.log("error", `Failed to load pipeline: ${filename}`, {
        error: error.message,
      });
    }
  }

  /**
   * Extract the main pipeline function from the module
   */
  extractPipelineFunction(module, pipelineName) {
    // Try different naming conventions
    const possibleNames = [
      pipelineName + "Pipeline", // dialoguePipeline
      pipelineName, // dialogue
      "default", // default export
    ];

    for (const name of possibleNames) {
      if (module[name] && typeof module[name] === "function") {
        return module[name];
      }
    }

    return null;
  }

  /**
   * Extract pipeline metadata/info from the module
   */
  extractPipelineInfo(module, pipelineName) {
    const defaultInfo = {
      name: pipelineName,
      description: `${pipelineName} pipeline`,
      version: "1.0.0",
      parameters: {},
      capabilities: [],
    };

    if (module.pipelineInfo && typeof module.pipelineInfo === "object") {
      return { ...defaultInfo, ...module.pipelineInfo };
    }

    return defaultInfo;
  }

  /**
   * Get all available pipelines
   */
  getAvailablePipelines() {
    const pipelines = {};
    for (const [name, pipeline] of this.pipelines) {
      pipelines[name] = {
        name: pipeline.name,
        info: pipeline.info,
        hasNostrMQInterface: !!pipeline.executeViaNostrMQ,
      };
    }
    return pipelines;
  }

  /**
   * Check if a pipeline exists
   */
  hasPipeline(pipelineName) {
    return this.pipelines.has(pipelineName);
  }

  /**
   * Get a specific pipeline
   */
  getPipeline(pipelineName) {
    return this.pipelines.get(pipelineName);
  }

  /**
   * Get pipeline for NostrMQ execution
   */
  getPipelineForNostrMQ(pipelineName) {
    const pipeline = this.pipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineName}' not found`);
    }

    if (!pipeline.executeViaNostrMQ) {
      throw new Error(
        `Pipeline '${pipelineName}' does not support NostrMQ execution`
      );
    }

    return pipeline;
  }

  /**
   * Get pipeline names that support NostrMQ
   */
  getNostrMQEnabledPipelines() {
    const enabled = [];
    for (const [name, pipeline] of this.pipelines) {
      if (pipeline.executeViaNostrMQ) {
        enabled.push(name);
      }
    }
    return enabled;
  }

  /**
   * Reload a specific pipeline (useful for development)
   */
  async reloadPipeline(pipelineName) {
    const pipeline = this.pipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineName}' not found`);
    }

    this.log("info", `Reloading pipeline: ${pipelineName}`);

    // Remove from cache to force reload
    delete require.cache[pipeline.path];

    // Reload the pipeline
    await this.loadPipeline(pipeline.filename);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const totalPipelines = this.pipelines.size;
    const nostrMQEnabled = this.getNostrMQEnabledPipelines().length;

    return {
      totalPipelines,
      nostrMQEnabled,
      nostrMQDisabled: totalPipelines - nostrMQEnabled,
      pipelines: Array.from(this.pipelines.keys()),
    };
  }

  /**
   * Validate pipeline configuration for NostrMQ execution
   */
  validatePipelineConfig(pipelineName, parameters) {
    const pipeline = this.getPipeline(pipelineName);
    if (!pipeline) {
      return {
        isValid: false,
        errors: [`Pipeline '${pipelineName}' not found`],
      };
    }

    if (!pipeline.executeViaNostrMQ) {
      return {
        isValid: false,
        errors: [
          `Pipeline '${pipelineName}' does not support NostrMQ execution`,
        ],
      };
    }

    // Basic parameter validation based on pipeline info
    const errors = [];
    const requiredParams = pipeline.info.parameters?.required || [];

    for (const param of requiredParams) {
      if (!parameters[param]) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Internal logging method
   */
  log(level, message, context = {}) {
    if (this.logger) {
      this.logger[level](`[PipelineRegistry] ${message}`, context);
    } else {
      console.log(
        `[PipelineRegistry] ${level.toUpperCase()}: ${message}`,
        context
      );
    }
  }
}

/**
 * Create and initialize a pipeline registry instance
 */
export async function createPipelineRegistry(logger = null) {
  const registry = new PipelineRegistry(logger);
  await registry.initialize();
  return registry;
}

/**
 * Export default registry instance for convenience
 */
let defaultRegistry = null;

export async function getDefaultRegistry(logger = null) {
  if (!defaultRegistry) {
    defaultRegistry = await createPipelineRegistry(logger);
  }
  return defaultRegistry;
}
