import { v4 as uuidv4 } from "uuid";
import { initializePipelineCosts, formatCostSummary } from "./pipelineCost.js";

/**
 * Creates a new pipeline data object
 * @param {string} runId - Optional run ID, generates UUID if not provided
 * @returns {Object} - Pipeline data object
 */
function createPipelineData(runId = null) {
  const pipelineData = {
    runId: runId || uuidv4(),
    steps: [],
    outputs: [],
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {
      version: "1.0.0",
      created: new Date().toISOString(),
    },
  };

  initializePipelineCosts(pipelineData);

  console.error(`[PipelineData] Created new pipeline: ${pipelineData.runId}`);
  return pipelineData;
}

/**
 * Adds a step result to pipeline data
 * @param {Object} pipelineData - Pipeline data object
 * @param {string} stepId - Unique step identifier
 * @param {string} type - Step type (e.g., 'agent_call', 'data_transform', 'validation')
 * @param {Object} input - Step input data
 * @param {Object} output - Step output data
 * @param {string} status - Step status ('completed', 'failed', 'skipped')
 * @param {string} agentName - Name of agent used (optional)
 * @param {Object} metadata - Additional step metadata (optional)
 */
function addStepResult(
  pipelineData,
  stepId,
  type,
  input,
  output,
  status,
  agentName = null,
  metadata = {}
) {
  const stepResult = {
    stepId,
    type,
    agentName,
    input,
    output,
    timestamp: new Date().toISOString(),
    status,
    metadata: {
      ...metadata,
      executionTime:
        metadata.executionTime !== undefined ? metadata.executionTime : null,
      retryCount: metadata.retryCount || 0,
    },
  };

  pipelineData.steps.push(stepResult);

  // Add successful outputs to the outputs array for easy access
  if (status === "completed" && output && !output.error) {
    pipelineData.outputs.push({
      stepId,
      agentName,
      data: output,
      timestamp: stepResult.timestamp,
    });
  }

  console.error(`[PipelineData] Added step ${stepId} with status: ${status}`);
  return stepResult;
}

/**
 * Marks pipeline as completed and calculates final metrics
 * @param {Object} pipelineData - Pipeline data object
 * @param {string} status - Final status ('completed', 'failed', 'partial')
 */
function completePipeline(pipelineData, status = "completed") {
  pipelineData.status = status;
  pipelineData.endTime = new Date().toISOString();

  // Calculate duration in milliseconds
  const startTime = new Date(pipelineData.startTime);
  const endTime = new Date(pipelineData.endTime);
  pipelineData.duration = endTime - startTime;

  // Calculate step statistics
  const totalSteps = pipelineData.steps.length;
  const completedSteps = pipelineData.steps.filter(
    (step) => step.status === "completed"
  ).length;
  const failedSteps = pipelineData.steps.filter(
    (step) => step.status === "failed"
  ).length;
  const skippedSteps = pipelineData.steps.filter(
    (step) => step.status === "skipped"
  ).length;

  pipelineData.statistics = {
    totalSteps,
    completedSteps,
    failedSteps,
    skippedSteps,
    successRate:
      totalSteps > 0
        ? Math.round((completedSteps / totalSteps) * 100 * 100) / 100
        : 0,
    durationMs: pipelineData.duration,
    durationSeconds: Math.round((pipelineData.duration / 1000) * 100) / 100,
  };

  console.error(
    `[PipelineData] Pipeline ${pipelineData.runId} completed with status: ${status}`
  );
  console.error(`[PipelineData] Statistics:`, pipelineData.statistics);
  console.error(`[PipelineData] Cost Summary:`);
  console.error(formatCostSummary(pipelineData));
}

/**
 * Gets the latest output from the pipeline
 * @param {Object} pipelineData - Pipeline data object
 * @returns {Object|null} - Latest output or null if no outputs
 */
function getLatestOutput(pipelineData) {
  if (pipelineData.outputs.length === 0) {
    return null;
  }
  return pipelineData.outputs[pipelineData.outputs.length - 1];
}

/**
 * Gets outputs from a specific step
 * @param {Object} pipelineData - Pipeline data object
 * @param {string} stepId - Step ID to get outputs for
 * @returns {Object|null} - Step output or null if not found
 */
function getStepOutput(pipelineData, stepId) {
  const step = pipelineData.steps.find((s) => s.stepId === stepId);
  return step ? step.output : null;
}

/**
 * Gets all outputs from steps that used a specific agent
 * @param {Object} pipelineData - Pipeline data object
 * @param {string} agentName - Agent name to filter by
 * @returns {Array} - Array of outputs from the specified agent
 */
function getOutputsByAgent(pipelineData, agentName) {
  return pipelineData.outputs.filter(
    (output) => output.agentName === agentName
  );
}

/**
 * Validates pipeline data structure
 * @param {Object} pipelineData - Pipeline data object to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
function validatePipelineData(pipelineData) {
  const errors = [];

  if (!pipelineData.runId) {
    errors.push("Missing runId");
  }

  if (!Array.isArray(pipelineData.steps)) {
    errors.push("Steps must be an array");
  }

  if (!Array.isArray(pipelineData.outputs)) {
    errors.push("Outputs must be an array");
  }

  if (!pipelineData.startTime) {
    errors.push("Missing startTime");
  }

  if (
    !["running", "completed", "failed", "partial"].includes(pipelineData.status)
  ) {
    errors.push("Invalid status");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export {
  createPipelineData,
  addStepResult,
  completePipeline,
  getLatestOutput,
  getStepOutput,
  getOutputsByAgent,
  validatePipelineData,
};
