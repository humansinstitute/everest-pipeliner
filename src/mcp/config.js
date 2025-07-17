import { loadConfig } from "../services/config.js";

/**
 * Get MCP server configuration
 * @returns {Object} MCP configuration object
 */
export function getMCPConfig() {
  const baseConfig = loadConfig();

  return {
    enabled:
      process.env.ENABLE_MCP_SERVER === "true" ||
      baseConfig.enableMCPServer ||
      false,
    port: parseInt(
      process.env.MCP_SERVER_PORT || baseConfig.mcpServerPort || "3001"
    ),
    host:
      process.env.MCP_SERVER_HOST || baseConfig.mcpServerHost || "localhost",
    logLevel: process.env.MCP_LOG_LEVEL || baseConfig.mcpLogLevel || "info",

    // Pipeline discovery settings
    pipelineDirectory:
      process.env.MCP_PIPELINE_DIR ||
      baseConfig.mcpPipelineDirectory ||
      "./src/pipelines",
    autoDiscovery:
      process.env.MCP_AUTO_DISCOVERY !== "false" &&
      baseConfig.mcpAutoDiscovery !== false,

    // Tool settings
    toolPrefix:
      process.env.MCP_TOOL_PREFIX ||
      baseConfig.mcpToolPrefix ||
      "run_pipeliner_",
    defaultTimeout: parseInt(
      process.env.MCP_DEFAULT_TIMEOUT ||
        baseConfig.mcpDefaultTimeout ||
        "300000"
    ), // 5 minutes
    maxConcurrent: parseInt(
      process.env.MCP_MAX_CONCURRENT || baseConfig.mcpMaxConcurrent || "1"
    ),

    // Security settings
    localOnly:
      process.env.MCP_LOCAL_ONLY !== "false" &&
      baseConfig.mcpLocalOnly !== false,
    allowedHosts: process.env.MCP_ALLOWED_HOSTS?.split(",") ||
      baseConfig.mcpAllowedHosts || ["localhost", "127.0.0.1", "::1"],

    // Debug settings
    includeDebugInfo:
      process.env.MCP_INCLUDE_DEBUG === "true" ||
      baseConfig.mcpIncludeDebugInfo ||
      false,
    maxResponseSize: parseInt(
      process.env.MCP_MAX_RESPONSE_SIZE ||
        baseConfig.mcpMaxResponseSize ||
        "1048576"
    ), // 1MB

    // Output settings
    outputDirectory:
      process.env.MCP_OUTPUT_DIR || baseConfig.mcpOutputDirectory || "./output",
    tempDirectory:
      process.env.MCP_TEMP_DIR || baseConfig.mcpTempDirectory || "./temp",
  };
}

/**
 * Validate MCP configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateMCPConfig(config) {
  const errors = [];

  if (!config) {
    errors.push("Configuration object is required");
    return { isValid: false, errors };
  }

  // Validate port
  if (config.port && (config.port < 1 || config.port > 65535)) {
    errors.push("Port must be between 1 and 65535");
  }

  // Validate timeout
  if (config.defaultTimeout && config.defaultTimeout < 1000) {
    errors.push("Default timeout must be at least 1000ms");
  }

  // Validate max concurrent
  if (config.maxConcurrent && config.maxConcurrent < 1) {
    errors.push("Max concurrent must be at least 1");
  }

  // Validate max response size
  if (config.maxResponseSize && config.maxResponseSize < 1024) {
    errors.push("Max response size must be at least 1024 bytes");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get default MCP configuration for development
 * @returns {Object} Default development configuration
 */
export function getDefaultMCPConfig() {
  return {
    enabled: true,
    port: 3001,
    host: "localhost",
    logLevel: "debug",
    pipelineDirectory: "./src/pipelines",
    autoDiscovery: true,
    toolPrefix: "run_pipeliner_",
    defaultTimeout: 300000,
    maxConcurrent: 1,
    localOnly: true,
    allowedHosts: ["localhost", "127.0.0.1", "::1"],
    includeDebugInfo: true,
    maxResponseSize: 1048576,
    outputDirectory: "./output",
    tempDirectory: "./temp",
  };
}
