import { AuthValidator } from "../../src/nostrmq/authValidator.js";
import { jest } from "@jest/globals";

describe("AuthValidator", () => {
  let authValidator;
  let mockLogger;
  let mockConfig;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockConfig = {
      authorizedPubkeys: [
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      ],
    };

    authValidator = new AuthValidator(mockConfig, mockLogger);
  });

  describe("validatePubkey", () => {
    test("should accept valid npub format", async () => {
      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const result = await authValidator.validatePubkey(pubkey);
      expect(result).toBe(true);
    });

    test("should accept valid hex format with 0x prefix", async () => {
      const pubkey =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
      const result = await authValidator.validatePubkey(pubkey);
      expect(result).toBe(true);
    });

    test("should accept valid hex format without prefix", async () => {
      const pubkey =
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
      const result = await authValidator.validatePubkey(pubkey);
      expect(result).toBe(true);
    });

    test("should reject unauthorized pubkey", async () => {
      const pubkey =
        "npub1unauthorized1234567890abcdef1234567890abcdef1234567890abcdef12";
      const result = await authValidator.validatePubkey(pubkey);
      expect(result).toBe(false);
    });

    test("should reject invalid pubkey format", async () => {
      const pubkey = "invalid-pubkey-format";
      const result = await authValidator.validatePubkey(pubkey);
      expect(result).toBe(false);
    });

    test("should reject empty pubkey", async () => {
      const result = await authValidator.validatePubkey("");
      expect(result).toBe(false);
    });

    test("should reject null pubkey", async () => {
      const result = await authValidator.validatePubkey(null);
      expect(result).toBe(false);
    });

    test("should reject undefined pubkey", async () => {
      const result = await authValidator.validatePubkey(undefined);
      expect(result).toBe(false);
    });

    test("should handle case-insensitive hex comparison", async () => {
      const pubkey =
        "1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const result = await authValidator.validatePubkey(pubkey);
      expect(result).toBe(true);
    });

    test("should log authorization attempts", async () => {
      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      await authValidator.validatePubkey(pubkey);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Pubkey authorization check",
        expect.objectContaining({
          pubkey: expect.stringContaining("npub1test"),
          authorized: true,
        })
      );
    });

    test("should log unauthorized attempts", async () => {
      const pubkey =
        "npub1unauthorized1234567890abcdef1234567890abcdef1234567890abcdef12";
      await authValidator.validatePubkey(pubkey);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Unauthorized pubkey access attempt",
        expect.objectContaining({
          pubkey: expect.stringContaining("npub1unauth"),
        })
      );
    });
  });

  describe("normalizePubkey", () => {
    test("should normalize npub format", () => {
      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const normalized = authValidator.normalizePubkey(pubkey);
      expect(normalized).toBe(pubkey.toLowerCase());
    });

    test("should normalize hex with 0x prefix", () => {
      const pubkey =
        "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const normalized = authValidator.normalizePubkey(pubkey);
      expect(normalized).toBe(
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
      );
    });

    test("should normalize hex without prefix", () => {
      const pubkey =
        "1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const normalized = authValidator.normalizePubkey(pubkey);
      expect(normalized).toBe(pubkey.toLowerCase());
    });

    test("should handle empty string", () => {
      const normalized = authValidator.normalizePubkey("");
      expect(normalized).toBe("");
    });
  });

  describe("isValidPubkeyFormat", () => {
    test("should validate npub format", () => {
      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const isValid = authValidator.isValidPubkeyFormat(pubkey);
      expect(isValid).toBe(true);
    });

    test("should validate hex format with 0x prefix", () => {
      const pubkey =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
      const isValid = authValidator.isValidPubkeyFormat(pubkey);
      expect(isValid).toBe(true);
    });

    test("should validate hex format without prefix", () => {
      const pubkey =
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
      const isValid = authValidator.isValidPubkeyFormat(pubkey);
      expect(isValid).toBe(true);
    });

    test("should reject invalid format", () => {
      const pubkey = "invalid-format";
      const isValid = authValidator.isValidPubkeyFormat(pubkey);
      expect(isValid).toBe(false);
    });

    test("should reject short hex", () => {
      const pubkey = "1234567890abcdef";
      const isValid = authValidator.isValidPubkeyFormat(pubkey);
      expect(isValid).toBe(false);
    });

    test("should reject long hex", () => {
      const pubkey =
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234";
      const isValid = authValidator.isValidPubkeyFormat(pubkey);
      expect(isValid).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should handle empty authorized pubkeys list", async () => {
      const emptyConfig = { authorizedPubkeys: [] };
      const validator = new AuthValidator(emptyConfig, mockLogger);

      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const result = await validator.validatePubkey(pubkey);
      expect(result).toBe(false);
    });

    test("should handle missing authorized pubkeys config", async () => {
      const invalidConfig = {};
      const validator = new AuthValidator(invalidConfig, mockLogger);

      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const result = await validator.validatePubkey(pubkey);
      expect(result).toBe(false);
    });

    test("should handle mixed case in authorized list", async () => {
      const mixedConfig = {
        authorizedPubkeys: [
          "NPUB1TEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890",
        ],
      };
      const validator = new AuthValidator(mixedConfig, mockLogger);

      const pubkey =
        "npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const result = await validator.validatePubkey(pubkey);
      expect(result).toBe(true);
    });
  });
});
