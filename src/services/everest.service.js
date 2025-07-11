import fetch from "node-fetch";
import { addStepResult } from "../utils/pipelineData.js";

/**
 * Calls the Everest agent API with pipeline integration
 * @param {Object} agentConfig - The agent configuration object containing prompt, history, content, etc.
 * @param {Object} pipelineData - Pipeline data object for result aggregation
 * @param {string} stepId - Unique identifier for this pipeline step
 * @param {Function} fetchFn - Optional fetch function for testing (defaults to node-fetch)
 * @returns {Promise<Object>} - The response from the Everest API or error object
 */
async function callEverest(agentConfig, pipelineData, stepId, fetchFn = fetch) {
  const baseUrl =
    process.env.EVEREST_API_BASE || "https://api.everest.example.com";
  const apiKey = process.env.EVEREST_API || "demo-api-key";

  // Check if environment variables are properly configured
  if (!process.env.EVEREST_API_BASE || !process.env.EVEREST_API) {
    console.warn(
      `[Everest Service] Warning: Environment variables not configured. Using demo values.`
    );
    console.warn(`[Everest Service] EVEREST_API_BASE: ${baseUrl}`);
    console.warn(`[Everest Service] EVEREST_API: ${apiKey.substring(0, 8)}...`);
  }

  const url = `${baseUrl.replace(/\/$/, "")}/v2/agent`;

  console.log(`[Everest Service] Starting step ${stepId}`);
  const stepStartTime = Date.now();

  // Create step input summary for pipeline tracking
  const stepInput = {
    agentConfig: {
      model: agentConfig.model,
      chat: {
        userPrompt: agentConfig.chat?.userPrompt?.substring(0, 100) + "...",
        systemPrompt: agentConfig.chat?.systemPrompt?.substring(0, 100) + "...",
      },
    },
    stepId,
    timestamp: new Date().toISOString(),
  };

  // DEBUG: Log agent data before JSON serialization to catch escaping issues
  console.log(
    `[Everest Service] DEBUG - Step ${stepId} - Agent userPrompt preview:`,
    agentConfig.chat?.userPrompt?.substring(0, 200) + "..."
  );
  console.log(
    `[Everest Service] DEBUG - Step ${stepId} - Agent userPrompt contains backslash:`,
    agentConfig.chat?.userPrompt?.includes("\\")
  );

  let requestBody;
  try {
    requestBody = JSON.stringify(agentConfig);
    console.log(
      `[Everest Service] DEBUG - Step ${stepId} - JSON serialization successful`
    );
  } catch (jsonError) {
    console.error(
      `[Everest Service] DEBUG - Step ${stepId} - JSON serialization failed:`,
      jsonError
    );
    const errorResult = {
      error: `JSON serialization error: ${jsonError.message}`,
      stepId,
      timestamp: new Date().toISOString(),
    };

    // Add failed step to pipeline data
    const executionTime = Date.now() - stepStartTime;
    addStepResult(
      pipelineData,
      stepId,
      "agent_call",
      stepInput,
      errorResult,
      "failed",
      null,
      { executionTime }
    );

    console.error(`[Everest Service] Step ${stepId} failed:`, jsonError);
    return errorResult;
  }

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorResult = {
        error: `Everest API error: ${response.status} ${response.statusText} - ${errorText}`,
        stepId,
        timestamp: new Date().toISOString(),
      };

      // Add failed step to pipeline data
      const executionTime = Date.now() - stepStartTime;
      addStepResult(
        pipelineData,
        stepId,
        "agent_call",
        stepInput,
        errorResult,
        "failed",
        null,
        { executionTime }
      );

      console.error(
        `[Everest Service] Step ${stepId} API error:`,
        errorResult.error
      );
      return errorResult;
    }

    const apiResponse = await response.json();

    // Add successful step to pipeline data
    const executionTime = Date.now() - stepStartTime;
    addStepResult(
      pipelineData,
      stepId,
      "agent_call",
      stepInput,
      apiResponse,
      "completed",
      null,
      { executionTime }
    );

    // Debug logging
    console.log(
      `[Everest Service] Step ${stepId} - API Response:`,
      JSON.stringify(apiResponse, null, 2)
    );

    console.log(`[Everest Service] Step ${stepId} completed successfully`);

    return apiResponse;
  } catch (error) {
    const errorResult = {
      error: `Network or processing error: ${error.message}`,
      stepId,
      timestamp: new Date().toISOString(),
    };

    // Add failed step to pipeline data
    const executionTime = Date.now() - stepStartTime;
    addStepResult(
      pipelineData,
      stepId,
      "agent_call",
      stepInput,
      errorResult,
      "failed",
      null,
      { executionTime }
    );

    console.error(`[Everest Service] Step ${stepId} failed:`, error);
    return errorResult;
  }
}

export { callEverest };
