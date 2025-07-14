import { send } from "nostrmq";
import { generateJobId } from "../utils/jobId.js";
import { validatePipelineRequest } from "../utils/messageValidation.js";

export class MessageHandler {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.authValidator = null;
    this.jobManager = null;
  }

  setAuthValidator(authValidator) {
    this.authValidator = authValidator;
  }

  setJobManager(jobManager) {
    this.jobManager = jobManager;
  }

  async handleMessage(payload, sender, rawEvent) {
    const requestId = payload.requestId || generateJobId();
    const logContext = { requestId, sender: sender.substring(0, 8) };

    this.logger.info("Received NostrMQ message", logContext);

    try {
      // Step 1: Validate message structure
      const validation = validatePipelineRequest(payload);
      if (!validation.isValid) {
        await this.sendErrorResponse(
          sender,
          requestId,
          "VALIDATION_ERROR",
          validation.errors
        );
        return;
      }

      // Step 2: Check authorization
      const isAuthorized = await this.authValidator.validatePubkey(sender);
      if (!isAuthorized) {
        await this.sendUnauthorizedResponse(sender, requestId);
        return;
      }

      // Step 3: Create job and send acknowledgment
      const jobId = generateJobId();
      const job = {
        jobId,
        requestId,
        sender,
        pipeline: payload.pipeline,
        parameters: payload.parameters,
        options: payload.options || {},
        timestamp: new Date().toISOString(),
        status: "queued",
      };

      // Queue job for execution
      await this.jobManager.queueJob(job);

      // Send immediate acknowledgment
      await this.sendAcknowledgment(sender, requestId, jobId);

      this.logger.info("Pipeline job queued successfully", {
        ...logContext,
        jobId,
      });
    } catch (error) {
      this.logger.error("Error handling message", {
        ...logContext,
        error: error.message,
        stack: error.stack,
      });

      await this.sendErrorResponse(
        sender,
        requestId,
        "INTERNAL_ERROR",
        error.message
      );
    }
  }

  async sendAcknowledgment(sender, requestId, jobId) {
    const response = {
      type: "pipeline-ack",
      requestId,
      jobId,
      status: "accepted",
      estimatedDuration: "180s",
      timestamp: new Date().toISOString(),
    };

    await this.sendNostrMQResponse(sender, response);
  }

  async sendUnauthorizedResponse(sender, requestId) {
    const response = {
      type: "pipeline-ack",
      requestId,
      status: "unauthorized",
      error: {
        code: "UNAUTHORIZED_PUBKEY",
        message: "Pubkey not authorized for pipeline execution",
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.warn("Unauthorized access attempt", {
      sender: sender.substring(0, 8),
      fullSender: sender,
      requestId,
      responseStatus: "unauthorized",
    });

    await this.sendNostrMQResponse(sender, response);
  }

  async sendErrorResponse(sender, requestId, code, message) {
    const response = {
      type: "pipeline-ack",
      requestId,
      status: "error",
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendNostrMQResponse(sender, response);
  }

  async sendNostrMQResponse(target, payload) {
    const eventId = await send({
      target,
      payload,
      relays: this.config.relays,
      pow: this.config.powDifficulty || 0,
      timeoutMs: this.config.sendTimeout || 10000,
    });

    this.logger.info("NostrMQ response sent", {
      target: target.substring(0, 8),
      type: payload.type,
      eventId,
    });

    return eventId;
  }
}
