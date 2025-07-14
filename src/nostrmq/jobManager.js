import { send } from "nostrmq";
import { createJobLogger } from "../services/jobLogger.js";
import { createPipelineRegistry } from "../pipelines/registry/index.js";

export class JobManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.jobQueue = [];
    this.activeJobs = new Map();
    this.jobHistory = new Map();
    this.isProcessing = false;
    this.messageHandler = null;
    this.maxConcurrentJobs = config.maxConcurrentJobs || 3;
    this.pipelineRegistry = null; // Will be initialized during start()
  }

  setMessageHandler(messageHandler) {
    this.messageHandler = messageHandler;
  }

  async start() {
    // Initialize pipeline registry
    this.pipelineRegistry = await createPipelineRegistry(this.logger);
    this.startJobProcessor();

    const stats = this.pipelineRegistry.getStats();
    this.logger.info("Job Manager started", {
      maxConcurrentJobs: this.maxConcurrentJobs,
      ...stats,
    });
  }

  async stop() {
    this.isProcessing = false;

    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeJobs.size > 0 && Date.now() - startTime < timeout) {
      this.logger.info("Waiting for active jobs to complete", {
        activeJobs: this.activeJobs.size,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.activeJobs.size > 0) {
      this.logger.warn("Force stopping with active jobs", {
        activeJobs: Array.from(this.activeJobs.keys()),
      });
    }

    this.logger.info("Job Manager stopped");
  }

  async queueJob(job) {
    this.jobQueue.push(job);
    this.logger.info("Job queued", {
      jobId: job.jobId,
      pipeline: job.pipeline,
      queueLength: this.jobQueue.length,
    });
  }

  startJobProcessor() {
    this.isProcessing = true;
    this.processQueue();
  }

  async processQueue() {
    while (this.isProcessing) {
      try {
        // Check if we can process more jobs
        if (
          this.activeJobs.size >= this.maxConcurrentJobs ||
          this.jobQueue.length === 0
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }

        // Get next job
        const job = this.jobQueue.shift();
        if (!job) continue;

        // Start job execution (don't await - run concurrently)
        this.executeJob(job).catch((error) => {
          this.logger.error("Unhandled job execution error", {
            jobId: job.jobId,
            error: error.message,
          });
        });
      } catch (error) {
        this.logger.error("Error in job processor", { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async executeJob(job) {
    const { jobId, sender, pipeline, parameters, requestId } = job;

    // Create job logger
    const jobLogger = createJobLogger(jobId);

    // Mark job as active
    this.activeJobs.set(jobId, {
      ...job,
      status: "executing",
      startTime: Date.now(),
      logger: jobLogger,
    });

    jobLogger.info("Job execution started", {
      jobId,
      requestId,
      pipeline,
      sender: sender.substring(0, 8),
    });

    try {
      // Validate pipeline exists and supports NostrMQ
      const pipelineInstance =
        this.pipelineRegistry.getPipelineForNostrMQ(pipeline);

      // Execute pipeline via NostrMQ interface
      const result = await pipelineInstance.executeViaNostrMQ(
        parameters,
        jobLogger
      );

      // Mark job as completed
      const completedJob = {
        ...this.activeJobs.get(jobId),
        status: "completed",
        endTime: Date.now(),
        result,
      };

      this.activeJobs.delete(jobId);
      this.jobHistory.set(jobId, completedJob);

      jobLogger.info("Job execution completed", {
        jobId,
        duration: completedJob.endTime - completedJob.startTime,
        result: {
          runId: result.runId,
          fileCount: Object.keys(result.files || {}).length,
        },
      });

      // Send completion response
      await this.sendCompletionResponse(sender, requestId, jobId, result);
    } catch (error) {
      // Mark job as failed
      const failedJob = {
        ...this.activeJobs.get(jobId),
        status: "failed",
        endTime: Date.now(),
        error: error.message,
      };

      this.activeJobs.delete(jobId);
      this.jobHistory.set(jobId, failedJob);

      jobLogger.error("Job execution failed", {
        jobId,
        error: error.message,
        stack: error.stack,
      });

      // Send error response
      await this.sendErrorResponse(sender, requestId, jobId, error);
    }
  }

  async sendCompletionResponse(sender, requestId, jobId, result) {
    const response = {
      type: "pipeline-result",
      requestId,
      jobId,
      status: "completed",
      result: {
        runId: result.runId,
        summary: this.createResultSummary(result),
        fileReferences: this.createFileReferences(result),
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendNostrMQResponse(sender, response);
  }

  async sendErrorResponse(sender, requestId, jobId, error) {
    const response = {
      type: "pipeline-result",
      requestId,
      jobId,
      status: "failed",
      error: {
        code: this.categorizeError(error),
        message: error.message,
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

    this.logger.info("Job completion response sent", {
      target: target.substring(0, 8),
      type: payload.type,
      eventId,
    });

    return eventId;
  }

  createResultSummary(result) {
    const summary = {
      executionTime:
        result.pipeline?.statistics?.durationSeconds + "s" || "unknown",
      status: "completed",
    };

    if (result.conversation) {
      summary.exchangeCount = result.conversation.length;
    }

    if (result.summary?.content) {
      summary.conclusion = result.summary.content.substring(0, 200) + "...";
    }

    return summary;
  }

  createFileReferences(result) {
    return result.files || {};
  }

  categorizeError(error) {
    if (error.message.includes("not found")) return "PIPELINE_NOT_FOUND";
    if (error.message.includes("validation")) return "VALIDATION_ERROR";
    if (error.message.includes("timeout")) return "TIMEOUT_ERROR";
    return "EXECUTION_ERROR";
  }

  getJobStatus(jobId) {
    if (this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId);
    }
    return this.jobHistory.get(jobId);
  }

  getQueueStats() {
    return {
      queued: this.jobQueue.length,
      active: this.activeJobs.size,
      completed: this.jobHistory.size,
    };
  }
}
