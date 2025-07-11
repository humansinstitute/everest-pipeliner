import { jest } from "@jest/globals";
import {
  createPipelineData,
  addStepResult,
  completePipeline,
  getLatestOutput,
  getStepOutput,
  getOutputsByAgent,
  validatePipelineData,
} from "../../src/utils/pipelineData.js";

describe("Pipeline Data Utilities", () => {
  let pipelineData;

  beforeEach(() => {
    pipelineData = createPipelineData();
  });

  describe("createPipelineData", () => {
    test("should create pipeline data with default values", () => {
      expect(pipelineData).toHaveProperty("runId");
      expect(pipelineData).toHaveProperty("steps", []);
      expect(pipelineData).toHaveProperty("outputs", []);
      expect(pipelineData).toHaveProperty("startTime");
      expect(pipelineData).toHaveProperty("status", "running");
      expect(pipelineData).toHaveProperty("metadata");
    });

    test("should create pipeline data with custom runId", () => {
      const customId = "custom-pipeline-id";
      const customPipeline = createPipelineData(customId);
      expect(customPipeline.runId).toBe(customId);
    });

    test("should generate UUID for runId when not provided", () => {
      expect(pipelineData.runId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe("addStepResult", () => {
    test("should add completed step result", () => {
      const stepResult = addStepResult(
        pipelineData,
        "test-step",
        "agent_call",
        { message: "test input" },
        { response: "test output" },
        "completed",
        "testAgent"
      );

      expect(pipelineData.steps).toHaveLength(1);
      expect(stepResult.stepId).toBe("test-step");
      expect(stepResult.status).toBe("completed");
      expect(stepResult.agentName).toBe("testAgent");
      expect(pipelineData.outputs).toHaveLength(1);
    });

    test("should add failed step result without adding to outputs", () => {
      const stepResult = addStepResult(
        pipelineData,
        "failed-step",
        "agent_call",
        { message: "test input" },
        { error: "test error" },
        "failed"
      );

      expect(pipelineData.steps).toHaveLength(1);
      expect(stepResult.status).toBe("failed");
      expect(pipelineData.outputs).toHaveLength(0); // Failed steps don't add outputs
    });

    test("should include execution time in metadata", () => {
      const stepResult = addStepResult(
        pipelineData,
        "timed-step",
        "agent_call",
        {},
        {},
        "completed",
        null,
        { executionTime: 1500 }
      );

      expect(stepResult.metadata.executionTime).toBe(1500);
    });
  });

  describe("completePipeline", () => {
    beforeEach(() => {
      // Add some test steps
      addStepResult(pipelineData, "step1", "agent_call", {}, {}, "completed");
      addStepResult(pipelineData, "step2", "agent_call", {}, {}, "failed");
      addStepResult(pipelineData, "step3", "agent_call", {}, {}, "completed");
    });

    test("should complete pipeline with statistics", () => {
      completePipeline(pipelineData, "completed");

      expect(pipelineData.status).toBe("completed");
      expect(pipelineData).toHaveProperty("endTime");
      expect(pipelineData).toHaveProperty("duration");
      expect(pipelineData).toHaveProperty("statistics");

      const stats = pipelineData.statistics;
      expect(stats.totalSteps).toBe(3);
      expect(stats.completedSteps).toBe(2);
      expect(stats.failedSteps).toBe(1);
      expect(stats.successRate).toBe(66.67); // 2/3 * 100, rounded
    });

    test("should calculate duration correctly", () => {
      // Wait a small amount to ensure duration > 0
      setTimeout(() => {
        completePipeline(pipelineData, "completed");
        expect(pipelineData.duration).toBeGreaterThan(0);
        expect(pipelineData.statistics.durationMs).toBe(pipelineData.duration);
      }, 10);
    });
  });

  describe("getLatestOutput", () => {
    test("should return latest output", () => {
      addStepResult(
        pipelineData,
        "step1",
        "agent_call",
        {},
        { data: "first" },
        "completed"
      );
      addStepResult(
        pipelineData,
        "step2",
        "agent_call",
        {},
        { data: "second" },
        "completed"
      );

      const latest = getLatestOutput(pipelineData);
      expect(latest.data.data).toBe("second");
      expect(latest.stepId).toBe("step2");
    });

    test("should return null when no outputs exist", () => {
      const latest = getLatestOutput(pipelineData);
      expect(latest).toBeNull();
    });
  });

  describe("getStepOutput", () => {
    test("should return output for specific step", () => {
      addStepResult(
        pipelineData,
        "target-step",
        "agent_call",
        {},
        { data: "target" },
        "completed"
      );
      addStepResult(
        pipelineData,
        "other-step",
        "agent_call",
        {},
        { data: "other" },
        "completed"
      );

      const output = getStepOutput(pipelineData, "target-step");
      expect(output.data).toBe("target");
    });

    test("should return null for non-existent step", () => {
      const output = getStepOutput(pipelineData, "non-existent");
      expect(output).toBeNull();
    });
  });

  describe("getOutputsByAgent", () => {
    test("should return outputs filtered by agent name", () => {
      addStepResult(
        pipelineData,
        "step1",
        "agent_call",
        {},
        { data: "agent1-output" },
        "completed",
        "agent1"
      );
      addStepResult(
        pipelineData,
        "step2",
        "agent_call",
        {},
        { data: "agent2-output" },
        "completed",
        "agent2"
      );
      addStepResult(
        pipelineData,
        "step3",
        "agent_call",
        {},
        { data: "agent1-output2" },
        "completed",
        "agent1"
      );

      const agent1Outputs = getOutputsByAgent(pipelineData, "agent1");
      expect(agent1Outputs).toHaveLength(2);
      expect(agent1Outputs[0].agentName).toBe("agent1");
      expect(agent1Outputs[1].agentName).toBe("agent1");
    });

    test("should return empty array for non-existent agent", () => {
      const outputs = getOutputsByAgent(pipelineData, "non-existent-agent");
      expect(outputs).toHaveLength(0);
    });
  });

  describe("validatePipelineData", () => {
    test("should validate correct pipeline data", () => {
      addStepResult(pipelineData, "step1", "agent_call", {}, {}, "completed");
      completePipeline(pipelineData, "completed");

      const validation = validatePipelineData(pipelineData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect missing runId", () => {
      delete pipelineData.runId;
      const validation = validatePipelineData(pipelineData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Missing runId");
    });

    test("should detect invalid steps array", () => {
      pipelineData.steps = "not-an-array";
      const validation = validatePipelineData(pipelineData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Steps must be an array");
    });

    test("should detect invalid status", () => {
      pipelineData.status = "invalid-status";
      const validation = validatePipelineData(pipelineData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Invalid status");
    });
  });
});
