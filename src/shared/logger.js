import { promises as fs } from "fs";
import path from "path";

/**
 * Context-Aware Logger
 *
 * Provides logging functionality that distinguishes between different interface types
 * (MCP, NostrMQ, CLI) and formats log entries appropriately for each context.
 */

/**
 * Log levels in order of severity
 */
export const LogLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Default log level from environment or INFO
 */
const DEFAULT_LOG_LEVEL =
  LogLevels[process.env.LOG_LEVEL?.toUpperCase()] ?? LogLevels.INFO;

/**
 * Ensures log directory exists
 */
async function ensureLogDirectory() {
  const logDir = path.join(process.cwd(), "logs");
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
  return logDir;
}

/**
 * Formats a timestamp for logging
 * @returns {string} Formatted timestamp
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Formats log entry for console output
 * @param {string} level - Log level
 * @param {string} context - Execution context (mcp, nostrmq, cli)
 * @param {string} requestId - Request identifier
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {string} Formatted log entry
 */
function formatConsoleEntry(level, context, requestId, message, data) {
  const timestamp = formatTimestamp();
  const contextPrefix = context ? `[${context.toUpperCase()}]` : "[CLI]";
  const requestPrefix = requestId ? `[${requestId}]` : "";

  let logLine = `${timestamp} ${level.padEnd(
    5
  )} ${contextPrefix}${requestPrefix} ${message}`;

  if (data && Object.keys(data).length > 0) {
    logLine += ` ${JSON.stringify(data)}`;
  }

  return logLine;
}

/**
 * Formats log entry for file output
 * @param {string} level - Log level
 * @param {string} context - Execution context
 * @param {string} requestId - Request identifier
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {Object} Structured log entry
 */
function formatFileEntry(level, context, requestId, message, data) {
  return {
    timestamp: formatTimestamp(),
    level,
    context: context || "cli",
    requestId: requestId || null,
    message,
    data: data || {},
    pid: process.pid,
  };
}

/**
 * Writes log entry to file
 * @param {Object} logEntry - Structured log entry
 * @param {string} context - Execution context for file naming
 */
async function writeLogToFile(logEntry, context) {
  try {
    const logDir = await ensureLogDirectory();
    const logFile = path.join(logDir, `${context || "general"}.log`);

    const logLine = JSON.stringify(logEntry) + "\n";
    await fs.appendFile(logFile, logLine, "utf8");
  } catch (error) {
    // Don't throw on log file errors, just warn
    console.warn(`[Logger] Failed to write to log file: ${error.message}`);
  }
}

/**
 * Core logging function
 * @param {string} level - Log level
 * @param {string} context - Execution context
 * @param {string} requestId - Request identifier
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function logEntry(level, context, requestId, message, data = {}) {
  const levelValue = LogLevels[level];

  // Skip if below configured log level
  if (levelValue < DEFAULT_LOG_LEVEL) {
    return;
  }

  // Console output
  const consoleEntry = formatConsoleEntry(
    level,
    context,
    requestId,
    message,
    data
  );

  // For MCP context, send all logs to stderr to keep stdout clean for JSON-RPC
  if (context === "mcp") {
    console.error(consoleEntry);
  } else {
    // For other contexts, use appropriate console methods
    switch (level) {
      case "ERROR":
        console.error(consoleEntry);
        break;
      case "WARN":
        console.warn(consoleEntry);
        break;
      case "DEBUG":
        console.debug(consoleEntry);
        break;
      default:
        console.log(consoleEntry);
    }
  }

  // File output (async, non-blocking)
  const fileEntry = formatFileEntry(level, context, requestId, message, data);
  writeLogToFile(fileEntry, context).catch(() => {
    // Ignore file write errors
  });
}

/**
 * Creates an MCP-specific logger
 * @param {Object} context - MCP execution context
 * @returns {Object} Logger instance
 */
export function createMCPLogger(context) {
  const { requestId } = context;

  return {
    debug: (message, data) => {
      logEntry("DEBUG", "mcp", requestId, message, data);
    },
    info: (message, data) => {
      logEntry("INFO", "mcp", requestId, message, data);
    },
    warn: (message, data) => {
      logEntry("WARN", "mcp", requestId, message, data);
    },
    error: (message, error) => {
      const errorData =
        error instanceof Error
          ? {
              error: error.message,
              stack: error.stack,
            }
          : { error };
      logEntry("ERROR", "mcp", requestId, message, errorData);
    },

    // MCP-specific methods
    toolCall: (toolName, parameters) => {
      logEntry("INFO", "mcp", requestId, `Tool called: ${toolName}`, {
        tool: toolName,
        parameters: Object.keys(parameters),
      });
    },

    toolResult: (toolName, success, duration) => {
      logEntry("INFO", "mcp", requestId, `Tool completed: ${toolName}`, {
        tool: toolName,
        success,
        duration,
      });
    },
  };
}

/**
 * Creates a NostrMQ-specific logger
 * @param {Object} context - NostrMQ execution context
 * @returns {Object} Logger instance
 */
export function createNostrMQLogger(context) {
  const { jobId, requestId } = context;

  return {
    debug: (message, data) => {
      logEntry("DEBUG", "nostrmq", requestId || jobId, message, data);
    },
    info: (message, data) => {
      logEntry("INFO", "nostrmq", requestId || jobId, message, data);
    },
    warn: (message, data) => {
      logEntry("WARN", "nostrmq", requestId || jobId, message, data);
    },
    error: (message, error) => {
      const errorData =
        error instanceof Error
          ? {
              error: error.message,
              stack: error.stack,
            }
          : { error };
      logEntry("ERROR", "nostrmq", requestId || jobId, message, errorData);
    },

    // NostrMQ-specific methods
    jobStarted: (pipelineName, parameters) => {
      logEntry(
        "INFO",
        "nostrmq",
        requestId || jobId,
        `Job started: ${pipelineName}`,
        {
          pipeline: pipelineName,
          parameters: Object.keys(parameters),
        }
      );
    },

    jobCompleted: (pipelineName, success, duration) => {
      logEntry(
        "INFO",
        "nostrmq",
        requestId || jobId,
        `Job completed: ${pipelineName}`,
        {
          pipeline: pipelineName,
          success,
          duration,
        }
      );
    },

    messageReceived: (eventId, pubkey) => {
      logEntry("DEBUG", "nostrmq", requestId || jobId, "Message received", {
        eventId,
        pubkey: pubkey.substring(0, 8) + "...",
      });
    },

    messageProcessed: (eventId, success) => {
      logEntry("INFO", "nostrmq", requestId || jobId, "Message processed", {
        eventId,
        success,
      });
    },
  };
}

/**
 * Creates a CLI-specific logger
 * @param {string} component - Component name (optional)
 * @returns {Object} Logger instance
 */
export function createCLILogger(component = null) {
  const context = component || "cli";

  return {
    debug: (message, data) => {
      logEntry("DEBUG", context, null, message, data);
    },
    info: (message, data) => {
      logEntry("INFO", context, null, message, data);
    },
    warn: (message, data) => {
      logEntry("WARN", context, null, message, data);
    },
    error: (message, error) => {
      const errorData =
        error instanceof Error
          ? {
              error: error.message,
              stack: error.stack,
            }
          : { error };
      logEntry("ERROR", context, null, message, errorData);
    },
  };
}

/**
 * Creates a generic logger for any context
 * @param {string} contextType - Type of context (mcp, nostrmq, cli, etc.)
 * @param {string} requestId - Request identifier
 * @returns {Object} Logger instance
 */
export function createLogger(contextType, requestId = null) {
  return {
    debug: (message, data) => {
      logEntry("DEBUG", contextType, requestId, message, data);
    },
    info: (message, data) => {
      logEntry("INFO", contextType, requestId, message, data);
    },
    warn: (message, data) => {
      logEntry("WARN", contextType, requestId, message, data);
    },
    error: (message, error) => {
      const errorData =
        error instanceof Error
          ? {
              error: error.message,
              stack: error.stack,
            }
          : { error };
      logEntry("ERROR", contextType, requestId, message, errorData);
    },
  };
}

/**
 * Error codes for structured error handling
 */
export const ErrorCodes = {
  // MCP-specific errors
  MCP_INVALID_PARAMETERS: "MCP_INVALID_PARAMETERS",
  MCP_PIPELINE_NOT_FOUND: "MCP_PIPELINE_NOT_FOUND",
  MCP_EXECUTION_FAILED: "MCP_EXECUTION_FAILED",
  MCP_TIMEOUT: "MCP_TIMEOUT",
  MCP_SERVER_ERROR: "MCP_SERVER_ERROR",

  // NostrMQ-specific errors
  NOSTRMQ_INVALID_MESSAGE: "NOSTRMQ_INVALID_MESSAGE",
  NOSTRMQ_UNAUTHORIZED: "NOSTRMQ_UNAUTHORIZED",
  NOSTRMQ_PIPELINE_FAILED: "NOSTRMQ_PIPELINE_FAILED",
  NOSTRMQ_RELAY_ERROR: "NOSTRMQ_RELAY_ERROR",

  // General pipeline errors
  PIPELINE_NOT_FOUND: "PIPELINE_NOT_FOUND",
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  EXECUTION_FAILED: "EXECUTION_FAILED",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
};

/**
 * Formats an error for MCP consumption
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error
 */
export function formatMCPError(code, message, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: formatTimestamp(),
    },
  };
}

/**
 * Formats an error for NostrMQ consumption
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error
 */
export function formatNostrMQError(code, message, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: formatTimestamp(),
    },
  };
}

/**
 * Utility function to get current log level
 * @returns {string} Current log level name
 */
export function getCurrentLogLevel() {
  return Object.keys(LogLevels).find(
    (key) => LogLevels[key] === DEFAULT_LOG_LEVEL
  );
}

/**
 * Utility function to set log level at runtime
 * @param {string} level - New log level
 */
export function setLogLevel(level) {
  const upperLevel = level.toUpperCase();
  if (upperLevel in LogLevels) {
    process.env.LOG_LEVEL = upperLevel;
    console.log(`[Logger] Log level set to ${upperLevel}`);
  } else {
    console.warn(`[Logger] Invalid log level: ${level}`);
  }
}

// Export the core logging function for direct use
export { logEntry };
