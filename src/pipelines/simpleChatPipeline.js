import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { callEverest } from "../services/everest.service.js";
import { loadAgent } from "../services/agentLoader.service.js";
import { createPipelineData, completePipeline } from "../utils/pipelineData.js";

// Load environment variables
dotenv.config();

/**
 * Simple chat pipeline that requests a poem about penguins
 * This demonstrates the complete callEverest integration with agent loading and pipeline data flow
 * @param {string} customMessage - Optional custom message, defaults to penguin poem request
 * @returns {Promise<Object>} - Complete pipeline data with results
 */
async function simpleChatPipeline(customMessage = null) {
  const pipelineData = createPipelineData();

  console.error(`[SimpleChatPipeline] Starting pipeline ${pipelineData.runId}`);
  console.error(
    `[SimpleChatPipeline] Pipeline start time: ${pipelineData.startTime}`
  );

  try {
    // Step 1: Load conversation agent
    console.error("[SimpleChatPipeline] Step 1: Loading conversationAgent...");
    const conversationAgent = await loadAgent("conversationAgent");
    console.error(
      "[SimpleChatPipeline] ✅ ConversationAgent loaded successfully"
    );

    // Step 2: Configure agent for penguin poem request
    const message = customMessage || "Please write me a poem about penguins";
    const context =
      "User is requesting creative content about Antarctic birds. Please write a creative and engaging poem.";
    const history = [];

    console.error(
      "[SimpleChatPipeline] Step 2: Configuring agent for request..."
    );
    console.error(`[SimpleChatPipeline] Message: ${message}`);
    console.error(`[SimpleChatPipeline] Context: ${context}`);

    const agentConfig = await conversationAgent(message, context, history);
    console.error("[SimpleChatPipeline] ✅ Agent configuration created");
    console.error(`[SimpleChatPipeline] Agent callID: ${agentConfig.callID}`);

    // Step 3: Call Everest API
    console.error("[SimpleChatPipeline] Step 3: Calling Everest API...");
    const response = await callEverest(
      agentConfig,
      pipelineData,
      "penguin_poem_step"
    );

    // Check if the response contains an error
    if (response.error) {
      console.error(
        "[SimpleChatPipeline] ❌ Everest API call failed:",
        response.error
      );
      completePipeline(pipelineData, "failed");
    } else {
      console.error("[SimpleChatPipeline] ✅ Everest API call successful");
      console.error(`[SimpleChatPipeline] Response callID: ${response.callID}`);

      // Extract and display the poem if available
      if (response.response && response.response.content) {
        console.log("\n🐧 PENGUIN POEM RESULT:");
        console.log("=".repeat(50));
        console.log(response.response.content);
        console.log("=".repeat(50));
      } else if (
        response.choices &&
        response.choices[0] &&
        response.choices[0].message
      ) {
        console.log("\n🐧 PENGUIN POEM RESULT:");
        console.log("=".repeat(50));
        console.log(response.choices[0].message.content);
        console.log("=".repeat(50));
      } else if (response.message && response.message.length > 0) {
        console.log("\n🐧 PENGUIN POEM RESULT:");
        console.log("=".repeat(50));
        console.log(response.message);
        console.log("=".repeat(50));
      } else {
        console.log(
          "[SimpleChatPipeline] ⚠️ Response received but poem content not found in expected format"
        );
        console.log(
          "[SimpleChatPipeline] Raw response structure:",
          Object.keys(response)
        );
      }

      completePipeline(pipelineData, "completed");
    }

    // Display pipeline summary
    console.log(`\n[SimpleChatPipeline] 📊 PIPELINE SUMMARY:`);
    console.log(`Pipeline ID: ${pipelineData.runId}`);
    console.log(`Status: ${pipelineData.status}`);
    console.log(
      `Duration: ${
        pipelineData.statistics?.durationSeconds || "calculating..."
      }s`
    );
    console.log(
      `Steps completed: ${pipelineData.statistics?.completedSteps || 0}/${
        pipelineData.statistics?.totalSteps || 0
      }`
    );
    console.log(`Success rate: ${pipelineData.statistics?.successRate || 0}%`);

    return pipelineData;
  } catch (error) {
    console.error(
      `[SimpleChatPipeline] ❌ Pipeline ${pipelineData.runId} failed with error:`,
      error
    );
    completePipeline(pipelineData, "failed");

    // Add error details to pipeline for debugging
    pipelineData.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    return pipelineData;
  }
}

/**
 * Validates the pipeline result to ensure it meets success criteria
 * @param {Object} pipelineData - Pipeline data to validate
 * @returns {Object} - Validation result with success boolean and details
 */
function validatePipelineResult(pipelineData) {
  const validation = {
    success: false,
    details: {
      pipelineCompleted: false,
      hasSteps: false,
      hasOutputs: false,
      everestResponseReceived: false,
      poemGenerated: false,
    },
    errors: [],
  };

  // Check if pipeline completed
  if (pipelineData.status === "completed") {
    validation.details.pipelineCompleted = true;
  } else {
    validation.errors.push(
      `Pipeline status is ${pipelineData.status}, expected 'completed'`
    );
  }

  // Check if steps were recorded
  if (pipelineData.steps && pipelineData.steps.length > 0) {
    validation.details.hasSteps = true;
  } else {
    validation.errors.push("No pipeline steps recorded");
  }

  // Check if outputs were generated
  if (pipelineData.outputs && pipelineData.outputs.length > 0) {
    validation.details.hasOutputs = true;
  } else {
    validation.errors.push("No pipeline outputs generated");
  }

  // Check if Everest response was received
  const everestStep = pipelineData.steps.find(
    (step) => step.stepId === "penguin_poem_step"
  );
  if (
    everestStep &&
    everestStep.status === "completed" &&
    everestStep.output &&
    !everestStep.output.error
  ) {
    validation.details.everestResponseReceived = true;

    // Check if poem content exists
    const output = everestStep.output;
    if (
      (output.response && output.response.content) ||
      (output.choices && output.choices[0] && output.choices[0].message) ||
      (output.message && output.message.length > 0)
    ) {
      validation.details.poemGenerated = true;
    } else {
      validation.errors.push(
        "Everest response received but no poem content found"
      );
    }
  } else {
    validation.errors.push("Everest API call did not complete successfully");
  }

  // Overall success if all key criteria are met
  validation.success =
    validation.details.pipelineCompleted &&
    validation.details.hasSteps &&
    validation.details.everestResponseReceived;

  return validation;
}

// ES Module main detection for direct execution
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log("🚀 Running Simple Chat Pipeline directly...\n");

  simpleChatPipeline()
    .then((result) => {
      console.log("\n📋 FINAL PIPELINE DATA:");
      console.log(JSON.stringify(result, null, 2));

      const validation = validatePipelineResult(result);
      console.log("\n✅ VALIDATION RESULT:");
      console.log(`Success: ${validation.success}`);
      console.log("Details:", validation.details);
      if (validation.errors.length > 0) {
        console.log("Errors:", validation.errors);
      }

      process.exit(validation.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Pipeline execution failed:", error);
      process.exit(1);
    });
}

// Universal Pipeline Interface Implementation
export const pipelineInfo = {
  name: "simpleChat",
  description:
    "Simple chat pipeline for basic conversational interactions and content generation requests",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Message or query for the chat pipeline",
        minLength: 1,
      },
      context: {
        type: "string",
        description: "Additional context for the conversation",
      },
    },
    required: ["message"],
  },
  interfaces: ["mcp", "nostrmq", "cli"],
};

/**
 * Executes simple chat pipeline via MCP interface
 * @param {Object} parameters - Pipeline parameters
 * @param {Object} logger - MCP logger instance
 * @returns {Promise<Object>} Formatted result for MCP consumption
 */
export async function executeViaMCP(parameters, logger) {
  logger.info("MCP simple chat execution started", { parameters });

  try {
    const result = await simpleChatPipeline(parameters.message);

    logger.info("MCP simple chat execution completed", {
      success: result.status === "completed",
      runId: result.runId,
    });

    // Extract the response content from pipeline steps
    let responseContent = null;
    if (result.steps && result.steps.length > 0) {
      const chatStep = result.steps.find(
        (step) =>
          step.stepId.includes("chat") ||
          step.stepId.includes("poem") ||
          step.stepId.includes("penguin")
      );
      if (chatStep && chatStep.output) {
        responseContent = extractResponseContent(chatStep.output);
      }
    }

    // Format for MCP consumption
    return {
      success: result.status === "completed",
      result: {
        runId: result.runId,
        status: result.status,
        summary: responseContent
          ? `Chat response generated successfully`
          : "Chat response completed",
        response: responseContent || "No response content available",
        executionTime: result.statistics?.durationSeconds,
        stepsCompleted: result.statistics?.completedSteps || 0,
        successRate: result.statistics?.successRate || 0,
      },
      error: result.error,
    };
  } catch (error) {
    logger.error("MCP simple chat execution failed", error);
    return {
      success: false,
      error: {
        message: error.message,
        type: "execution_error",
      },
    };
  }
}

/**
 * Executes simple chat pipeline via NostrMQ interface (stub for future implementation)
 * @param {Object} parameters - Pipeline parameters
 * @param {Object} jobLogger - NostrMQ job logger instance
 * @returns {Promise<Object>} Result for NostrMQ consumption
 */
export async function executeViaNostrMQ(parameters, jobLogger) {
  jobLogger.info("NostrMQ simple chat execution started", { parameters });

  // For now, delegate to the main pipeline function
  // Future implementation will add NostrMQ-specific handling
  const result = await simpleChatPipeline(parameters.message);

  jobLogger.info("NostrMQ simple chat execution completed", {
    success: result.status === "completed",
    runId: result.runId,
  });

  return result;
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

export { simpleChatPipeline, validatePipelineResult };
