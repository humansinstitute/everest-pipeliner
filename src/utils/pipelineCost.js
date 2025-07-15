/**
 * Pipeline Cost Tracking Utilities
 *
 * This module provides utilities for tracking and managing costs across pipeline executions.
 * It handles cost data extraction from Everest API responses, cost accumulation, and formatting
 * for display purposes.
 *
 * @module pipelineCost
 */

/**
 * Extracts cost data from an Everest API response
 *
 * @param {Object} apiResponse - The API response object from Everest service
 * @returns {Object|null} Cost data object or null for backwards compatibility
 *
 * @example
 * // Enhanced response with usage field
 * const response = {
 *   "callID": "1234",
 *   "billingID": "bill-1111",
 *   "message": "...",
 *   "usage": {
 *     "prompt_tokens": 23,
 *     "completion_tokens": 414,
 *     "total_tokens": 437,
 *     "cost": 0.00621621,
 *     "model": "anthropic/claude-sonnet-4"
 *   }
 * };
 *
 * const costData = extractCostData(response);
 * // Returns: {
 * //   cost: 0.00621621,
 * //   tokensIn: 23,
 * //   tokensOut: 414,
 * //   totalTokens: 437,
 * //   model: "anthropic/claude-sonnet-4",
 * //   callID: "1234",
 * //   billingID: "bill-1111"
 * // }
 */
function extractCostData(apiResponse) {
  // Handle null/undefined gracefully
  if (!apiResponse) {
    console.log("[PipelineCost] No API response provided");
    return null;
  }

  // Check if response has usage field (enhanced API response)
  if (!apiResponse.usage) {
    // TODO: Remove backwards compatibility check when all models return cost data
    console.log(
      "[PipelineCost] No usage field in API response - backwards compatibility mode"
    );
    return null;
  }

  const usage = apiResponse.usage;

  // Extract cost data from usage field
  const costData = {
    cost: usage.cost || 0,
    tokensIn: usage.prompt_tokens || 0,
    tokensOut: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    model: usage.model || "unknown",
    callID: apiResponse.callID || "unknown",
    billingID: apiResponse.billingID || "unknown",
  };

  console.error(
    `[PipelineCost] Extracted cost data: $${costData.cost}, tokens: ${costData.totalTokens}`
  );
  return costData;
}

/**
 * Initializes the cost tracking structure in pipeline data
 *
 * @param {Object} pipelineData - The pipeline data object to initialize
 *
 * @example
 * const pipelineData = { runId: "uuid", steps: [], outputs: [] };
 * initializePipelineCosts(pipelineData);
 * // pipelineData.costs is now initialized with zero values
 */
function initializePipelineCosts(pipelineData) {
  if (!pipelineData) {
    console.error(
      "[PipelineCost] No pipeline data provided for initialization"
    );
    return;
  }

  // Initialize cost structure
  pipelineData.costs = {
    totalCost: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalTokens: 0,
    stepCosts: [],
  };

  console.error(
    `[PipelineCost] Initialized cost tracking for pipeline: ${pipelineData.runId}`
  );
}

/**
 * Adds and accumulates step costs to the pipeline data
 *
 * @param {Object} pipelineData - The pipeline data object
 * @param {string} stepId - Unique identifier for the pipeline step
 * @param {Object} apiResponse - The API response containing cost data
 *
 * @example
 * addStepCost(pipelineData, "agent1_initial", apiResponse);
 * // Accumulates costs and adds step details to pipelineData.costs
 */
function addStepCost(pipelineData, stepId, apiResponse) {
  if (!pipelineData || !stepId) {
    console.error("[PipelineCost] Missing pipeline data or step ID");
    return;
  }

  // Ensure costs structure exists
  if (!pipelineData.costs) {
    initializePipelineCosts(pipelineData);
  }

  // Extract cost data from API response
  const costData = extractCostData(apiResponse);

  // Handle backwards compatibility - no cost data available
  if (!costData) {
    console.error(`[PipelineCost] No cost data available for step ${stepId}`);
    return;
  }

  // Accumulate costs
  pipelineData.costs.totalCost += costData.cost;
  pipelineData.costs.totalTokensIn += costData.tokensIn;
  pipelineData.costs.totalTokensOut += costData.tokensOut;
  pipelineData.costs.totalTokens += costData.totalTokens;

  // Add step details to stepCosts array
  const stepCostEntry = {
    stepId: stepId,
    callID: costData.callID,
    billingID: costData.billingID,
    cost: costData.cost,
    tokensIn: costData.tokensIn,
    tokensOut: costData.tokensOut,
    model: costData.model,
    timestamp: new Date().toISOString(),
  };

  pipelineData.costs.stepCosts.push(stepCostEntry);

  console.error(
    `[PipelineCost] Added step cost for ${stepId}: $${costData.cost}, total pipeline cost: $${pipelineData.costs.totalCost}`
  );
}

/**
 * Formats cost summary for display with exact formatting requirements
 *
 * @param {Object} pipelineData - The pipeline data object containing costs
 * @returns {string} Formatted cost summary string
 *
 * @example
 * const summary = formatCostSummary(pipelineData);
 * console.log(summary);
 * // Output:
 * // Total Cost USD $ 0.0062
 * // TotalTokens In: 23
 * // TotalTokens Out: 414
 */
function formatCostSummary(pipelineData) {
  if (!pipelineData || !pipelineData.costs) {
    console.error("[PipelineCost] No cost data available for formatting");
    return "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0";
  }

  const costs = pipelineData.costs;

  // Handle edge cases - ensure we have valid numbers
  const totalCost = typeof costs.totalCost === "number" ? costs.totalCost : 0;
  const totalTokensIn =
    typeof costs.totalTokensIn === "number" ? costs.totalTokensIn : 0;
  const totalTokensOut =
    typeof costs.totalTokensOut === "number" ? costs.totalTokensOut : 0;

  // Format with exact requirements:
  // - USD: 4 decimal places using toFixed(4) - ensures "0.0000" for zero costs
  // - Tokens: integers only (no decimals)
  const formattedSummary = [
    `Total Cost USD $ ${totalCost.toFixed(4)}`,
    `TotalTokens In: ${totalTokensIn}`,
    `TotalTokens Out: ${totalTokensOut}`,
  ].join("\n");

  return formattedSummary;
}

/**
 * Generates detailed cost breakdown for debugging and reporting
 *
 * @param {Object} pipelineData - The pipeline data object containing costs
 * @returns {Object} Detailed cost breakdown object
 *
 * @example
 * const breakdown = generateCostBreakdown(pipelineData);
 * // Returns: {
 * //   hasCostData: true,
 * //   summary: "Total Cost USD $ 0.0062\nTotalTokens In: 23\nTotalTokens Out: 414",
 * //   stepDetails: [
 * //     {
 * //       stepId: "agent1_initial",
 * //       cost: 0.0031,
 * //       tokensIn: 12,
 * //       tokensOut: 207,
 * //       model: "anthropic/claude-sonnet-4"
 * //     }
 * //   ]
 * // }
 */
function generateCostBreakdown(pipelineData) {
  // Handle null/undefined gracefully
  if (!pipelineData) {
    return {
      hasCostData: false,
      summary: "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0",
      stepDetails: [],
    };
  }

  // Check if cost data exists
  if (!pipelineData.costs) {
    return {
      hasCostData: false,
      summary: "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0",
      stepDetails: [],
    };
  }

  const costs = pipelineData.costs;
  const hasCostData = costs.stepCosts && costs.stepCosts.length > 0;

  // Generate summary using existing formatCostSummary function
  const summary = formatCostSummary(pipelineData);

  // Generate step-by-step breakdown
  const stepDetails = [];
  if (costs.stepCosts && Array.isArray(costs.stepCosts)) {
    for (const step of costs.stepCosts) {
      stepDetails.push({
        stepId: step.stepId || "unknown",
        cost: typeof step.cost === "number" ? step.cost : 0,
        tokensIn: typeof step.tokensIn === "number" ? step.tokensIn : 0,
        tokensOut: typeof step.tokensOut === "number" ? step.tokensOut : 0,
        model: step.model || "unknown",
        callID: step.callID || "unknown",
        billingID: step.billingID || "unknown",
        timestamp: step.timestamp || "unknown",
      });
    }
  }

  return {
    hasCostData,
    summary,
    stepDetails,
  };
}

// Export all functions using ES module syntax
export {
  extractCostData,
  initializePipelineCosts,
  addStepCost,
  formatCostSummary,
  generateCostBreakdown,
};
