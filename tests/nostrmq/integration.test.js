import { NostrMQPipelineService } from "../../src/nostrmq/index.js";
import { AuthValidator } from "../../src/nostrmq/authValidator.js";
import { MessageHandler } from "../../src/nostrmq/messageHandler.js";
import { JobManager } from "../../src/nostrmq/jobManager.js";
import { jest } from "@jest/globals";

// Mock NostrMQ library
const mockSend = jest.fn();
const mockReceive = jest.fn();
jest.unstable_mockModule("nostrmq", () => ({
  send: mockSend,
  receive: mockReceive,
}));

// Mock config and logger
const mockLoadConfig = jest.fn();
jest.unstable_mockModule("../../src/services/config.js", () => ({
  loadConfig: mockLoadConfig,
}));

const mockCreateLogger = jest.fn();
jest.unstable_mockModule("../../src/services/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

// Mock pipeline registry
const mockCreatePipelineRegistry = jest.fn();
jest.unstable_mockModule("../../src/pipelines/registry/index.js", () => ({
  createPipelineRegistry: mockCreatePipelineRegistry,
}));

const { send, receive } = await import("nostrmq");
const { loadConfig } = await import("../../src/services/config.js");
const { createLogger } = await import("../../src/services/logger.js");
const { createPipelineRegistry } = await import(
  "../../src/pipelines/registry/index.js"
);

describe("NostrMQ Integration Tests", () => {
  let service;
  let mockConfig;
  let mockLogger;
  let mockRegistry;
  let mockSubscription;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockSend.mockClear();
    mockReceive.mockClear();
    mockLoadConfig.mockClear();
    mockCreateLogger.mockClear();
    mockCreatePipelineRegistry.mockClear();

    // Mock configuration
    mockConfig = {
      authorizedPubkeys: [
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      ],
      relays: ["wss://relay.example.com"],
      privateKey: "test-private-key",
      maxConcurrentJobs: 3,
      powDifficulty: 0,
      sendTimeout: 10000,
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Mock pipeline registry
    mockRegistry = {
      getStats: jest.fn().mockReturnValue({
        totalPipelines: 2,
        nostrMQEnabled: 2,
        nostrMQDisabled: 0,
        pipelines: ["dialogue", "facilitatedDialogue"],
      }),
      getPipelineForNostrMQ: jest.fn(),
    };

    // Mock subscription
    mockSubscription = {
      close: jest.fn(),
    };

    // Setup mocks
    mockLoadConfig.mockReturnValue(mockConfig);
    mockCreateLogger.mockReturnValue(mockLogger);
    mockCreatePipelineRegistry.mockResolvedValue(mockRegistry);
    mockReceive.mockReturnValue(mockSubscription);
    mockSend.mockResolvedValue("event-id-123");

    service = new NostrMQPipelineService();
  });

  describe("Service Lifecycle", () => {
    test("should initialize service successfully", async () => {
      await service.initialize();

      expect(mockCreateLogger).toHaveBeenCalledWith("nostrmq-service");
      expect(mockLoadConfig).toHaveBeenCalled();
      expect(service.config).toBe(mockConfig);
      expect(service.logger).toBe(mockLogger);
      expect(service.authValidator).toBeInstanceOf(AuthValidator);
      expect(service.messageHandler).toBeInstanceOf(MessageHandler);
      expect(service.jobManager).toBeInstanceOf(JobManager);
    });

    test("should start service successfully", async () => {
      await service.initialize();
      await service.start();

      expect(mockReceive).toHaveBeenCalledWith({
        relays: mockConfig.relays,
        onMessage: expect.any(Function),
      });
      expect(service.isRunning).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "NostrMQ Pipeline Service started",
        expect.objectContaining({
          relays: mockConfig.relays,
          listening: true,
        })
      );
    });

    test("should stop service successfully", async () => {
      await service.initialize();
      await service.start();
      await service.stop();

      expect(mockSubscription.close).toHaveBeenCalled();
      expect(service.isRunning).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "NostrMQ Pipeline Service stopped"
      );
    });

    test("should handle stop when not running", async () => {
      await service.initialize();
      await service.stop(); // Should not throw

      expect(service.isRunning).toBe(false);
    });

    test("should throw error when starting already running service", async () => {
      await service.initialize();
      await service.start();

      await expect(service.start()).rejects.toThrow("Service already running");
    });
  });

  describe("Configuration Validation", () => {
    test("should validate required configuration fields", async () => {
      const invalidConfig = { ...mockConfig };
      delete invalidConfig.authorizedPubkeys;
      mockLoadConfig.mockReturnValue(invalidConfig);

      const invalidService = new NostrMQPipelineService();
      await expect(invalidService.initialize()).rejects.toThrow(
        "Missing required configuration: authorizedPubkeys"
      );
    });

    test("should validate all required fields", async () => {
      const requiredFields = ["authorizedPubkeys", "relays", "privateKey"];

      for (const field of requiredFields) {
        const invalidConfig = { ...mockConfig };
        delete invalidConfig[field];
        mockLoadConfig.mockReturnValue(invalidConfig);

        const invalidService = new NostrMQPipelineService();
        await expect(invalidService.initialize()).rejects.toThrow(
          `Missing required configuration: ${field}`
        );
      }
    });
  });

  describe("Message Processing Flow", () => {
    let onMessageHandler;

    beforeEach(async () => {
      await service.initialize();
      await service.start();

      // Capture the onMessage handler
      const receiveCall = mockReceive.mock.calls[0][0];
      onMessageHandler = receiveCall.onMessage;
    });

    test("should process valid pipeline request", async () => {
      const mockPipeline = {
        executeViaNostrMQ: jest.fn().mockResolvedValue({
          runId: "run-123",
          conversation: [],
          summary: { content: "Test summary" },
          files: {},
        }),
      };
      mockRegistry.getPipelineForNostrMQ.mockReturnValue(mockPipeline);

      const payload = {
        type: "pipeline-request",
        requestId: "req-123",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source text",
          discussionPrompt: "Test prompt",
        },
      };

      const sender =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const rawEvent = { id: "event-123" };

      await onMessageHandler(payload, sender, rawEvent);

      // Should send acknowledgment
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          target: sender,
          payload: expect.objectContaining({
            type: "pipeline-ack",
            status: "accepted",
          }),
        })
      );
    });

    test("should reject unauthorized sender", async () => {
      const payload = {
        type: "pipeline-request",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source text",
          discussionPrompt: "Test prompt",
        },
      };

      const unauthorizedSender =
        "npub1unauthorized123456789abcdef1234567890abcdef1234567890abcdef12";
      const rawEvent = { id: "event-123" };

      await onMessageHandler(payload, unauthorizedSender, rawEvent);

      // Should send unauthorized response
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          target: unauthorizedSender,
          payload: expect.objectContaining({
            type: "pipeline-ack",
            status: "unauthorized",
            error: expect.objectContaining({
              code: "UNAUTHORIZED_PUBKEY",
            }),
          }),
        })
      );
    });

    test("should reject invalid message format", async () => {
      const invalidPayload = {
        type: "invalid-type",
        pipeline: "dialogue",
      };

      const sender =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const rawEvent = { id: "event-123" };

      await onMessageHandler(invalidPayload, sender, rawEvent);

      // Should send validation error response
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          target: sender,
          payload: expect.objectContaining({
            type: "pipeline-ack",
            status: "error",
            error: expect.objectContaining({
              code: "VALIDATION_ERROR",
            }),
          }),
        })
      );
    });

    test("should handle pipeline execution success", async () => {
      const mockResult = {
        runId: "run-123",
        conversation: [{ agent: "DialogueAg1", content: "Test response" }],
        summary: { content: "Test summary" },
        files: { conversation: "/path/to/conversation.md" },
      };

      const mockPipeline = {
        executeViaNostrMQ: jest.fn().mockResolvedValue(mockResult),
      };
      mockRegistry.getPipelineForNostrMQ.mockReturnValue(mockPipeline);

      const payload = {
        type: "pipeline-request",
        requestId: "req-123",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source text",
          discussionPrompt: "Test prompt",
        },
      };

      const sender =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const rawEvent = { id: "event-123" };

      await onMessageHandler(payload, sender, rawEvent);

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should eventually send completion response
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          target: sender,
          payload: expect.objectContaining({
            type: "pipeline-result",
            status: "completed",
            result: expect.objectContaining({
              runId: "run-123",
            }),
          }),
        })
      );
    });

    test("should handle pipeline execution failure", async () => {
      const mockPipeline = {
        executeViaNostrMQ: jest
          .fn()
          .mockRejectedValue(new Error("Pipeline execution failed")),
      };
      mockRegistry.getPipelineForNostrMQ.mockReturnValue(mockPipeline);

      const payload = {
        type: "pipeline-request",
        requestId: "req-123",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source text",
          discussionPrompt: "Test prompt",
        },
      };

      const sender =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const rawEvent = { id: "event-123" };

      await onMessageHandler(payload, sender, rawEvent);

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should eventually send error response
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          target: sender,
          payload: expect.objectContaining({
            type: "pipeline-result",
            status: "failed",
            error: expect.objectContaining({
              message: "Pipeline execution failed",
            }),
          }),
        })
      );
    });
  });

  describe("Response Sending", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test("should send response with correct format", async () => {
      const target =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = {
        type: "test-response",
        message: "Test message",
      };

      const eventId = await service.sendResponse(target, payload);

      expect(mockSend).toHaveBeenCalledWith({
        target,
        payload,
        relays: mockConfig.relays,
        pow: mockConfig.powDifficulty,
        timeoutMs: mockConfig.sendTimeout,
      });

      expect(eventId).toBe("event-id-123");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Response sent",
        expect.objectContaining({
          target: expect.stringContaining("npub1test"),
          eventId: "event-id-123",
          type: "test-response",
        })
      );
    });
  });

  describe("Error Handling", () => {
    test("should handle NostrMQ send errors gracefully", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      await service.initialize();

      const target =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = { type: "test" };

      await expect(service.sendResponse(target, payload)).rejects.toThrow(
        "Network error"
      );
    });

    test("should handle job manager initialization errors", async () => {
      mockCreatePipelineRegistry.mockRejectedValue(
        new Error("Registry initialization failed")
      );

      await service.initialize();

      await expect(service.start()).rejects.toThrow(
        "Registry initialization failed"
      );
    });
  });

  describe("Concurrent Job Processing", () => {
    test("should handle multiple concurrent requests", async () => {
      const mockPipeline = {
        executeViaNostrMQ: jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            runId: "run-" + Math.random(),
            conversation: [],
            summary: { content: "Test summary" },
            files: {},
          };
        }),
      };
      mockRegistry.getPipelineForNostrMQ.mockReturnValue(mockPipeline);

      await service.initialize();
      await service.start();

      const receiveCall = mockReceive.mock.calls[0][0];
      const onMessageHandler = receiveCall.onMessage;

      const sender =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const requests = [];

      // Send multiple concurrent requests
      for (let i = 0; i < 5; i++) {
        const payload = {
          type: "pipeline-request",
          requestId: `req-${i}`,
          pipeline: "dialogue",
          parameters: {
            sourceText: `Test source ${i}`,
            discussionPrompt: `Test prompt ${i}`,
          },
        };
        requests.push(onMessageHandler(payload, sender, { id: `event-${i}` }));
      }

      await Promise.all(requests);

      // Should have sent acknowledgments for all requests
      expect(mockSend).toHaveBeenCalledTimes(5);
    });
  });
});
