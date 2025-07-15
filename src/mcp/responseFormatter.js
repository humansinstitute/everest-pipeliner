/**
 * MCP Response Formatter
 *
 * Formats pipeline execution results for optimal consumption by Claude Desktop
 * and other MCP clients. Provides structured, readable responses with file
 * references and actionable information.
 */

/**
 * Formats a successful pipeline execution result for MCP response
 * @param {Object} result - Pipeline execution result
 * @param {Object} context - Execution context
 * @returns {Object} Formatted MCP response
 */
export function formatSuccessResponse(result, context) {
  const response = {
    content: [
      {
        type: "text",
        text: generateSuccessMessage(result, context),
      },
    ],
  };

  // Add debug information if enabled in context
  if (context.includeDebugInfo) {
    response.content.push({
      type: "text",
      text: generateDebugInfo(result, context),
    });
  }

  return response;
}

/**
 * Formats an error response for MCP
 * @param {Error|Object} error - Error object or pipeline error result
 * @param {Object} context - Execution context
 * @returns {Object} Formatted MCP error response
 */
export function formatErrorResponse(error, context) {
  const errorMessage =
    error.message || error.details || "Unknown error occurred";

  return {
    content: [
      {
        type: "text",
        text: `❌ **Pipeline execution failed**\n\n**Error**: ${errorMessage}\n\n**Pipeline**: ${context.pipelineName}\n**Request ID**: ${context.requestId}`,
      },
    ],
    isError: true,
  };
}

/**
 * Formats a validation error response for MCP
 * @param {Array} errors - Array of validation error messages
 * @param {Object} context - Execution context
 * @returns {Object} Formatted MCP validation error response
 */
export function formatValidationErrorResponse(errors, context) {
  const errorList = errors.map((error) => `• ${error}`).join("\n");

  return {
    content: [
      {
        type: "text",
        text: `❌ **Parameter validation failed**\n\n**Errors**:\n${errorList}\n\n**Pipeline**: ${context.pipelineName}\n**Request ID**: ${context.requestId}`,
      },
    ],
    isError: true,
  };
}

/**
 * Generates the main success message for a pipeline result
 * @param {Object} result - Pipeline execution result
 * @param {Object} context - Execution context
 * @returns {string} Formatted success message
 */
function generateSuccessMessage(result, context) {
  let message = `✅ **${getPipelineDisplayName(
    context.pipelineName
  )} completed successfully!**\n\n`;

  // Add pipeline-specific content based on pipeline type
  switch (context.pipelineName) {
    case "dialogue":
    case "facilitatedDialogue":
      message += formatDialogueResult(result);
      break;
    case "contentWaterfall":
      message += formatWaterfallResult(result);
      break;
    case "simpleChat":
      message += formatSimpleChatResult(result);
      break;
    default:
      message += formatGenericResult(result);
  }

  // Add execution info
  message += generateExecutionInfo(result, context);

  return message;
}

/**
 * Formats dialogue pipeline results
 * @param {Object} result - Dialogue pipeline result
 * @returns {string} Formatted dialogue content
 */
function formatDialogueResult(result) {
  let content = "";

  // Add summary if available
  if (result.summary?.content) {
    content += `**Summary:**\n${result.summary.content}\n\n`;
  }

  // Add conversation info
  if (result.conversation && result.conversation.length > 0) {
    content += `**Conversation:**\n`;
    content += `- ${result.conversation.length} exchanges between agents\n`;

    // Add facilitator info if applicable
    if (result.config?.facilitatorEnabled) {
      const facilitatorInterventions = result.conversation.filter(
        (entry) => entry.isFacilitator
      ).length;
      content += `- ${facilitatorInterventions} facilitator interventions\n`;
    }

    content += "\n";

    // Add conversation preview
    content += `**Preview:**\n`;
    const previewEntries = result.conversation.slice(0, 2);
    for (const entry of previewEntries) {
      const agentName = entry.isFacilitator ? "🎯 Facilitator" : entry.agent;
      content += `- **${agentName}**: ${entry.content.substring(0, 100)}...\n`;
    }
    content += "\n";
  }

  // Add file information
  if (result.files) {
    content += formatFileReferences(result.files);
  }

  return content;
}

/**
 * Formats content waterfall pipeline results
 * @param {Object} result - Waterfall pipeline result
 * @returns {string} Formatted waterfall content
 */
function formatWaterfallResult(result) {
  let content = "";

  // Add content generation summary
  content += `**Content Generated:**\n`;

  if (result.topics?.topics) {
    content += `- ${result.topics.topics.length} topics extracted\n`;
  }

  if (result.linkedinPosts?.linkedinPosts) {
    content += `- ${result.linkedinPosts.linkedinPosts.length} LinkedIn posts created\n`;
  }

  if (result.reelsConcepts?.reelsConcepts) {
    content += `- ${result.reelsConcepts.reelsConcepts.length} Reels concepts generated\n`;
  }

  content += "\n";

  // Add topics preview if available
  if (result.topics?.topics && result.topics.topics.length > 0) {
    content += `**Topics Preview:**\n`;
    result.topics.topics.slice(0, 3).forEach((topic, index) => {
      content += `${index + 1}. **${topic.title || `Topic ${index + 1}`}** (${
        topic.category || "General"
      })\n`;
    });
    content += "\n";
  }

  // Add file information
  if (result.files) {
    content += formatFileReferences(result.files);
  }

  return content;
}

/**
 * Formats simple chat pipeline results
 * @param {Object} result - Simple chat pipeline result
 * @returns {string} Formatted simple chat content
 */
function formatSimpleChatResult(result) {
  let content = "";

  // Extract the response content from pipeline data
  if (result.steps && result.steps.length > 0) {
    const chatStep = result.steps.find(
      (step) => step.stepId.includes("chat") || step.stepId.includes("poem")
    );
    if (chatStep && chatStep.output) {
      const responseContent = extractResponseContent(chatStep.output);
      if (responseContent) {
        content += `**Response:**\n${responseContent}\n\n`;
      }
    }
  }

  return content;
}

/**
 * Formats generic pipeline results
 * @param {Object} result - Generic pipeline result
 * @returns {string} Formatted generic content
 */
function formatGenericResult(result) {
  let content = "";

  if (result.summary) {
    content += `**Summary:**\n${result.summary}\n\n`;
  }

  if (result.output) {
    content += `**Output:**\n${result.output}\n\n`;
  }

  if (result.files) {
    content += formatFileReferences(result.files);
  }

  return content;
}

/**
 * Formats file references for MCP response
 * @param {Object|Array} files - File references
 * @returns {string} Formatted file references
 */
function formatFileReferences(files) {
  let content = `**Generated Files:**\n`;

  if (Array.isArray(files)) {
    files.forEach((file) => {
      content += `- ${file}\n`;
    });
  } else if (typeof files === "object") {
    Object.entries(files).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        content += `- **${key}**: ${value.length} files\n`;
        value.slice(0, 3).forEach((file) => {
          content += `  - ${file}\n`;
        });
        if (value.length > 3) {
          content += `  - ... and ${value.length - 3} more\n`;
        }
      } else {
        content += `- **${key}**: ${value}\n`;
      }
    });
  }

  return content + "\n";
}

/**
 * Generates execution information section
 * @param {Object} result - Pipeline result
 * @param {Object} context - Execution context
 * @returns {string} Formatted execution info
 */
function generateExecutionInfo(result, context) {
  let info = `**Execution Info:**\n`;
  info += `- Run ID: ${result.runId || context.requestId}\n`;
  info += `- Status: ${result.status || "completed"}\n`;

  if (result.pipeline?.statistics?.durationSeconds) {
    info += `- Duration: ${result.pipeline.statistics.durationSeconds}s\n`;
  } else if (result.executionTime) {
    info += `- Duration: ${result.executionTime}s\n`;
  }

  if (result.pipeline?.statistics?.successRate) {
    info += `- Success Rate: ${result.pipeline.statistics.successRate}%\n`;
  }

  return info;
}

/**
 * Generates debug information section
 * @param {Object} result - Pipeline result
 * @param {Object} context - Execution context
 * @returns {string} Formatted debug info
 */
function generateDebugInfo(result, context) {
  const debugInfo = {
    requestId: context.requestId,
    pipelineName: context.pipelineName,
    timestamp: context.timestamp,
    runId: result.runId,
    executionTime:
      result.executionTime || result.pipeline?.statistics?.durationSeconds,
  };

  return `\n\n**Debug Info:**\n\`\`\`json\n${JSON.stringify(
    debugInfo,
    null,
    2
  )}\n\`\`\``;
}

/**
 * Gets display name for pipeline
 * @param {string} pipelineName - Internal pipeline name
 * @returns {string} Human-readable pipeline name
 */
function getPipelineDisplayName(pipelineName) {
  const displayNames = {
    dialogue: "Dialogue Pipeline",
    facilitatedDialogue: "Facilitated Dialogue Pipeline",
    contentWaterfall: "Content Waterfall Pipeline",
    simpleChat: "Simple Chat Pipeline",
  };

  return displayNames[pipelineName] || `${pipelineName} Pipeline`;
}

/**
 * Extracts response content from various API response formats
 * @param {Object} response - API response object
 * @returns {string|null} - Extracted content or null if not found
 */
function extractResponseContent(response) {
  // Check for error first
  if (response.error) {
    return null;
  }

  // Try different response formats
  if (response.response && response.response.content) {
    return response.response.content;
  } else if (
    response.choices &&
    response.choices[0] &&
    response.choices[0].message &&
    response.choices[0].message.content
  ) {
    return response.choices[0].message.content;
  } else if (
    response.message &&
    typeof response.message === "string" &&
    response.message.length > 0
  ) {
    return response.message;
  }

  return null;
}

/**
 * Formats a pipeline result for Claude Desktop consumption
 * This is the main entry point for formatting pipeline results
 * @param {Object} result - Pipeline execution result
 * @param {Object} context - Execution context
 * @returns {Object} Formatted MCP response
 */
export function formatForMCP(result, context = {}) {
  // Handle error results
  if (!result.success || result.error) {
    return formatErrorResponse(result.error || result, context);
  }

  // Handle successful results
  return formatSuccessResponse(result.result || result, context);
}

/**
 * Creates a standardized MCP error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @param {Object} context - Execution context
 * @returns {Object} Formatted MCP error response
 */
export function createMCPError(code, message, details = null, context = {}) {
  return {
    content: [
      {
        type: "text",
        text: `❌ **Error ${code}**\n\n${message}${
          details ? `\n\n**Details**: ${JSON.stringify(details, null, 2)}` : ""
        }\n\n**Request ID**: ${context.requestId || "unknown"}`,
      },
    ],
    isError: true,
    errorCode: code,
  };
}
