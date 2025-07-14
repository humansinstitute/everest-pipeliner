export function createLogger(serviceName) {
  const logger = {
    info: (message, context = {}) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${serviceName}] INFO: ${message}`, context);
    },

    warn: (message, context = {}) => {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [${serviceName}] WARN: ${message}`, context);
    },

    error: (message, context = {}) => {
      const timestamp = new Date().toISOString();
      console.error(
        `[${timestamp}] [${serviceName}] ERROR: ${message}`,
        context
      );
    },

    debug: (message, context = {}) => {
      const timestamp = new Date().toISOString();
      console.debug(
        `[${timestamp}] [${serviceName}] DEBUG: ${message}`,
        context
      );
    },
  };

  return logger;
}
