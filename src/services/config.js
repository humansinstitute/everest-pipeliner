import dotenv from "dotenv";
<<<<<<< HEAD
import {
  convertPrivateKey,
  convertPublicKeys,
  validateKeyFormat,
} from "../utils/keyConversion.js";
=======
>>>>>>> 855d7527ea2fc900418c1ca7a658dfba57f80bbb

// Load environment variables
dotenv.config();

export function loadConfig() {
<<<<<<< HEAD
  // Convert and set the private key for nostrmq library compatibility
  const privateKey = convertPrivateKeyFromEnv(process.env.NOSTRMQ_PRIVKEY);

  // Set NOSTR_PRIVKEY for nostrmq library if we have a converted private key
  if (privateKey && !process.env.NOSTR_PRIVKEY) {
    process.env.NOSTR_PRIVKEY = privateKey;
  }

=======
>>>>>>> 855d7527ea2fc900418c1ca7a658dfba57f80bbb
  const config = {
    // Existing configuration (if any)

    // NostrMQ Configuration (using published API env vars)
<<<<<<< HEAD
    privateKey: privateKey,
=======
    privateKey: process.env.NOSTRMQ_PRIVKEY,
>>>>>>> 855d7527ea2fc900418c1ca7a658dfba57f80bbb
    relays: parseRelays(process.env.NOSTRMQ_RELAYS),
    powDifficulty: parseInt(process.env.NOSTRMQ_POW_DIFFICULTY) || 0,
    powThreads: parseInt(process.env.NOSTRMQ_POW_THREADS) || 4,

    // Pipeliner-specific NostrMQ configuration
<<<<<<< HEAD
    authorizedPubkeys: convertPublicKeysFromEnv(
      process.env.NOSTRMQ_AUTHORIZED_PUBKEYS
    ),
=======
    authorizedPubkeys: process.env.NOSTRMQ_AUTHORIZED_PUBKEYS,
>>>>>>> 855d7527ea2fc900418c1ca7a658dfba57f80bbb
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

<<<<<<< HEAD
function convertPrivateKeyFromEnv(envKey) {
  if (!envKey) {
    return null;
  }

  try {
    return convertPrivateKey(envKey);
  } catch (error) {
    console.warn(
      `⚠️  Warning: Failed to convert private key: ${error.message}`
    );
    console.warn(
      `💡 Tip: Ensure your NOSTRMQ_PRIVKEY is either nsec1... or 64-character hex format`
    );
    return null;
  }
}

function convertPublicKeysFromEnv(envKeys) {
  if (!envKeys) {
    return null;
  }

  try {
    return convertPublicKeys(envKeys);
  } catch (error) {
    console.warn(
      `⚠️  Warning: Failed to convert public keys: ${error.message}`
    );
    console.warn(
      `💡 Tip: Ensure your NOSTRMQ_AUTHORIZED_PUBKEYS are either npub1... or 64-character hex format`
    );
    return null;
  }
}

=======
>>>>>>> 855d7527ea2fc900418c1ca7a658dfba57f80bbb
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
