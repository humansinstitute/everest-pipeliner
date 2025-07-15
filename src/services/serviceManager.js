import { PipelinerMCPServer } from "../mcp/server.js";
import { getMCPConfig } from "../mcp/config.js";
import { createMCPLogger } from "../shared/logger.js";

/**
 * Service Manager for Pipeliner
 *
 * Manages both MCP and NostrMQ services, handling their lifecycle,
 * preventing conflicts, and providing unified status reporting.
 */
export class ServiceManager {
  constructor() {
    this.mcpServer = null;
    this.nostrMQService = null;
    this.logger = createMCPLogger({ requestId: "service-manager" });
    this.services = new Map();

    // Service states
    this.serviceStates = {
      mcp: "stopped",
      nostrmq: "stopped",
    };
  }

  /**
   * Starts the MCP server
   * @param {Object} config - Optional MCP configuration override
   * @returns {Promise<Object>} Service start result
   */
  async startMCPServer(config = null) {
    try {
      this.logger.info("Starting MCP server");

      if (this.mcpServer) {
        return {
          success: false,
          error: "MCP server is already running",
          service: "mcp",
          state: this.serviceStates.mcp,
        };
      }

      const mcpConfig = config || getMCPConfig();

      if (!mcpConfig.enabled) {
        return {
          success: false,
          error:
            "MCP server is disabled. Set ENABLE_MCP_SERVER=true to enable.",
          service: "mcp",
          state: "disabled",
        };
      }

      // Check for port conflicts
      const portConflict = await this.checkPortConflict(mcpConfig.port);
      if (portConflict) {
        return {
          success: false,
          error: `Port ${mcpConfig.port} is already in use`,
          service: "mcp",
          state: "error",
        };
      }

      this.serviceStates.mcp = "starting";

      // Create and initialize MCP server
      this.mcpServer = new PipelinerMCPServer(mcpConfig);
      await this.mcpServer.initialize();
      await this.mcpServer.start();

      this.serviceStates.mcp = "running";
      this.services.set("mcp", {
        instance: this.mcpServer,
        config: mcpConfig,
        startTime: new Date(),
        type: "mcp",
      });

      this.logger.info("MCP server started successfully", {
        port: mcpConfig.port,
        toolCount: this.mcpServer.tools.size,
      });

      return {
        success: true,
        service: "mcp",
        state: "running",
        details: {
          port: mcpConfig.port,
          toolCount: this.mcpServer.tools.size,
          tools: this.mcpServer.listTools().map((t) => t.name),
        },
      };
    } catch (error) {
      this.serviceStates.mcp = "error";
      this.mcpServer = null;

      this.logger.error("Failed to start MCP server", error);

      return {
        success: false,
        error: error.message,
        service: "mcp",
        state: "error",
      };
    }
  }

  /**
   * Starts the NostrMQ service (placeholder for future implementation)
   * @param {Object} config - NostrMQ configuration
   * @returns {Promise<Object>} Service start result
   */
  async startNostrMQService(config = null) {
    this.logger.info("NostrMQ service start requested");

    // Placeholder implementation
    return {
      success: false,
      error: "NostrMQ service not yet implemented",
      service: "nostrmq",
      state: "not_implemented",
    };
  }

  /**
   * Starts both MCP and NostrMQ services
   * @param {Object} config - Combined configuration
   * @returns {Promise<Object>} Combined service start result
   */
  async startBothServices(config = {}) {
    this.logger.info("Starting both services (MCP + NostrMQ)");

    const results = {
      mcp: null,
      nostrmq: null,
      overall: {
        success: false,
        servicesStarted: 0,
        totalServices: 2,
      },
    };

    // Start MCP server
    results.mcp = await this.startMCPServer(config.mcp);
    if (results.mcp.success) {
      results.overall.servicesStarted++;
    }

    // Start NostrMQ service
    results.nostrmq = await this.startNostrMQService(config.nostrmq);
    if (results.nostrmq.success) {
      results.overall.servicesStarted++;
    }

    // Determine overall success
    results.overall.success = results.overall.servicesStarted > 0;
    results.overall.partialSuccess =
      results.overall.servicesStarted > 0 &&
      results.overall.servicesStarted < results.overall.totalServices;

    this.logger.info("Both services startup completed", {
      servicesStarted: results.overall.servicesStarted,
      totalServices: results.overall.totalServices,
      success: results.overall.success,
    });

    return results;
  }

  /**
   * Stops a specific service
   * @param {string} serviceType - Type of service ("mcp" or "nostrmq")
   * @returns {Promise<Object>} Service stop result
   */
  async stopService(serviceType) {
    this.logger.info(`Stopping ${serviceType} service`);

    try {
      switch (serviceType) {
        case "mcp":
          return await this.stopMCPServer();
        case "nostrmq":
          return await this.stopNostrMQService();
        default:
          return {
            success: false,
            error: `Unknown service type: ${serviceType}`,
            service: serviceType,
          };
      }
    } catch (error) {
      this.logger.error(`Failed to stop ${serviceType} service`, error);
      return {
        success: false,
        error: error.message,
        service: serviceType,
      };
    }
  }

  /**
   * Stops the MCP server
   * @returns {Promise<Object>} Stop result
   */
  async stopMCPServer() {
    if (!this.mcpServer) {
      return {
        success: true,
        message: "MCP server was not running",
        service: "mcp",
        state: "stopped",
      };
    }

    try {
      this.serviceStates.mcp = "stopping";
      await this.mcpServer.stop();

      this.mcpServer = null;
      this.services.delete("mcp");
      this.serviceStates.mcp = "stopped";

      this.logger.info("MCP server stopped successfully");

      return {
        success: true,
        service: "mcp",
        state: "stopped",
      };
    } catch (error) {
      this.serviceStates.mcp = "error";
      this.logger.error("Failed to stop MCP server", error);

      return {
        success: false,
        error: error.message,
        service: "mcp",
        state: "error",
      };
    }
  }

  /**
   * Stops the NostrMQ service (placeholder)
   * @returns {Promise<Object>} Stop result
   */
  async stopNostrMQService() {
    return {
      success: true,
      message: "NostrMQ service not implemented",
      service: "nostrmq",
      state: "not_implemented",
    };
  }

  /**
   * Stops all running services
   * @returns {Promise<Object>} Combined stop result
   */
  async stopAllServices() {
    this.logger.info("Stopping all services");

    const results = {
      mcp: await this.stopMCPServer(),
      nostrmq: await this.stopNostrMQService(),
      overall: {
        success: true,
        servicesStopped: 0,
      },
    };

    // Count successful stops
    if (results.mcp.success) results.overall.servicesStopped++;
    if (results.nostrmq.success) results.overall.servicesStopped++;

    // Overall success if at least one service stopped successfully
    results.overall.success = results.overall.servicesStopped > 0;

    this.logger.info("All services stop completed", {
      servicesStopped: results.overall.servicesStopped,
      success: results.overall.success,
    });

    return results;
  }

  /**
   * Gets the status of all services
   * @returns {Object} Comprehensive service status
   */
  getServiceStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        mcp: this.getMCPStatus(),
        nostrmq: this.getNostrMQStatus(),
      },
      overall: {
        runningServices: 0,
        totalServices: 2,
        healthy: true,
      },
    };

    // Calculate overall status
    Object.values(status.services).forEach((service) => {
      if (service.state === "running") {
        status.overall.runningServices++;
      }
      if (service.state === "error") {
        status.overall.healthy = false;
      }
    });

    return status;
  }

  /**
   * Gets MCP server status
   * @returns {Object} MCP service status
   */
  getMCPStatus() {
    const baseStatus = {
      state: this.serviceStates.mcp,
      enabled: false,
      running: false,
      error: null,
    };

    if (!this.mcpServer) {
      return {
        ...baseStatus,
        message: "MCP server not running",
      };
    }

    try {
      const serverStatus = this.mcpServer.getStatus();
      const serviceInfo = this.services.get("mcp");

      return {
        ...baseStatus,
        state: "running",
        enabled: serverStatus.enabled,
        running: true,
        toolCount: serverStatus.toolCount,
        tools: serverStatus.tools,
        config: {
          host: serverStatus.config.host,
          port: serverStatus.config.port,
          logLevel: serverStatus.config.logLevel,
          localOnly: serverStatus.config.localOnly,
        },
        startTime: serviceInfo?.startTime,
        uptime: serviceInfo?.startTime
          ? Math.floor((Date.now() - serviceInfo.startTime.getTime()) / 1000)
          : 0,
      };
    } catch (error) {
      return {
        ...baseStatus,
        state: "error",
        error: error.message,
      };
    }
  }

  /**
   * Gets NostrMQ service status (placeholder)
   * @returns {Object} NostrMQ service status
   */
  getNostrMQStatus() {
    return {
      state: "not_implemented",
      enabled: false,
      running: false,
      message: "NostrMQ service not yet implemented",
    };
  }

  /**
   * Restarts a specific service
   * @param {string} serviceType - Type of service to restart
   * @returns {Promise<Object>} Restart result
   */
  async restartService(serviceType) {
    this.logger.info(`Restarting ${serviceType} service`);

    try {
      // Stop the service first
      const stopResult = await this.stopService(serviceType);
      if (!stopResult.success && stopResult.service !== "nostrmq") {
        return {
          success: false,
          error: `Failed to stop ${serviceType}: ${stopResult.error}`,
          service: serviceType,
          phase: "stop",
        };
      }

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start the service
      let startResult;
      switch (serviceType) {
        case "mcp":
          startResult = await this.startMCPServer();
          break;
        case "nostrmq":
          startResult = await this.startNostrMQService();
          break;
        default:
          return {
            success: false,
            error: `Unknown service type: ${serviceType}`,
            service: serviceType,
          };
      }

      return {
        success: startResult.success,
        service: serviceType,
        stopResult,
        startResult,
        phase: startResult.success ? "completed" : "start_failed",
      };
    } catch (error) {
      this.logger.error(`Failed to restart ${serviceType} service`, error);
      return {
        success: false,
        error: error.message,
        service: serviceType,
        phase: "error",
      };
    }
  }

  /**
   * Checks if a port is already in use
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} True if port is in use
   */
  async checkPortConflict(port) {
    // Simple port conflict check - in a real implementation,
    // this would attempt to bind to the port
    return false; // Placeholder - assume no conflicts for now
  }

  /**
   * Gets service health information
   * @returns {Object} Health status of all services
   */
  getHealthStatus() {
    const status = this.getServiceStatus();

    return {
      healthy: status.overall.healthy,
      services: Object.entries(status.services).map(([name, service]) => ({
        name,
        healthy:
          service.state === "running" || service.state === "not_implemented",
        state: service.state,
        uptime: service.uptime || 0,
      })),
      summary: {
        total: status.overall.totalServices,
        running: status.overall.runningServices,
        percentage: Math.round(
          (status.overall.runningServices / status.overall.totalServices) * 100
        ),
      },
    };
  }

  /**
   * Gracefully shuts down the service manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info("Service manager shutting down");

    try {
      await this.stopAllServices();
      this.logger.info("Service manager shutdown completed");
    } catch (error) {
      this.logger.error("Error during service manager shutdown", error);
      throw error;
    }
  }
}

/**
 * Singleton instance for global access
 */
let serviceManagerInstance = null;

/**
 * Gets the singleton service manager instance
 * @returns {ServiceManager} Service manager instance
 */
export function getServiceManager() {
  if (!serviceManagerInstance) {
    serviceManagerInstance = new ServiceManager();
  }
  return serviceManagerInstance;
}

/**
 * Resets the singleton instance (primarily for testing)
 */
export function resetServiceManager() {
  serviceManagerInstance = null;
}
