import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { ServiceManager } from "../../src/services/serviceManager.js";
import { PipelinerMCPServer } from "../../src/mcp/server.js";
import { getMCPConfig } from "../../src/mcp/config.js";

// Mock dependencies
jest.mock("../../src/mcp/server.js");
jest.mock("../../src/mcp/config.js");

describe("Dual Service Operation Tests", () => {
  let serviceManager;
  let mockMCPConfig;
  let mockMCPServer;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMCPConfig = {
      enabled: true,
      port: 3001,
      host: "localhost",
      logLevel: "info",
      toolPrefix: "run_pipeliner_",
      localOnly: true,
    };

    mockMCPServer = {
      initialize: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue({
        enabled: true,
        initialized: true,
        toolCount: 3,
        tools: [
          "run_pipeliner_dialogue",
          "run_pipeliner_contentWaterfall",
          "run_pipeliner_simpleChat",
        ],
        config: {
          host: "localhost",
          port: 3001,
          logLevel: "info",
          localOnly: true,
        },
      }),
      tools: new Map([
        ["run_pipeliner_dialogue", { name: "run_pipeliner_dialogue" }],
        [
          "run_pipeliner_contentWaterfall",
          { name: "run_pipeliner_contentWaterfall" },
        ],
        ["run_pipeliner_simpleChat", { name: "run_pipeliner_simpleChat" }],
      ]),
      listTools: jest
        .fn()
        .mockReturnValue([
          { name: "run_pipeliner_dialogue" },
          { name: "run_pipeliner_contentWaterfall" },
          { name: "run_pipeliner_simpleChat" },
        ]),
    };

    getMCPConfig.mockReturnValue(mockMCPConfig);
    PipelinerMCPServer.mockImplementation(() => mockMCPServer);

    serviceManager = new ServiceManager();
  });

  afterEach(async () => {
    if (serviceManager) {
      try {
        await serviceManager.stopAllServices();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("Service Manager Initialization", () => {
    test("should initialize with both services stopped", () => {
      expect(serviceManager.serviceStates.mcp).toBe("stopped");
      expect(serviceManager.serviceStates.nostrmq).toBe("stopped");
      expect(serviceManager.services.size).toBe(0);
    });

    test("should track service states correctly", () => {
      const status = serviceManager.getServiceStatus();

      expect(status.services.mcp.state).toBe("stopped");
      expect(status.services.nostrmq.state).toBe("not_implemented");
      expect(status.overall.runningServices).toBe(0);
      expect(status.overall.totalServices).toBe(2);
    });
  });

  describe("MCP Service Management", () => {
    test("should start MCP service successfully", async () => {
      const result = await serviceManager.startMCPServer(mockMCPConfig);

      expect(result.success).toBe(true);
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("running");
      expect(result.details.toolCount).toBe(3);
      expect(result.details.tools).toEqual([
        "run_pipeliner_dialogue",
        "run_pipeliner_contentWaterfall",
        "run_pipeliner_simpleChat",
      ]);

      expect(mockMCPServer.initialize).toHaveBeenCalled();
      expect(mockMCPServer.start).toHaveBeenCalled();
      expect(serviceManager.serviceStates.mcp).toBe("running");
    });

    test("should prevent starting MCP service when already running", async () => {
      // Start service first
      await serviceManager.startMCPServer(mockMCPConfig);

      // Try to start again
      const result = await serviceManager.startMCPServer(mockMCPConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already running");
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("running");
    });

    test("should handle MCP service startup failure", async () => {
      mockMCPServer.initialize.mockRejectedValue(
        new Error("Initialization failed")
      );

      const result = await serviceManager.startMCPServer(mockMCPConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Initialization failed");
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("error");
      expect(serviceManager.serviceStates.mcp).toBe("error");
    });

    test("should stop MCP service successfully", async () => {
      // Start service first
      await serviceManager.startMCPServer(mockMCPConfig);

      // Stop service
      const result = await serviceManager.stopMCPServer();

      expect(result.success).toBe(true);
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("stopped");
      expect(mockMCPServer.stop).toHaveBeenCalled();
      expect(serviceManager.serviceStates.mcp).toBe("stopped");
    });

    test("should handle stopping non-running MCP service", async () => {
      const result = await serviceManager.stopMCPServer();

      expect(result.success).toBe(true);
      expect(result.message).toContain("was not running");
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("stopped");
    });

    test("should restart MCP service successfully", async () => {
      // Start service first
      await serviceManager.startMCPServer(mockMCPConfig);

      // Restart service
      const result = await serviceManager.restartService("mcp");

      expect(result.success).toBe(true);
      expect(result.service).toBe("mcp");
      expect(result.phase).toBe("completed");
      expect(result.stopResult.success).toBe(true);
      expect(result.startResult.success).toBe(true);

      // Should have called stop and start
      expect(mockMCPServer.stop).toHaveBeenCalled();
      expect(mockMCPServer.initialize).toHaveBeenCalledTimes(2); // Initial + restart
      expect(mockMCPServer.start).toHaveBeenCalledTimes(2); // Initial + restart
    });
  });

  describe("NostrMQ Service Management (Placeholder)", () => {
    test("should handle NostrMQ service start request", async () => {
      const result = await serviceManager.startNostrMQService({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("not yet implemented");
      expect(result.service).toBe("nostrmq");
      expect(result.state).toBe("not_implemented");
    });

    test("should handle NostrMQ service stop request", async () => {
      const result = await serviceManager.stopNostrMQService();

      expect(result.success).toBe(true);
      expect(result.message).toContain("not implemented");
      expect(result.service).toBe("nostrmq");
      expect(result.state).toBe("not_implemented");
    });

    test("should restart NostrMQ service (placeholder)", async () => {
      const result = await serviceManager.restartService("nostrmq");

      expect(result.success).toBe(false);
      expect(result.service).toBe("nostrmq");
      expect(result.startResult.error).toContain("not yet implemented");
    });
  });

  describe("Dual Service Operations", () => {
    test("should start both services with partial success", async () => {
      const config = {
        mcp: mockMCPConfig,
        nostrmq: {},
      };

      const result = await serviceManager.startBothServices(config);

      expect(result.overall.success).toBe(true);
      expect(result.overall.partialSuccess).toBe(true);
      expect(result.overall.servicesStarted).toBe(1);
      expect(result.overall.totalServices).toBe(2);

      expect(result.mcp.success).toBe(true);
      expect(result.mcp.service).toBe("mcp");
      expect(result.mcp.state).toBe("running");

      expect(result.nostrmq.success).toBe(false);
      expect(result.nostrmq.service).toBe("nostrmq");
      expect(result.nostrmq.state).toBe("not_implemented");
    });

    test("should handle both services startup failure", async () => {
      // Disable MCP to simulate both services failing
      mockMCPConfig.enabled = false;

      const config = {
        mcp: mockMCPConfig,
        nostrmq: {},
      };

      const result = await serviceManager.startBothServices(config);

      expect(result.overall.success).toBe(false);
      expect(result.overall.servicesStarted).toBe(0);
      expect(result.overall.totalServices).toBe(2);

      expect(result.mcp.success).toBe(false);
      expect(result.mcp.error).toContain("disabled");

      expect(result.nostrmq.success).toBe(false);
      expect(result.nostrmq.error).toContain("not yet implemented");
    });

    test("should stop all services", async () => {
      // Start MCP service first
      await serviceManager.startMCPServer(mockMCPConfig);

      const result = await serviceManager.stopAllServices();

      expect(result.overall.success).toBe(true);
      expect(result.overall.servicesStopped).toBe(2); // Both MCP and NostrMQ (placeholder)

      expect(result.mcp.success).toBe(true);
      expect(result.mcp.service).toBe("mcp");
      expect(result.mcp.state).toBe("stopped");

      expect(result.nostrmq.success).toBe(true);
      expect(result.nostrmq.service).toBe("nostrmq");
      expect(result.nostrmq.state).toBe("not_implemented");
    });
  });

  describe("Service Status and Health Monitoring", () => {
    test("should provide comprehensive service status", async () => {
      // Start MCP service
      await serviceManager.startMCPServer(mockMCPConfig);

      const status = serviceManager.getServiceStatus();

      expect(status.timestamp).toBeDefined();
      expect(status.services.mcp.state).toBe("running");
      expect(status.services.mcp.running).toBe(true);
      expect(status.services.mcp.toolCount).toBe(3);
      expect(status.services.mcp.tools).toEqual([
        "run_pipeliner_dialogue",
        "run_pipeliner_contentWaterfall",
        "run_pipeliner_simpleChat",
      ]);
      expect(status.services.mcp.uptime).toBeGreaterThanOrEqual(0);

      expect(status.services.nostrmq.state).toBe("not_implemented");
      expect(status.services.nostrmq.running).toBe(false);

      expect(status.overall.runningServices).toBe(1);
      expect(status.overall.totalServices).toBe(2);
      expect(status.overall.healthy).toBe(true);
    });

    test("should provide health status information", async () => {
      // Start MCP service
      await serviceManager.startMCPServer(mockMCPConfig);

      const health = serviceManager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.services).toHaveLength(2);

      const mcpService = health.services.find((s) => s.name === "mcp");
      const nostrmqService = health.services.find((s) => s.name === "nostrmq");

      expect(mcpService.healthy).toBe(true);
      expect(mcpService.state).toBe("running");
      expect(mcpService.uptime).toBeGreaterThanOrEqual(0);

      expect(nostrmqService.healthy).toBe(true); // not_implemented is considered healthy
      expect(nostrmqService.state).toBe("not_implemented");

      expect(health.summary.total).toBe(2);
      expect(health.summary.running).toBe(1);
      expect(health.summary.percentage).toBe(50);
    });

    test("should detect unhealthy state when MCP service fails", async () => {
      // Start MCP service
      await serviceManager.startMCPServer(mockMCPConfig);

      // Simulate MCP service error
      mockMCPServer.getStatus.mockImplementation(() => {
        throw new Error("Service error");
      });

      const status = serviceManager.getServiceStatus();

      expect(status.services.mcp.state).toBe("error");
      expect(status.services.mcp.error).toContain("Service error");
      expect(status.overall.healthy).toBe(false);

      const health = serviceManager.getHealthStatus();
      expect(health.healthy).toBe(false);
    });
  });

  describe("Port Conflict Detection", () => {
    test("should check for port conflicts", async () => {
      const conflict = await serviceManager.checkPortConflict(3001);

      // Current implementation returns false (no conflicts)
      // In a real implementation, this would check if port is in use
      expect(typeof conflict).toBe("boolean");
    });

    test("should handle port conflict during startup", async () => {
      // Mock port conflict detection
      serviceManager.checkPortConflict = jest.fn().mockResolvedValue(true);

      const result = await serviceManager.startMCPServer(mockMCPConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Port 3001 is already in use");
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("error");
    });
  });

  describe("Service Manager Lifecycle", () => {
    test("should shutdown gracefully", async () => {
      // Start MCP service
      await serviceManager.startMCPServer(mockMCPConfig);

      // Shutdown service manager
      await serviceManager.shutdown();

      expect(mockMCPServer.stop).toHaveBeenCalled();
      expect(serviceManager.serviceStates.mcp).toBe("stopped");
    });

    test("should handle shutdown errors gracefully", async () => {
      // Start MCP service
      await serviceManager.startMCPServer(mockMCPConfig);

      // Mock stop failure
      mockMCPServer.stop.mockRejectedValue(new Error("Stop failed"));

      await expect(serviceManager.shutdown()).rejects.toThrow("Stop failed");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle invalid service type", async () => {
      const result = await serviceManager.stopService("invalid");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown service type: invalid");
      expect(result.service).toBe("invalid");
    });

    test("should handle restart of unknown service", async () => {
      const result = await serviceManager.restartService("unknown");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown service type: unknown");
      expect(result.service).toBe("unknown");
    });

    test("should handle MCP service disabled scenario", async () => {
      mockMCPConfig.enabled = false;

      const result = await serviceManager.startMCPServer(mockMCPConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("MCP server is disabled");
      expect(result.service).toBe("mcp");
      expect(result.state).toBe("disabled");
    });

    test("should handle service state transitions correctly", async () => {
      // Initial state
      expect(serviceManager.serviceStates.mcp).toBe("stopped");

      // Starting
      const startPromise = serviceManager.startMCPServer(mockMCPConfig);
      expect(serviceManager.serviceStates.mcp).toBe("starting");

      await startPromise;
      expect(serviceManager.serviceStates.mcp).toBe("running");

      // Stopping
      const stopPromise = serviceManager.stopMCPServer();
      expect(serviceManager.serviceStates.mcp).toBe("stopping");

      await stopPromise;
      expect(serviceManager.serviceStates.mcp).toBe("stopped");
    });

    test("should handle concurrent service operations", async () => {
      // Try to start the same service multiple times concurrently
      const promises = [
        serviceManager.startMCPServer(mockMCPConfig),
        serviceManager.startMCPServer(mockMCPConfig),
        serviceManager.startMCPServer(mockMCPConfig),
      ];

      const results = await Promise.all(promises);

      // First should succeed, others should fail with "already running"
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);
      expect(results[1].error).toContain("already running");
      expect(results[2].error).toContain("already running");
    });
  });

  describe("Future NostrMQ Integration Readiness", () => {
    test("should have placeholder structure for NostrMQ service", () => {
      // Verify that the service manager has the structure needed
      // for future NostrMQ implementation
      expect(serviceManager.serviceStates).toHaveProperty("nostrmq");
      expect(typeof serviceManager.startNostrMQService).toBe("function");
      expect(typeof serviceManager.stopNostrMQService).toBe("function");
      expect(typeof serviceManager.getNostrMQStatus).toBe("function");
    });

    test("should support future dual service configuration", async () => {
      const futureConfig = {
        mcp: mockMCPConfig,
        nostrmq: {
          enabled: true,
          relays: ["wss://relay1.example.com", "wss://relay2.example.com"],
          privateKey: "mock-private-key",
          publicKey: "mock-public-key",
        },
      };

      // Should accept the configuration without errors
      const result = await serviceManager.startBothServices(futureConfig);

      expect(result.mcp.success).toBe(true);
      expect(result.nostrmq.success).toBe(false); // Still not implemented
      expect(result.nostrmq.error).toContain("not yet implemented");
    });
  });
});
