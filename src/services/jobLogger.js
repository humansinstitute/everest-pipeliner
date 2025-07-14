import { createLogger } from "./logger.js";

export function createJobLogger(jobId) {
  const baseLogger = createLogger(`job-${jobId}`);

  // Enhanced job logger with job-specific context
  const jobLogger = {
    info: (message, context = {}) => {
      baseLogger.info(message, { jobId, ...context });
    },

    warn: (message, context = {}) => {
      baseLogger.warn(message, { jobId, ...context });
    },

    error: (message, context = {}) => {
      baseLogger.error(message, { jobId, ...context });
    },

    debug: (message, context = {}) => {
      baseLogger.debug(message, { jobId, ...context });
    },
  };

  return jobLogger;
}
