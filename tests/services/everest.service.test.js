import { jest } from "@jest/globals";
import { callEverest } from "../../src/services/everest.service.js";
import { createPipelineData } from "../../src/utils/pipelineData.js";

describe("callEverest Service", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    process.env.EVEREST_API_BASE = "https://test.api.com/";
    process.env.EVEREST_API = "test-api-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should successfully call Everest API and update pipeline data", async () => {
    const mockResponse = createMockEverestResponse({
      response: {
        content: "A beautiful poem about penguins dancing on ice...",
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const agentConfig = createMockAgentConfig({
      chat: {
        userPrompt: "Write a poem about penguins",
        systemPrompt: "You are a creative poet",
      },
    });

    const pipelineData = createPipelineData();
    const result = await callEverest(
      agentConfig,
      pipelineData,
      "test-step",
      mockFetch
    );

    expect(result).toEqual(mockResponse);
    expect(pipelineData.steps).toHaveLength(1);
    expect(pipelineData.steps[0].status).toBe("completed");
    expect(pipelineData.steps[0].stepId).toBe("test-step");
    expect(pipelineData.outputs).toHaveLength(1);
  });

  test("should handle API errors gracefully and continue pipeline", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error details",
    });

    const agentConfig = createMockAgentConfig();
    const pipelineData = createPipelineData();
    const result = await callEverest(
      agentConfig,
      pipelineData,
      "error-step",
      mockFetch
    );

    expect(result.error).toContain("Everest API error");
    expect(result.stepId).toBe("error-step");
    expect(pipelineData.steps).toHaveLength(1);
    expect(pipelineData.steps[0].status).toBe("failed");
    expect(pipelineData.outputs).toHaveLength(0); // No outputs for failed steps
  });

  test("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network connection failed"));

    const agentConfig = createMockAgentConfig();
    const pipelineData = createPipelineData();
    const result = await callEverest(
      agentConfig,
      pipelineData,
      "network-error-step",
      mockFetch
    );

    expect(result.error).toContain("Network or processing error");
    expect(result.stepId).toBe("network-error-step");
    expect(pipelineData.steps).toHaveLength(1);
    expect(pipelineData.steps[0].status).toBe("failed");
  });

  test("should handle JSON serialization errors", async () => {
    // Create an agent config with circular reference to cause JSON error
    const agentConfig = createMockAgentConfig();
    agentConfig.circular = agentConfig; // This will cause JSON.stringify to fail

    const pipelineData = createPipelineData();
    const result = await callEverest(
      agentConfig,
      pipelineData,
      "json-error-step",
      mockFetch
    );

    expect(result.error).toContain("JSON serialization error");
    expect(result.stepId).toBe("json-error-step");
    expect(pipelineData.steps).toHaveLength(1);
    expect(pipelineData.steps[0].status).toBe("failed");
  });

  test("should include execution time in step metadata", async () => {
    const mockResponse = createMockEverestResponse();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const agentConfig = createMockAgentConfig();
    const pipelineData = createPipelineData();

    await callEverest(agentConfig, pipelineData, "timing-test-step", mockFetch);

    expect(pipelineData.steps[0].metadata.executionTime).not.toBeNull();
    expect(typeof pipelineData.steps[0].metadata.executionTime).toBe("number");
    expect(pipelineData.steps[0].metadata.executionTime).toBeGreaterThanOrEqual(
      0
    );
  });

  test("should make correct API call with proper headers", async () => {
    const mockResponse = createMockEverestResponse();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const agentConfig = createMockAgentConfig();
    const pipelineData = createPipelineData();

    await callEverest(agentConfig, pipelineData, "api-call-test", mockFetch);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.api.com/v2/agent",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        },
        body: expect.any(String),
      })
    );
  });
});
