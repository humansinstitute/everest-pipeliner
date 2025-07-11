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

  console.log(`[SimpleChatPipeline] Starting pipeline ${pipelineData.runId}`);
  console.log(
    `[SimpleChatPipeline] Pipeline start time: ${pipelineData.startTime}`
  );

  try {
    // Step 1: Load conversation agent
    console.log("[SimpleChatPipeline] Step 1: Loading conversationAgent...");
    const conversationAgent = await loadAgent("conversationAgent");
    console.log(
      "[SimpleChatPipeline] ✅ ConversationAgent loaded successfully"
    );

    // Step 2: Configure agent for penguin poem request
    const message = customMessage || "Please write me a poem about penguins";
    const context =
      "User is requesting creative content about Antarctic birds. Please write a creative and engaging poem.";
    const history = [];

    console.log(
      "[SimpleChatPipeline] Step 2: Configuring agent for request..."
    );
    console.log(`[SimpleChatPipeline] Message: ${message}`);
    console.log(`[SimpleChatPipeline] Context: ${context}`);

    const agentConfig = await conversationAgent(message, context, history);
    console.log("[SimpleChatPipeline] ✅ Agent configuration created");
    console.log(`[SimpleChatPipeline] Agent callID: ${agentConfig.callID}`);

    // Step 3: Call Everest API
    console.log("[SimpleChatPipeline] Step 3: Calling Everest API...");
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
      console.log("[SimpleChatPipeline] ✅ Everest API call successful");
      console.log(`[SimpleChatPipeline] Response callID: ${response.callID}`);

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

export { simpleChatPipeline, validatePipelineResult };
