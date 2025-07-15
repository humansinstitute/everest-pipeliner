export function validatePipelineRequest(payload) {
  const errors = [];

  // Basic structure validation
  if (!payload || typeof payload !== "object") {
    errors.push("Request payload must be an object");
    return { isValid: false, errors };
  }

  // Required fields
  if (!payload.type || payload.type !== "pipeline-trigger") {
    errors.push('Request type must be "pipeline-trigger"');
  }

  if (!payload.pipeline || typeof payload.pipeline !== "string") {
    errors.push("Pipeline name is required and must be a string");
  }

  if (!payload.parameters || typeof payload.parameters !== "object") {
    errors.push("Parameters object is required");
  }

  // Optional fields validation
  if (payload.requestId && typeof payload.requestId !== "string") {
    errors.push("RequestId must be a string if provided");
  }

  if (payload.options && typeof payload.options !== "object") {
    errors.push("Options must be an object if provided");
  }

  // Security validation
  if (payload.pipeline && !isValidPipelineName(payload.pipeline)) {
    errors.push("Invalid pipeline name format");
  }

  // Parameter size limits
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 100000) {
    // 100KB limit
    errors.push("Request payload too large (max 100KB)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidPipelineName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 50;
}

export function validatePipelineResponse(payload) {
  const errors = [];

  if (
    !payload.type ||
    !["pipeline-ack", "pipeline-result"].includes(payload.type)
  ) {
    errors.push("Invalid response type");
  }

  if (!payload.requestId) {
    errors.push("RequestId is required");
  }

  if (!payload.timestamp) {
    errors.push("Timestamp is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
