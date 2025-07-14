import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export function loadConfig() {
  const config = {
    // Existing configuration (if any)

    // NostrMQ Configuration (using published API env vars)
    privateKey: process.env.NOSTRMQ_PRIVKEY,
    relays: parseRelays(process.env.NOSTRMQ_RELAYS),
    powDifficulty: parseInt(process.env.NOSTRMQ_POW_DIFFICULTY) || 0,
    powThreads: parseInt(process.env.NOSTRMQ_POW_THREADS) || 4,

    // Pipeliner-specific NostrMQ configuration
    authorizedPubkeys: process.env.NOSTRMQ_AUTHORIZED_PUBKEYS,
    maxConcurrentJobs: parseInt(process.env.NOSTRMQ_MAX_CONCURRENT_JOBS) || 3,
    jobTimeout: parseInt(process.env.NOSTRMQ_JOB_TIMEOUT) || 300000,
    sendRetries: parseInt(process.env.NOSTRMQ_SEND_RETRIES) || 3,
    sendTimeout: parseInt(process.env.NOSTRMQ_SEND_TIMEOUT) || 10000,
    logLevel: process.env.NOSTRMQ_LOG_LEVEL || "info",
    jobLogRetentionDays: parseInt(process.env.NOSTRMQ_JOB_LOG_RETENTION) || 30,
  };

  // Add NostrMQ validation if attempting to start NostrMQ service
  if (
    process.argv.includes("--nostrmq") ||
    process.env.QUEUE_TYPE === "nostrmq"
  ) {
    validateNostrMQConfig(config);
  }

  return config;
}

function parseRelays(relaysString) {
  if (!relaysString) {
    // Use defaults if not specified
    return [
      "wss://relay.damus.io",
      "wss://relay.snort.social",
      "wss://nos.lol",
    ];
  }

  try {
    if (relaysString.startsWith("[")) {
      return JSON.parse(relaysString);
    } else {
      return relaysString.split(",").map((relay) => relay.trim());
    }
  } catch (error) {
    throw new Error("Invalid NOSTRMQ_RELAYS format");
  }
}

function validateNostrMQConfig(config) {
  const errors = [];

  if (!config.privateKey) {
    errors.push("NOSTRMQ_PRIVKEY is required for NostrMQ service");
  }

  if (!config.relays || config.relays.length === 0) {
    errors.push("NOSTRMQ_RELAYS must contain at least one relay");
  }

  if (!config.authorizedPubkeys) {
    errors.push("NOSTRMQ_AUTHORIZED_PUBKEYS is required for NostrMQ service");
  }

  if (errors.length > 0) {
    throw new Error(
      "NostrMQ configuration validation failed:\n" + errors.join("\n")
    );
  }
}
