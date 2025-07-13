/**
 * Backwards Compatibility Validation Test for Legacy API Responses
 *
 * This test validates that the cost tracking system gracefully handles legacy API responses
 * without usage fields, ensuring no breaking changes to existing functionality.
 *
 * Test Scenarios:
 * - API response with only callID and message fields
 * - API response with null or undefined usage field
 * - API response with empty usage object {}
 * - Mixed scenarios (some steps with cost data, some without)
 *
 * Expected Behavior:
 * - Cost tracking functions return null for legacy responses
 * - Pipeline continues normal execution
 * - Console shows warnings about missing cost data
 * - Cost summary displays "Total Cost USD $ 0.0000" when no cost data available
 * - All existing pipeline functionality preserved
 */

import { jest } from "@jest/globals";
import {
  extractCostData,
  initializePipelineCosts,
  addStepCost,
  formatCostSummary,
  generateCostBreakdown,
} from "../src/utils/pipelineCost.js";
import {
  createPipelineData,
  completePipeline,
  addStepResult,
} from "../src/utils/pipelineData.js";

describe("Backwards Compatibility - Legacy API Response Handling", () => {
  let consoleSpy;

  beforeEach(() => {
    // Spy on console.log to capture warnings and logs
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log
    consoleSpy.mockRestore();
  });

  // Mock legacy API responses for testing
  const createLegacyResponse = (overrides = {}) => ({
    callID: "legacy-123",
    message: "Response without usage field",
    // No usage field - legacy response
    ...overrides,
  });

  const createLegacyResponseWithNullUsage = () => ({
    callID: "legacy-null-456",
    message: "Response with null usage field",
    usage: null,
  });

  const createLegacyResponseWithUndefinedUsage = () => ({
    callID: "legacy-undefined-789",
    message: "Response with undefined usage field",
    usage: undefined,
  });

  const createLegacyResponseWithEmptyUsage = () => ({
    callID: "legacy-empty-101",
    message: "Response with empty usage object",
    usage: {},
  });

  const createEnhancedResponse = (overrides = {}) => ({
    callID: "enhanced-123",
    billingID: "bill-456",
    message: "Enhanced response with usage",
    usage: {
      prompt_tokens: 23,
      completion_tokens: 414,
      total_tokens: 437,
      cost: 0.00621621,
      model: "anthropic/claude-sonnet-4",
    },
    ...overrides,
  });

  describe("Legacy Response Scenarios", () => {
    test("should handle API response with only callID and message fields", () => {
      const legacyResponse = createLegacyResponse();
      const result = extractCostData(legacyResponse);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No usage field in API response - backwards compatibility mode"
      );
    });

    test("should handle API response with null usage field", () => {
      const legacyResponse = createLegacyResponseWithNullUsage();
      const result = extractCostData(legacyResponse);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No usage field in API response - backwards compatibility mode"
      );
    });

    test("should handle API response with undefined usage field", () => {
      const legacyResponse = createLegacyResponseWithUndefinedUsage();
      const result = extractCostData(legacyResponse);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No usage field in API response - backwards compatibility mode"
      );
    });

    test("should handle API response with empty usage object", () => {
      const legacyResponse = createLegacyResponseWithEmptyUsage();
      const result = extractCostData(legacyResponse);

      // Empty usage object should be processed (not null), but with default values
      expect(result).toEqual({
        cost: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        model: "unknown",
        callID: "legacy-empty-101",
        billingID: "unknown",
      });
    });
  });

  describe("Pipeline Execution with Legacy Responses", () => {
    let pipelineData;

    beforeEach(() => {
      pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);
    });

    test("should continue pipeline execution with legacy responses", () => {
      const legacyResponse = createLegacyResponse();

      // Adding legacy step should not throw errors
      expect(() => {
        addStepCost(pipelineData, "legacy_step", legacyResponse);
      }).not.toThrow();

      // Pipeline should maintain zero costs
      expect(pipelineData.costs.totalCost).toBe(0);
      expect(pipelineData.costs.totalTokensIn).toBe(0);
      expect(pipelineData.costs.totalTokensOut).toBe(0);
      expect(pipelineData.costs.totalTokens).toBe(0);
      expect(pipelineData.costs.stepCosts).toHaveLength(0);

      // Should log appropriate warning
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No cost data available for step legacy_step"
      );
    });

    test("should handle mixed enhanced and legacy responses gracefully", () => {
      const enhancedResponse = createEnhancedResponse();
      const legacyResponse = createLegacyResponse();

      // Add enhanced response first
      addStepCost(pipelineData, "enhanced_step", enhancedResponse);

      // Add legacy response
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      // Only enhanced response should contribute to costs
      expect(pipelineData.costs.totalCost).toBe(0.00621621);
      expect(pipelineData.costs.totalTokensIn).toBe(23);
      expect(pipelineData.costs.totalTokensOut).toBe(414);
      expect(pipelineData.costs.totalTokens).toBe(437);
      expect(pipelineData.costs.stepCosts).toHaveLength(1);
      expect(pipelineData.costs.stepCosts[0].stepId).toBe("enhanced_step");

      // Should log warnings for legacy step
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No cost data available for step legacy_step"
      );
    });

    test("should handle multiple legacy responses in sequence", () => {
      const legacyResponse1 = createLegacyResponse({ callID: "legacy-1" });
      const legacyResponse2 = createLegacyResponseWithNullUsage();
      const legacyResponse3 = createLegacyResponseWithUndefinedUsage();

      // Add multiple legacy responses
      addStepCost(pipelineData, "legacy_step_1", legacyResponse1);
      addStepCost(pipelineData, "legacy_step_2", legacyResponse2);
      addStepCost(pipelineData, "legacy_step_3", legacyResponse3);

      // All costs should remain zero
      expect(pipelineData.costs.totalCost).toBe(0);
      expect(pipelineData.costs.totalTokensIn).toBe(0);
      expect(pipelineData.costs.totalTokensOut).toBe(0);
      expect(pipelineData.costs.totalTokens).toBe(0);
      expect(pipelineData.costs.stepCosts).toHaveLength(0);

      // Should log warnings for each step
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No cost data available for step legacy_step_1"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No cost data available for step legacy_step_2"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No cost data available for step legacy_step_3"
      );
    });
  });

  describe("Cost Display with Legacy Responses", () => {
    test("should display zero costs when no cost data available", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      const legacyResponse = createLegacyResponse();
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      const summary = formatCostSummary(pipelineData);
      const expectedSummary = [
        "Total Cost USD $ 0.0000",
        "TotalTokens In: 0",
        "TotalTokens Out: 0",
      ].join("\n");

      expect(summary).toBe(expectedSummary);
    });

    test("should generate cost breakdown with no step data for legacy responses", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      const legacyResponse = createLegacyResponse();
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      const breakdown = generateCostBreakdown(pipelineData);

      expect(breakdown.hasCostData).toBe(false);
      expect(breakdown.summary).toBe(
        "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0"
      );
      expect(breakdown.stepDetails).toEqual([]);
    });

    test("should show partial cost data in mixed scenarios", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      const enhancedResponse = createEnhancedResponse({
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          cost: 0.001,
          model: "test-model",
        },
      });
      const legacyResponse = createLegacyResponse();

      // Add both responses
      addStepCost(pipelineData, "enhanced_step", enhancedResponse);
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      const summary = formatCostSummary(pipelineData);
      const expectedSummary = [
        "Total Cost USD $ 0.0010",
        "TotalTokens In: 10",
        "TotalTokens Out: 20",
      ].join("\n");

      expect(summary).toBe(expectedSummary);

      const breakdown = generateCostBreakdown(pipelineData);
      expect(breakdown.hasCostData).toBe(true);
      expect(breakdown.stepDetails).toHaveLength(1);
      expect(breakdown.stepDetails[0].stepId).toBe("enhanced_step");
    });
  });

  describe("Error Handling and Robustness", () => {
    test("should handle malformed legacy responses gracefully", () => {
      // Test responses that should return null
      const nullResponses = [
        null,
        undefined,
        {},
        { callID: null },
        { message: null },
        { callID: "", message: "" },
      ];

      nullResponses.forEach((response, index) => {
        expect(() => {
          const result = extractCostData(response);
          expect(result).toBeNull();
        }).not.toThrow();
      });

      // Test responses with invalid usage fields that get processed with defaults
      const invalidUsageResponses = [
        { usage: "invalid" },
        { usage: 123 },
        { usage: [] },
      ];

      invalidUsageResponses.forEach((response, index) => {
        expect(() => {
          const result = extractCostData(response);
          expect(result).toEqual({
            cost: 0,
            tokensIn: 0,
            tokensOut: 0,
            totalTokens: 0,
            model: "unknown",
            callID: "unknown",
            billingID: "unknown",
          });
        }).not.toThrow();
      });
    });

    test("should maintain pipeline integrity with legacy responses", () => {
      const pipelineData = createPipelineData();

      // Test that pipeline data structure remains intact
      expect(pipelineData.runId).toBeDefined();
      expect(pipelineData.startTime).toBeDefined();
      expect(pipelineData.status).toBe("running");

      // Initialize costs
      initializePipelineCosts(pipelineData);
      expect(pipelineData.costs).toBeDefined();

      // Add legacy step
      const legacyResponse = createLegacyResponse();
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      // Pipeline structure should remain intact
      expect(pipelineData.runId).toBeDefined();
      expect(pipelineData.startTime).toBeDefined();
      expect(pipelineData.status).toBe("running");
      expect(pipelineData.costs).toBeDefined();

      // Complete pipeline
      completePipeline(pipelineData, "completed");
      expect(pipelineData.status).toBe("completed");
      expect(pipelineData.endTime).toBeDefined();
    });

    test("should handle step results with legacy responses", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      const legacyResponse = createLegacyResponse();

      // Add step cost (should handle gracefully)
      addStepCost(pipelineData, "legacy_step", legacyResponse);

      // Add step result using correct API (stepId, type, input, output, status, agentName, metadata)
      addStepResult(
        pipelineData,
        "legacy_step",
        "agent_call",
        { message: "test input" },
        legacyResponse,
        "completed",
        "test_agent"
      );

      expect(pipelineData.steps).toHaveLength(1);
      expect(pipelineData.steps[0].stepId).toBe("legacy_step");
      expect(pipelineData.steps[0].status).toBe("completed");
      expect(pipelineData.steps[0].type).toBe("agent_call");
      expect(pipelineData.steps[0].agentName).toBe("test_agent");
    });
  });

  describe("Console Logging and Warnings", () => {
    test("should log appropriate warnings for missing cost data", () => {
      const legacyResponse = createLegacyResponse();

      extractCostData(legacyResponse);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No usage field in API response - backwards compatibility mode"
      );
    });

    test("should log step-specific warnings when adding legacy costs", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);
      const legacyResponse = createLegacyResponse();

      addStepCost(pipelineData, "test_legacy_step", legacyResponse);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PipelineCost] No cost data available for step test_legacy_step"
      );
    });

    test("should not log errors for successful legacy response handling", () => {
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        const pipelineData = createPipelineData();
        initializePipelineCosts(pipelineData);
        const legacyResponse = createLegacyResponse();

        addStepCost(pipelineData, "legacy_step", legacyResponse);
        formatCostSummary(pipelineData);
        generateCostBreakdown(pipelineData);

        // Should not have logged any errors
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });
  });

  describe("Integration Test - Full Pipeline Simulation", () => {
    test("should simulate complete pipeline with mixed legacy and enhanced responses", () => {
      const pipelineData = createPipelineData();
      initializePipelineCosts(pipelineData);

      // Simulate pipeline steps with mixed responses
      const steps = [
        {
          id: "agent1_initial",
          response: createLegacyResponse({ callID: "legacy-1" }),
        },
        {
          id: "agent2_iteration_1",
          response: createEnhancedResponse({
            callID: "enhanced-1",
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30,
              cost: 0.001,
              model: "model1",
            },
          }),
        },
        {
          id: "agent1_followup_1",
          response: createLegacyResponseWithNullUsage(),
        },
        {
          id: "agent2_iteration_2",
          response: createEnhancedResponse({
            callID: "enhanced-2",
            usage: {
              prompt_tokens: 15,
              completion_tokens: 25,
              total_tokens: 40,
              cost: 0.002,
              model: "model2",
            },
          }),
        },
        {
          id: "conversation_summary",
          response: createLegacyResponseWithEmptyUsage(),
        },
      ];

      // Process all steps
      steps.forEach((step) => {
        addStepCost(pipelineData, step.id, step.response);
        addStepResult(
          pipelineData,
          step.id,
          "agent_call",
          { message: "test input" },
          step.response,
          "completed",
          "test_agent"
        );
      });

      // Verify pipeline execution completed successfully
      expect(pipelineData.steps).toHaveLength(5);
      expect(
        pipelineData.steps.every((step) => step.status === "completed")
      ).toBe(true);

      // Verify cost tracking includes enhanced responses and empty usage object (which gets processed)
      expect(pipelineData.costs.totalCost).toBe(0.003); // 0.001 + 0.002 + 0 (empty usage)
      expect(pipelineData.costs.totalTokensIn).toBe(25); // 10 + 15 + 0 (empty usage)
      expect(pipelineData.costs.totalTokensOut).toBe(45); // 20 + 25 + 0 (empty usage)
      expect(pipelineData.costs.stepCosts).toHaveLength(3); // Enhanced responses + empty usage object

      // Verify cost summary
      const summary = formatCostSummary(pipelineData);
      expect(summary).toContain("Total Cost USD $ 0.0030");
      expect(summary).toContain("TotalTokens In: 25");
      expect(summary).toContain("TotalTokens Out: 45");

      // Verify cost breakdown
      const breakdown = generateCostBreakdown(pipelineData);
      expect(breakdown.hasCostData).toBe(true);
      expect(breakdown.stepDetails).toHaveLength(3);
      expect(breakdown.stepDetails[0].stepId).toBe("agent2_iteration_1");
      expect(breakdown.stepDetails[1].stepId).toBe("agent2_iteration_2");
      expect(breakdown.stepDetails[2].stepId).toBe("conversation_summary");

      // Complete pipeline
      completePipeline(pipelineData, "completed");
      expect(pipelineData.status).toBe("completed");
      expect(pipelineData.endTime).toBeDefined();

      // Verify no errors were thrown during execution
      expect(pipelineData.error).toBeUndefined();
    });
  });
});
