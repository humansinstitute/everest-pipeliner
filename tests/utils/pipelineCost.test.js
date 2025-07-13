import { jest } from "@jest/globals";
import {
  extractCostData,
  initializePipelineCosts,
  addStepCost,
  formatCostSummary,
  generateCostBreakdown,
} from "../../src/utils/pipelineCost.js";

describe("pipelineCost", () => {
  // Mock data structures for testing
  const createEnhancedApiResponse = (overrides = {}) => ({
    callID: "test-call-123",
    billingID: "bill-456",
    message: "Test response message",
    usage: {
      prompt_tokens: 23,
      completion_tokens: 414,
      total_tokens: 437,
      cost: 0.00621621,
      model: "anthropic/claude-sonnet-4",
    },
    ...overrides,
  });

  const createLegacyApiResponse = (overrides = {}) => ({
    callID: "legacy-call-123",
    billingID: "legacy-bill-456",
    message: "Legacy response message",
    // No usage field - legacy response
    ...overrides,
  });

  const createPipelineData = (overrides = {}) => ({
    runId: "test-pipeline-123",
    steps: [],
    outputs: [],
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    // Clear console mocks before each test
    jest.clearAllMocks();
  });

  describe("extractCostData", () => {
    test("should extract cost data from enhanced API response", () => {
      const apiResponse = createEnhancedApiResponse();
      const result = extractCostData(apiResponse);

      expect(result).toEqual({
        cost: 0.00621621,
        tokensIn: 23,
        tokensOut: 414,
        totalTokens: 437,
        model: "anthropic/claude-sonnet-4",
        callID: "test-call-123",
        billingID: "bill-456",
      });
    });

    test("should extract cost data with partial usage field", () => {
      const apiResponse = createEnhancedApiResponse({
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          // Missing total_tokens, cost, model
        },
      });
      const result = extractCostData(apiResponse);

      expect(result).toEqual({
        cost: 0,
        tokensIn: 50,
        tokensOut: 100,
        totalTokens: 0,
        model: "unknown",
        callID: "test-call-123",
        billingID: "bill-456",
      });
    });

    test("should extract cost data with zero values", () => {
      const apiResponse = createEnhancedApiResponse({
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          cost: 0,
          model: "free-model",
        },
      });
      const result = extractCostData(apiResponse);

      expect(result).toEqual({
        cost: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        model: "free-model",
        callID: "test-call-123",
        billingID: "bill-456",
      });
    });

    test("should return null for legacy API response without usage field", () => {
      const apiResponse = createLegacyApiResponse();
      const result = extractCostData(apiResponse);

      expect(result).toBeNull();
    });

    test("should return null for null input", () => {
      const result = extractCostData(null);
      expect(result).toBeNull();
    });

    test("should return null for undefined input", () => {
      const result = extractCostData(undefined);
      expect(result).toBeNull();
    });

    test("should handle missing callID and billingID gracefully", () => {
      const apiResponse = {
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          cost: 0.001,
          model: "test-model",
        },
        // Missing callID and billingID
      };
      const result = extractCostData(apiResponse);

      expect(result).toEqual({
        cost: 0.001,
        tokensIn: 10,
        tokensOut: 20,
        totalTokens: 30,
        model: "test-model",
        callID: "unknown",
        billingID: "unknown",
      });
    });

    test("should handle empty usage object", () => {
      const apiResponse = createEnhancedApiResponse({
        usage: {},
      });
      const result = extractCostData(apiResponse);

      expect(result).toEqual({
        cost: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        model: "unknown",
        callID: "test-call-123",
        billingID: "bill-456",
      });
    });
  });

  describe("initializePipelineCosts", () => {
    test("should initialize cost structure in pipeline data", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      expect(pipelineData.costs).toEqual({
        totalCost: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        totalTokens: 0,
        stepCosts: [],
      });
    });

    test("should handle null pipeline data gracefully", () => {
      expect(() => {
        initializePipelineCosts(null);
      }).not.toThrow();
    });

    test("should handle undefined pipeline data gracefully", () => {
      expect(() => {
        initializePipelineCosts(undefined);
      }).not.toThrow();
    });

    test("should overwrite existing costs structure", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 999,
          totalTokensIn: 999,
          totalTokensOut: 999,
          totalTokens: 999,
          stepCosts: [{ existing: "data" }],
        },
      });

      initializePipelineCosts(pipelineData);

      expect(pipelineData.costs).toEqual({
        totalCost: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        totalTokens: 0,
        stepCosts: [],
      });
    });
  });

  describe("addStepCost", () => {
    let pipelineData;

    beforeEach(() => {
      pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);
    });

    test("should add step cost and accumulate totals", () => {
      const apiResponse = createEnhancedApiResponse();
      addStepCost(pipelineData, "step1", apiResponse);

      expect(pipelineData.costs.totalCost).toBe(0.00621621);
      expect(pipelineData.costs.totalTokensIn).toBe(23);
      expect(pipelineData.costs.totalTokensOut).toBe(414);
      expect(pipelineData.costs.totalTokens).toBe(437);
      expect(pipelineData.costs.stepCosts).toHaveLength(1);

      const stepCost = pipelineData.costs.stepCosts[0];
      expect(stepCost.stepId).toBe("step1");
      expect(stepCost.cost).toBe(0.00621621);
      expect(stepCost.tokensIn).toBe(23);
      expect(stepCost.tokensOut).toBe(414);
      expect(stepCost.model).toBe("anthropic/claude-sonnet-4");
      expect(stepCost.callID).toBe("test-call-123");
      expect(stepCost.billingID).toBe("bill-456");
      expect(stepCost.timestamp).toBeDefined();
    });

    test("should accumulate costs across multiple steps", () => {
      const apiResponse1 = createEnhancedApiResponse({
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          cost: 0.001,
          model: "model1",
        },
      });

      const apiResponse2 = createEnhancedApiResponse({
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
          cost: 0.002,
          model: "model2",
        },
      });

      addStepCost(pipelineData, "step1", apiResponse1);
      addStepCost(pipelineData, "step2", apiResponse2);

      expect(pipelineData.costs.totalCost).toBe(0.003);
      expect(pipelineData.costs.totalTokensIn).toBe(25);
      expect(pipelineData.costs.totalTokensOut).toBe(45);
      expect(pipelineData.costs.totalTokens).toBe(70);
      expect(pipelineData.costs.stepCosts).toHaveLength(2);
    });

    test("should handle legacy API response gracefully", () => {
      const legacyResponse = createLegacyApiResponse();
      addStepCost(pipelineData, "legacy-step", legacyResponse);

      // Should not accumulate any costs
      expect(pipelineData.costs.totalCost).toBe(0);
      expect(pipelineData.costs.totalTokensIn).toBe(0);
      expect(pipelineData.costs.totalTokensOut).toBe(0);
      expect(pipelineData.costs.totalTokens).toBe(0);
      expect(pipelineData.costs.stepCosts).toHaveLength(0);
    });

    test("should initialize costs if not present", () => {
      const pipelineDataWithoutCosts = createPipelineData();
      const apiResponse = createEnhancedApiResponse();

      addStepCost(pipelineDataWithoutCosts, "step1", apiResponse);

      expect(pipelineDataWithoutCosts.costs).toBeDefined();
      expect(pipelineDataWithoutCosts.costs.totalCost).toBe(0.00621621);
    });

    test("should handle null pipeline data gracefully", () => {
      const apiResponse = createEnhancedApiResponse();
      expect(() => {
        addStepCost(null, "step1", apiResponse);
      }).not.toThrow();
    });

    test("should handle missing step ID gracefully", () => {
      const apiResponse = createEnhancedApiResponse();
      expect(() => {
        addStepCost(pipelineData, null, apiResponse);
      }).not.toThrow();
    });

    test("should handle zero cost responses", () => {
      const zeroResponse = createEnhancedApiResponse({
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          cost: 0,
          model: "free-model",
        },
      });

      addStepCost(pipelineData, "zero-step", zeroResponse);

      expect(pipelineData.costs.totalCost).toBe(0);
      expect(pipelineData.costs.stepCosts).toHaveLength(1);
      expect(pipelineData.costs.stepCosts[0].cost).toBe(0);
    });
  });

  describe("formatCostSummary", () => {
    test("should format cost summary with exact USD format", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0.00621621,
          totalTokensIn: 23,
          totalTokensOut: 414,
          totalTokens: 437,
          stepCosts: [],
        },
      });

      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 0.0062",
        "TotalTokens In: 23",
        "TotalTokens Out: 414",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should format zero costs with exact format", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0,
          totalTokensIn: 0,
          totalTokensOut: 0,
          totalTokens: 0,
          stepCosts: [],
        },
      });

      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 0.0000",
        "TotalTokens In: 0",
        "TotalTokens Out: 0",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle large cost values with 4 decimal places", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 123.456789,
          totalTokensIn: 1000,
          totalTokensOut: 2000,
          totalTokens: 3000,
          stepCosts: [],
        },
      });

      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 123.4568",
        "TotalTokens In: 1000",
        "TotalTokens Out: 2000",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle null pipeline data", () => {
      const result = formatCostSummary(null);
      const expected = [
        "Total Cost USD $ 0.0000",
        "TotalTokens In: 0",
        "TotalTokens Out: 0",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle pipeline data without costs", () => {
      const pipelineData = createPipelineData();
      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 0.0000",
        "TotalTokens In: 0",
        "TotalTokens Out: 0",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle non-numeric cost values", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: "invalid",
          totalTokensIn: "invalid",
          totalTokensOut: "invalid",
          totalTokens: 0,
          stepCosts: [],
        },
      });

      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 0.0000",
        "TotalTokens In: 0",
        "TotalTokens Out: 0",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle undefined cost values", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: undefined,
          totalTokensIn: undefined,
          totalTokensOut: undefined,
          totalTokens: 0,
          stepCosts: [],
        },
      });

      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 0.0000",
        "TotalTokens In: 0",
        "TotalTokens Out: 0",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should format fractional tokens as-is (no integer conversion)", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0.001,
          totalTokensIn: 23.7, // Should be displayed as 23.7
          totalTokensOut: 414.9, // Should be displayed as 414.9
          totalTokens: 437,
          stepCosts: [],
        },
      });

      const result = formatCostSummary(pipelineData);
      const expected = [
        "Total Cost USD $ 0.0010",
        "TotalTokens In: 23.7",
        "TotalTokens Out: 414.9",
      ].join("\n");

      expect(result).toBe(expected);
    });
  });

  describe("generateCostBreakdown", () => {
    test("should generate detailed cost breakdown with step details", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0.003,
          totalTokensIn: 25,
          totalTokensOut: 45,
          totalTokens: 70,
          stepCosts: [
            {
              stepId: "step1",
              callID: "call1",
              billingID: "bill1",
              cost: 0.001,
              tokensIn: 10,
              tokensOut: 20,
              model: "model1",
              timestamp: "2023-01-01T00:00:00.000Z",
            },
            {
              stepId: "step2",
              callID: "call2",
              billingID: "bill2",
              cost: 0.002,
              tokensIn: 15,
              tokensOut: 25,
              model: "model2",
              timestamp: "2023-01-01T00:01:00.000Z",
            },
          ],
        },
      });

      const result = generateCostBreakdown(pipelineData);

      expect(result.hasCostData).toBe(true);
      expect(result.summary).toBe(
        "Total Cost USD $ 0.0030\nTotalTokens In: 25\nTotalTokens Out: 45"
      );
      expect(result.stepDetails).toHaveLength(2);

      expect(result.stepDetails[0]).toEqual({
        stepId: "step1",
        cost: 0.001,
        tokensIn: 10,
        tokensOut: 20,
        model: "model1",
        callID: "call1",
        billingID: "bill1",
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      expect(result.stepDetails[1]).toEqual({
        stepId: "step2",
        cost: 0.002,
        tokensIn: 15,
        tokensOut: 25,
        model: "model2",
        callID: "call2",
        billingID: "bill2",
        timestamp: "2023-01-01T00:01:00.000Z",
      });
    });

    test("should handle null pipeline data", () => {
      const result = generateCostBreakdown(null);

      expect(result.hasCostData).toBe(false);
      expect(result.summary).toBe(
        "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0"
      );
      expect(result.stepDetails).toEqual([]);
    });

    test("should handle pipeline data without costs", () => {
      const pipelineData = createPipelineData();
      const result = generateCostBreakdown(pipelineData);

      expect(result.hasCostData).toBe(false);
      expect(result.summary).toBe(
        "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0"
      );
      expect(result.stepDetails).toEqual([]);
    });

    test("should handle empty stepCosts array", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0,
          totalTokensIn: 0,
          totalTokensOut: 0,
          totalTokens: 0,
          stepCosts: [],
        },
      });

      const result = generateCostBreakdown(pipelineData);

      expect(result.hasCostData).toBe(false);
      expect(result.stepDetails).toEqual([]);
    });

    test("should handle malformed step cost entries", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0.001,
          totalTokensIn: 10,
          totalTokensOut: 20,
          totalTokens: 30,
          stepCosts: [
            {
              // Missing stepId
              cost: "invalid",
              tokensIn: "invalid",
              tokensOut: "invalid",
              // Missing model, callID, billingID, timestamp
            },
            {
              stepId: "valid-step",
              cost: 0.001,
              tokensIn: 10,
              tokensOut: 20,
              model: "valid-model",
              callID: "valid-call",
              billingID: "valid-bill",
              timestamp: "2023-01-01T00:00:00.000Z",
            },
          ],
        },
      });

      const result = generateCostBreakdown(pipelineData);

      expect(result.hasCostData).toBe(true);
      expect(result.stepDetails).toHaveLength(2);

      // First entry should have defaults for invalid/missing values
      expect(result.stepDetails[0]).toEqual({
        stepId: "unknown",
        cost: 0,
        tokensIn: 0,
        tokensOut: 0,
        model: "unknown",
        callID: "unknown",
        billingID: "unknown",
        timestamp: "unknown",
      });

      // Second entry should be valid
      expect(result.stepDetails[1]).toEqual({
        stepId: "valid-step",
        cost: 0.001,
        tokensIn: 10,
        tokensOut: 20,
        model: "valid-model",
        callID: "valid-call",
        billingID: "valid-bill",
        timestamp: "2023-01-01T00:00:00.000Z",
      });
    });

    test("should handle non-array stepCosts", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0.001,
          totalTokensIn: 10,
          totalTokensOut: 20,
          totalTokens: 30,
          stepCosts: "not-an-array",
        },
      });

      const result = generateCostBreakdown(pipelineData);

      // hasCostData is true because stepCosts exists and is truthy, even if not an array
      expect(result.hasCostData).toBe(true);
      expect(result.stepDetails).toEqual([]);
    });

    test("should handle undefined stepCosts", () => {
      const pipelineData = createPipelineData({
        costs: {
          totalCost: 0.001,
          totalTokensIn: 10,
          totalTokensOut: 20,
          totalTokens: 30,
          stepCosts: undefined,
        },
      });

      const result = generateCostBreakdown(pipelineData);

      expect(result.hasCostData).toBe(undefined);
      expect(result.stepDetails).toEqual([]);
    });
  });

  describe("Integration Tests", () => {
    test("should work end-to-end with multiple steps", () => {
      const pipelineData = createPipelineData();

      // Initialize costs
      initializePipelineCosts(pipelineData);

      // Add multiple steps
      const response1 = createEnhancedApiResponse({
        callID: "call1",
        billingID: "bill1",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          cost: 0.001,
          model: "model1",
        },
      });

      const response2 = createEnhancedApiResponse({
        callID: "call2",
        billingID: "bill2",
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
          cost: 0.002,
          model: "model2",
        },
      });

      addStepCost(pipelineData, "agent1_initial", response1);
      addStepCost(pipelineData, "agent2_followup", response2);

      // Test formatting
      const summary = formatCostSummary(pipelineData);
      expect(summary).toBe(
        "Total Cost USD $ 0.0030\nTotalTokens In: 25\nTotalTokens Out: 45"
      );

      // Test breakdown
      const breakdown = generateCostBreakdown(pipelineData);
      expect(breakdown.hasCostData).toBe(true);
      expect(breakdown.stepDetails).toHaveLength(2);
      expect(breakdown.stepDetails[0].stepId).toBe("agent1_initial");
      expect(breakdown.stepDetails[1].stepId).toBe("agent2_followup");
    });

    test("should handle mixed enhanced and legacy responses", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      // Add enhanced response
      const enhancedResponse = createEnhancedApiResponse();
      addStepCost(pipelineData, "enhanced_step", enhancedResponse);

      // Add legacy response (should be ignored)
      const legacyResponse = createLegacyApiResponse();
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      // Only enhanced response should contribute to costs
      expect(pipelineData.costs.totalCost).toBe(0.00621621);
      expect(pipelineData.costs.stepCosts).toHaveLength(1);
      expect(pipelineData.costs.stepCosts[0].stepId).toBe("enhanced_step");

      const breakdown = generateCostBreakdown(pipelineData);
      expect(breakdown.hasCostData).toBe(true);
      expect(breakdown.stepDetails).toHaveLength(1);
    });
  });
});
