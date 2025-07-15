import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Get the directory of this config file to use as base for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

/**
 * MCP Server Configuration
 *
 * Manages configuration for the Model Context Protocol server,
 * including server settings, pipeline discovery, and execution parameters.
 */

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  // Server settings
  enabled: false,
  port: 3001,
  host: "localhost",
  logLevel: "info",

  // Pipeline discovery
  pipelineDirectory: "./src/pipelines",
  autoDiscovery: true,

  // Execution settings
  defaultTimeout: 300000, // 5 minutes
  maxConcurrent: 1, // Single user, sequential execution

  // Security settings
  localOnly: true,
  allowedHosts: ["localhost", "127.0.0.1", "::1"],

  // Tool naming
  toolPrefix: "run_pipeliner_",

  // Response formatting
  includeDebugInfo: false,
  maxResponseSize: 1024 * 1024, // 1MB

  // File handling
  outputDirectory: "./output",
  tempDirectory: "./temp",

  // Performance settings
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
};

/**
 * Loads MCP configuration from environment variables and defaults
 * @returns {Object} Complete MCP configuration
 */
export function loadMCPConfig() {
  const config = {
    // Server settings
    enabled: process.env.ENABLE_MCP_SERVER === "true",
    port: parseInt(process.env.MCP_SERVER_PORT) || DEFAULT_CONFIG.port,
    host: process.env.MCP_SERVER_HOST || DEFAULT_CONFIG.host,
    logLevel: process.env.MCP_LOG_LEVEL || DEFAULT_CONFIG.logLevel,

    // Pipeline discovery
    pipelineDirectory:
      process.env.MCP_PIPELINE_DIRECTORY || DEFAULT_CONFIG.pipelineDirectory,
    autoDiscovery: process.env.MCP_AUTO_DISCOVERY !== "false", // Default true

    // Execution settings
    defaultTimeout:
      parseInt(process.env.MCP_DEFAULT_TIMEOUT) ||
      DEFAULT_CONFIG.defaultTimeout,
    maxConcurrent:
      parseInt(process.env.MCP_MAX_CONCURRENT) || DEFAULT_CONFIG.maxConcurrent,

    // Security settings
    localOnly: process.env.MCP_LOCAL_ONLY !== "false", // Default true
    allowedHosts: process.env.MCP_ALLOWED_HOSTS
      ? process.env.MCP_ALLOWED_HOSTS.split(",").map((h) => h.trim())
      : DEFAULT_CONFIG.allowedHosts,

    // Tool naming
    toolPrefix: process.env.MCP_TOOL_PREFIX || DEFAULT_CONFIG.toolPrefix,

    // Response formatting
    includeDebugInfo: process.env.MCP_INCLUDE_DEBUG === "true",
    maxResponseSize:
      parseInt(process.env.MCP_MAX_RESPONSE_SIZE) ||
      DEFAULT_CONFIG.maxResponseSize,

    // File handling
    outputDirectory:
      process.env.MCP_OUTPUT_DIRECTORY || DEFAULT_CONFIG.outputDirectory,
    tempDirectory:
      process.env.MCP_TEMP_DIRECTORY || DEFAULT_CONFIG.tempDirectory,

    // Performance settings
    cacheEnabled: process.env.MCP_CACHE_ENABLED !== "false", // Default true
    cacheTTL: parseInt(process.env.MCP_CACHE_TTL) || DEFAULT_CONFIG.cacheTTL,
  };

  // Validate configuration
  validateMCPConfig(config);

  return config;
}

/**
 * Validates MCP configuration
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateMCPConfig(config) {
  const errors = [];

  // Validate port
  if (
    !Number.isInteger(config.port) ||
    config.port < 1 ||
    config.port > 65535
  ) {
    errors.push("MCP server port must be a valid integer between 1 and 65535");
  }

  // Validate host
  if (!config.host || typeof config.host !== "string") {
    errors.push("MCP server host must be a non-empty string");
  }

  // Validate timeout
  if (
    !Number.isInteger(config.defaultTimeout) ||
    config.defaultTimeout < 1000
  ) {
    errors.push("MCP default timeout must be at least 1000ms");
  }

  // Validate max concurrent
  if (!Number.isInteger(config.maxConcurrent) || config.maxConcurrent < 1) {
    errors.push("MCP max concurrent must be at least 1");
  }

  // Validate log level
  const validLogLevels = ["debug", "info", "warn", "error"];
  if (!validLogLevels.includes(config.logLevel.toLowerCase())) {
    errors.push(`MCP log level must be one of: ${validLogLevels.join(", ")}`);
  }

  // Validate directories
  if (
    !config.pipelineDirectory ||
    typeof config.pipelineDirectory !== "string"
  ) {
    errors.push("MCP pipeline directory must be a non-empty string");
  }

  if (!config.outputDirectory || typeof config.outputDirectory !== "string") {
    errors.push("MCP output directory must be a non-empty string");
  }

  // Validate allowed hosts
  if (!Array.isArray(config.allowedHosts) || config.allowedHosts.length === 0) {
    errors.push("MCP allowed hosts must be a non-empty array");
  }

  // Validate tool prefix
  if (typeof config.toolPrefix !== "string") {
    errors.push("MCP tool prefix must be a string");
  }

  // Validate response size
  if (
    !Number.isInteger(config.maxResponseSize) ||
    config.maxResponseSize < 1024
  ) {
    errors.push("MCP max response size must be at least 1024 bytes");
  }

  if (errors.length > 0) {
    throw new Error(
      `MCP configuration validation failed:\n${errors.join("\n")}`
    );
  }
}

/**
 * Gets the absolute path for a directory configuration
 * @param {string} relativePath - Relative path from config
 * @returns {string} Absolute path
 */
export function getAbsolutePath(relativePath) {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  // Use project root instead of current working directory to ensure
  // paths work correctly regardless of where the server is executed from
  return path.resolve(PROJECT_ROOT, relativePath);
}

/**
 * Creates a tool name from pipeline name using configured prefix
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} config - MCP configuration
 * @returns {string} Tool name
 */
export function createToolName(pipelineName, config) {
  return `${config.toolPrefix}${pipelineName}`;
}

/**
 * Extracts pipeline name from tool name
 * @param {string} toolName - MCP tool name
 * @param {Object} config - MCP configuration
 * @returns {string|null} Pipeline name or null if not a pipeline tool
 */
export function extractPipelineName(toolName, config) {
  if (!toolName.startsWith(config.toolPrefix)) {
    return null;
  }
  return toolName.substring(config.toolPrefix.length);
}

/**
 * Gets environment-specific configuration overrides
 * @returns {Object} Environment-specific config
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || "development";

  const envConfigs = {
    development: {
      logLevel: "debug",
      includeDebugInfo: true,
      cacheEnabled: false, // Disable cache in development for hot reloading
    },

    production: {
      logLevel: "info",
      includeDebugInfo: false,
      cacheEnabled: true,
    },

    test: {
      logLevel: "warn",
      includeDebugInfo: false,
      cacheEnabled: false,
      port: 0, // Use random port for testing
    },
  };

  return envConfigs[env] || {};
}

/**
 * Merges environment-specific configuration with base config
 * @param {Object} baseConfig - Base configuration
 * @returns {Object} Merged configuration
 */
export function applyEnvironmentConfig(baseConfig) {
  const envConfig = getEnvironmentConfig();
  return { ...baseConfig, ...envConfig };
}

/**
 * Gets the complete MCP configuration with environment overrides
 * @returns {Object} Complete MCP configuration
 */
export function getMCPConfig() {
  const baseConfig = loadMCPConfig();
  return applyEnvironmentConfig(baseConfig);
}

/**
 * Configuration for different pipeline types
 */
export const PipelineConfigs = {
  dialogue: {
    timeout: 180000, // 3 minutes
    maxIterations: 10,
    requiredParams: ["sourceText", "discussionPrompt"],
    optionalParams: ["iterations", "summaryFocus"],
  },

  facilitatedDialogue: {
    timeout: 240000, // 4 minutes
    maxIterations: 10,
    requiredParams: ["sourceText", "discussionPrompt"],
    optionalParams: ["iterations", "summaryFocus"],
  },

  simpleChat: {
    timeout: 60000, // 1 minute
    maxIterations: 1,
    requiredParams: ["message"],
    optionalParams: ["context"],
  },

  contentWaterfall: {
    timeout: 300000, // 5 minutes
    maxIterations: 1,
    requiredParams: ["sourceContent"],
    optionalParams: ["platforms", "style"],
  },
};

/**
 * Gets pipeline-specific configuration
 * @param {string} pipelineName - Name of the pipeline
 * @returns {Object} Pipeline-specific configuration
 */
export function getPipelineConfig(pipelineName) {
  return (
    PipelineConfigs[pipelineName] || {
      timeout: DEFAULT_CONFIG.defaultTimeout,
      maxIterations: 1,
      requiredParams: [],
      optionalParams: [],
    }
  );
}

/**
 * MCP Server capability configuration
 */
export const MCPCapabilities = {
  tools: {
    listChanged: true,
    supportsProgress: false,
  },

  resources: {
    subscribe: false,
    listChanged: false,
  },

  prompts: {
    listChanged: false,
  },

  logging: {
    level: "info",
  },
};

/**
 * Gets MCP server capabilities
 * @param {Object} config - MCP configuration
 * @returns {Object} Server capabilities
 */
export function getMCPCapabilities(config) {
  return {
    ...MCPCapabilities,
    logging: {
      level: config.logLevel,
    },
  };
}

/**
 * Default error messages for common scenarios
 */
export const ErrorMessages = {
  SERVER_DISABLED:
    "MCP server is disabled. Set ENABLE_MCP_SERVER=true to enable.",
  PIPELINE_NOT_FOUND: "Pipeline not found or not accessible via MCP.",
  INVALID_PARAMETERS: "Invalid parameters provided for pipeline execution.",
  EXECUTION_TIMEOUT: "Pipeline execution timed out.",
  SERVER_ERROR: "Internal server error occurred.",
  UNAUTHORIZED: "Access denied. MCP server restricted to local access only.",
};

/**
 * Exports for testing and debugging
 */
export const __testing__ = {
  DEFAULT_CONFIG,
  validateMCPConfig,
};
