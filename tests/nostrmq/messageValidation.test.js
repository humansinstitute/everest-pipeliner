import { validatePipelineRequest } from "../../src/utils/messageValidation.js";

describe("Message Validation", () => {
  describe("validatePipelineRequest", () => {
    test("should validate complete valid request", () => {
      const payload = {
        type: "pipeline-trigger",
        requestId: "req-123",
        pipeline: "dialogue",
        parameters: {
          sourceText: "This is a test source text for the dialogue pipeline.",
          discussionPrompt: "What are the key insights from this text?",
          iterations: 3,
        },
        options: {
          priority: "normal",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate minimal valid request", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject missing type", () => {
      const payload = {
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Request type must be "pipeline-trigger"'
      );
    });

    test("should reject invalid type", () => {
      const payload = {
        type: "invalid-type",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Request type must be "pipeline-trigger"'
      );
    });

    test("should reject missing pipeline", () => {
      const payload = {
        type: "pipeline-trigger",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Pipeline name is required and must be a string"
      );
    });

    test("should reject empty pipeline", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Pipeline name is required and must be a string"
      );
    });

    test("should reject non-string pipeline", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: 123,
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Pipeline name is required and must be a string"
      );
    });

    test("should reject missing parameters", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Parameters object is required");
    });

    test("should reject null parameters", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: null,
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Parameters object is required");
    });

    test("should reject non-object parameters", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: "invalid",
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Parameters object is required");
    });

    test("should accept array parameters (arrays are objects in JS)", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: [],
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
    });

    test("should accept valid requestId", () => {
      const payload = {
        type: "pipeline-trigger",
        requestId: "custom-request-123",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
    });

    test("should reject non-string requestId", () => {
      const payload = {
        type: "pipeline-trigger",
        requestId: 123,
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("RequestId must be a string if provided");
    });

    test("should accept empty requestId (empty string is still a string)", () => {
      const payload = {
        type: "pipeline-trigger",
        requestId: "",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
    });

    test("should accept valid options object", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
        options: {
          priority: "high",
          timeout: 300,
        },
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
    });

    test("should reject non-object options", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
        options: "invalid",
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Options must be an object if provided");
    });

    test("should accept null options (null is falsy, so validation skips)", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
        options: null,
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
    });

    test("should accept array options (arrays are objects in JS)", () => {
      const payload = {
        type: "pipeline-trigger",
        pipeline: "dialogue",
        parameters: {
          sourceText: "Test source",
          discussionPrompt: "Test prompt",
        },
        options: [],
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(true);
    });

    test("should collect multiple validation errors", () => {
      const payload = {
        type: "invalid-type",
        requestId: 123,
        pipeline: "",
        parameters: null,
        options: "invalid",
      };

      const result = validatePipelineRequest(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.errors).toContain(
        'Request type must be "pipeline-trigger"'
      );
      expect(result.errors).toContain("RequestId must be a string if provided");
      expect(result.errors).toContain(
        "Pipeline name is required and must be a string"
      );
      expect(result.errors).toContain("Parameters object is required");
      expect(result.errors).toContain("Options must be an object if provided");
    });

    test("should handle undefined payload", () => {
      const result = validatePipelineRequest(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Request payload must be an object");
    });

    test("should handle null payload", () => {
      const result = validatePipelineRequest(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Request payload must be an object");
    });

    test("should handle empty object payload", () => {
      const result = validatePipelineRequest({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Request type must be "pipeline-trigger"'
      );
      expect(result.errors).toContain(
        "Pipeline name is required and must be a string"
      );
      expect(result.errors).toContain("Parameters object is required");
    });
  });
});
