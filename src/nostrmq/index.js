import { send, receive } from "nostrmq";
import { AuthValidator } from "./authValidator.js";
import { MessageHandler } from "./messageHandler.js";
import { JobManager } from "./jobManager.js";
import { loadConfig } from "../services/config.js";
import { createLogger } from "../services/logger.js";

export class NostrMQPipelineService {
  constructor() {
    this.config = null;
    this.subscription = null;
    this.logger = null;
    this.isRunning = false;
    this.authValidator = null;
    this.messageHandler = null;
    this.jobManager = null;
  }

  async initialize() {
    this.logger = createLogger("nostrmq-service");
    this.config = loadConfig();

    // Validate configuration
    this.validateConfiguration();

    // Initialize components
    this.authValidator = new AuthValidator(this.config, this.logger);
    this.messageHandler = new MessageHandler(this.config, this.logger);
    this.jobManager = new JobManager(this.config, this.logger);

    // Set up component relationships
    this.messageHandler.setAuthValidator(this.authValidator);
    this.messageHandler.setJobManager(this.jobManager);
    this.jobManager.setMessageHandler(this.messageHandler);

    this.logger.info("NostrMQ Pipeline Service initialized", {
      authorizedPubkeys: this.config.authorizedPubkeys?.length || 0,
      relays: this.config.relays?.length || 0,
    });
  }

  async start() {
    if (this.isRunning) {
      throw new Error("Service already running");
    }

    // Start NostrMQ subscription using published API
    this.subscription = receive({
      relays: this.config.relays,
      onMessage: async (payload, sender, rawEvent) => {
        await this.messageHandler.handleMessage(payload, sender, rawEvent);
      },
    });

    // Start job manager
    await this.jobManager.start();

    this.isRunning = true;
    this.logger.info("NostrMQ Pipeline Service started", {
      relays: this.config.relays,
      listening: true,
    });
  }

  async stop() {
    if (!this.isRunning) return;

    this.logger.info("Stopping NostrMQ Pipeline Service");

    // Stop subscription
    if (this.subscription) {
      this.subscription.close();
    }

    // Stop job manager
    await this.jobManager.stop();

    this.isRunning = false;
    this.logger.info("NostrMQ Pipeline Service stopped");
  }

  validateConfiguration() {
    const required = ["authorizedPubkeys", "relays", "privateKey"];
    for (const field of required) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }

  // Utility method for sending responses
  async sendResponse(target, payload) {
    const eventId = await send({
      target,
      payload,
      relays: this.config.relays,
      pow: this.config.powDifficulty || 0,
      timeoutMs: this.config.sendTimeout || 10000,
    });

    this.logger.info("Response sent", {
      target: target.substring(0, 8),
      eventId,
      type: payload.type,
    });

    return eventId;
  }
}

// Export service startup function for CLI integration
export async function startNostrMQService() {
  const service = new NostrMQPipelineService();

  try {
    await service.initialize();
    await service.start();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nReceived SIGINT, shutting down gracefully...");
      await service.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\nReceived SIGTERM, shutting down gracefully...");
      await service.stop();
      process.exit(0);
    });

    return service;
  } catch (error) {
    console.error("Failed to start NostrMQ service:", error.message);
    process.exit(1);
  }
}
