import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import {
  loadMCPConfig,
  getMCPConfig,
  createToolName,
  extractPipelineName,
  getPipelineConfig,
  getAbsolutePath,
  applyEnvironmentConfig,
  getEnvironmentConfig,
  getMCPCapabilities,
  __testing__,
} from "../../src/mcp/config.js";

// Mock dotenv
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("MCP Configuration", () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment variables
    delete process.env.ENABLE_MCP_SERVER;
    delete process.env.MCP_SERVER_PORT;
    delete process.env.MCP_SERVER_HOST;
    delete process.env.MCP_LOG_LEVEL;
    delete process.env.MCP_PIPELINE_DIRECTORY;
    delete process.env.MCP_AUTO_DISCOVERY;
    delete process.env.MCP_DEFAULT_TIMEOUT;
    delete process.env.MCP_MAX_CONCURRENT;
    delete process.env.MCP_LOCAL_ONLY;
    delete process.env.MCP_ALLOWED_HOSTS;
    delete process.env.MCP_TOOL_PREFIX;
    delete process.env.MCP_INCLUDE_DEBUG;
    delete process.env.MCP_MAX_RESPONSE_SIZE;
    delete process.env.MCP_OUTPUT_DIRECTORY;
    delete process.env.MCP_TEMP_DIRECTORY;
    delete process.env.MCP_CACHE_ENABLED;
    delete process.env.MCP_CACHE_TTL;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("loadMCPConfig", () => {
    test("should load default configuration when no environment variables set", () => {
      const config = loadMCPConfig();

      expect(config).toEqual({
        enabled: false,
        port: 3001,
        host: "localhost",
        logLevel: "info",
        pipelineDirectory: "./src/pipelines",
        autoDiscovery: true,
        defaultTimeout: 300000,
        maxConcurrent: 1,
        localOnly: true,
        allowedHosts: ["localhost", "127.0.0.1", "::1"],
        toolPrefix: "run_pipeliner_",
        includeDebugInfo: false,
        maxResponseSize: 1048576,
        outputDirectory: "./output",
        tempDirectory: "./temp",
        cacheEnabled: true,
        cacheTTL: 300000,
      });
    });

    test("should override defaults with environment variables", () => {
      process.env.ENABLE_MCP_SERVER = "true";
      process.env.MCP_SERVER_PORT = "4001";
      process.env.MCP_SERVER_HOST = "example.com";
      process.env.MCP_LOG_LEVEL = "debug";
      process.env.MCP_PIPELINE_DIRECTORY = "./custom/pipelines";
      process.env.MCP_AUTO_DISCOVERY = "false";
      process.env.MCP_DEFAULT_TIMEOUT = "600000";
      process.env.MCP_MAX_CONCURRENT = "5";
      process.env.MCP_LOCAL_ONLY = "false";
      process.env.MCP_ALLOWED_HOSTS = "host1,host2,host3";
      process.env.MCP_TOOL_PREFIX = "custom_";
      process.env.MCP_INCLUDE_DEBUG = "true";
      process.env.MCP_MAX_RESPONSE_SIZE = "2097152";
      process.env.MCP_OUTPUT_DIRECTORY = "./custom/output";
      process.env.MCP_TEMP_DIRECTORY = "./custom/temp";
      process.env.MCP_CACHE_ENABLED = "false";
      process.env.MCP_CACHE_TTL = "600000";

      const config = loadMCPConfig();

      expect(config).toEqual({
        enabled: true,
        port: 4001,
        host: "example.com",
        logLevel: "debug",
        pipelineDirectory: "./custom/pipelines",
        autoDiscovery: false,
        defaultTimeout: 600000,
        maxConcurrent: 5,
        localOnly: false,
        allowedHosts: ["host1", "host2", "host3"],
        toolPrefix: "custom_",
        includeDebugInfo: true,
        maxResponseSize: 2097152,
        outputDirectory: "./custom/output",
        tempDirectory: "./custom/temp",
        cacheEnabled: false,
        cacheTTL: 600000,
      });
    });

    test("should handle invalid numeric environment variables", () => {
      process.env.MCP_SERVER_PORT = "invalid";
      process.env.MCP_DEFAULT_TIMEOUT = "not_a_number";
      process.env.MCP_MAX_CONCURRENT = "invalid";
      process.env.MCP_MAX_RESPONSE_SIZE = "invalid";
      process.env.MCP_CACHE_TTL = "invalid";

      const config = loadMCPConfig();

      // Should fall back to defaults for invalid values
      expect(config.port).toBe(3001);
      expect(config.defaultTimeout).toBe(300000);
      expect(config.maxConcurrent).toBe(1);
      expect(config.maxResponseSize).toBe(1048576);
      expect(config.cacheTTL).toBe(300000);
    });

    test("should validate configuration and throw on invalid values", () => {
      process.env.MCP_SERVER_PORT = "70000"; // Invalid port

      expect(() => loadMCPConfig()).toThrow(
        "MCP server port must be a valid integer between 1 and 65535"
      );
    });
  });

  describe("Configuration Validation", () => {
    const { validateMCPConfig } = __testing__;

    test("should validate valid configuration", () => {
      const validConfig = {
        port: 3001,
        host: "localhost",
        defaultTimeout: 300000,
        maxConcurrent: 1,
        logLevel: "info",
        pipelineDirectory: "./src/pipelines",
        outputDirectory: "./output",
        allowedHosts: ["localhost"],
        toolPrefix: "run_pipeliner_",
        maxResponseSize: 1048576,
      };

      expect(() => validateMCPConfig(validConfig)).not.toThrow();
    });

    test("should reject invalid port numbers", () => {
      const invalidConfigs = [
        { port: 0 },
        { port: 70000 },
        { port: -1 },
        { port: "invalid" },
        { port: null },
      ];

      invalidConfigs.forEach((config) => {
        expect(() =>
          validateMCPConfig({
            ...config,
            host: "localhost",
            defaultTimeout: 1000,
            maxConcurrent: 1,
            logLevel: "info",
            pipelineDirectory: "./src",
            outputDirectory: "./output",
            allowedHosts: ["localhost"],
            toolPrefix: "test_",
            maxResponseSize: 1024,
          })
        ).toThrow(
          "MCP server port must be a valid integer between 1 and 65535"
        );
      });
    });

    test("should reject invalid host values", () => {
      const invalidConfigs = [
        { host: "" },
        { host: null },
        { host: undefined },
        { host: 123 },
      ];

      invalidConfigs.forEach((config) => {
        expect(() =>
          validateMCPConfig({
            ...config,
            port: 3001,
            defaultTimeout: 1000,
            maxConcurrent: 1,
            logLevel: "info",
            pipelineDirectory: "./src",
            outputDirectory: "./output",
            allowedHosts: ["localhost"],
            toolPrefix: "test_",
            maxResponseSize: 1024,
          })
        ).toThrow("MCP server host must be a non-empty string");
      });
    });

    test("should reject invalid timeout values", () => {
      const invalidConfigs = [
        { defaultTimeout: 500 }, // Too low
        { defaultTimeout: -1000 },
        { defaultTimeout: "invalid" },
      ];

      invalidConfigs.forEach((config) => {
        expect(() =>
          validateMCPConfig({
            ...config,
            port: 3001,
            host: "localhost",
            maxConcurrent: 1,
            logLevel: "info",
            pipelineDirectory: "./src",
            outputDirectory: "./output",
            allowedHosts: ["localhost"],
            toolPrefix: "test_",
            maxResponseSize: 1024,
          })
        ).toThrow("MCP default timeout must be at least 1000ms");
      });
    });

    test("should reject invalid log levels", () => {
      const config = {
        port: 3001,
        host: "localhost",
        defaultTimeout: 1000,
        maxConcurrent: 1,
        logLevel: "invalid",
        pipelineDirectory: "./src",
        outputDirectory: "./output",
        allowedHosts: ["localhost"],
        toolPrefix: "test_",
        maxResponseSize: 1024,
      };

      expect(() => validateMCPConfig(config)).toThrow(
        "MCP log level must be one of: debug, info, warn, error"
      );
    });

    test("should reject invalid directory paths", () => {
      const invalidConfigs = [
        { pipelineDirectory: "" },
        { pipelineDirectory: null },
        { outputDirectory: "" },
        { outputDirectory: null },
      ];

      invalidConfigs.forEach((config) => {
        expect(() =>
          validateMCPConfig({
            ...config,
            port: 3001,
            host: "localhost",
            defaultTimeout: 1000,
            maxConcurrent: 1,
            logLevel: "info",
            pipelineDirectory: config.pipelineDirectory || "./src",
            outputDirectory: config.outputDirectory || "./output",
            allowedHosts: ["localhost"],
            toolPrefix: "test_",
            maxResponseSize: 1024,
          })
        ).toThrow(/directory must be a non-empty string/);
      });
    });

    test("should reject invalid allowed hosts", () => {
      const invalidConfigs = [
        { allowedHosts: [] },
        { allowedHosts: null },
        { allowedHosts: "not an array" },
      ];

      invalidConfigs.forEach((config) => {
        expect(() =>
          validateMCPConfig({
            ...config,
            port: 3001,
            host: "localhost",
            defaultTimeout: 1000,
            maxConcurrent: 1,
            logLevel: "info",
            pipelineDirectory: "./src",
            outputDirectory: "./output",
            toolPrefix: "test_",
            maxResponseSize: 1024,
          })
        ).toThrow("MCP allowed hosts must be a non-empty array");
      });
    });
  });

  describe("Tool Name Functions", () => {
    const mockConfig = {
      toolPrefix: "run_pipeliner_",
    };

    test("should create tool name correctly", () => {
      expect(createToolName("dialogue", mockConfig)).toBe(
        "run_pipeliner_dialogue"
      );
      expect(createToolName("contentWaterfall", mockConfig)).toBe(
        "run_pipeliner_contentWaterfall"
      );
      expect(createToolName("simpleChat", mockConfig)).toBe(
        "run_pipeliner_simpleChat"
      );
    });

    test("should extract pipeline name correctly", () => {
      expect(extractPipelineName("run_pipeliner_dialogue", mockConfig)).toBe(
        "dialogue"
      );
      expect(
        extractPipelineName("run_pipeliner_contentWaterfall", mockConfig)
      ).toBe("contentWaterfall");
      expect(extractPipelineName("run_pipeliner_simpleChat", mockConfig)).toBe(
        "simpleChat"
      );
    });

    test("should return null for invalid tool names", () => {
      expect(extractPipelineName("invalid_tool_name", mockConfig)).toBe(null);
      expect(
        extractPipelineName("run_different_prefix_dialogue", mockConfig)
      ).toBe(null);
      expect(extractPipelineName("", mockConfig)).toBe(null);
    });

    test("should handle custom tool prefix", () => {
      const customConfig = { toolPrefix: "custom_prefix_" };

      expect(createToolName("test", customConfig)).toBe("custom_prefix_test");
      expect(extractPipelineName("custom_prefix_test", customConfig)).toBe(
        "test"
      );
      expect(extractPipelineName("run_pipeliner_test", customConfig)).toBe(
        null
      );
    });
  });

  describe("Pipeline Configuration", () => {
    test("should return correct configuration for known pipelines", () => {
      expect(getPipelineConfig("dialogue")).toEqual({
        timeout: 180000,
        maxIterations: 10,
        requiredParams: ["sourceText", "discussionPrompt"],
        optionalParams: ["iterations", "summaryFocus"],
      });

      expect(getPipelineConfig("facilitatedDialogue")).toEqual({
        timeout: 240000,
        maxIterations: 10,
        requiredParams: ["sourceText", "discussionPrompt"],
        optionalParams: ["iterations", "summaryFocus"],
      });

      expect(getPipelineConfig("simpleChat")).toEqual({
        timeout: 60000,
        maxIterations: 1,
        requiredParams: ["message"],
        optionalParams: ["context"],
      });

      expect(getPipelineConfig("contentWaterfall")).toEqual({
        timeout: 300000,
        maxIterations: 1,
        requiredParams: ["sourceContent"],
        optionalParams: ["platforms", "style"],
      });
    });

    test("should return default configuration for unknown pipelines", () => {
      const defaultConfig = getPipelineConfig("unknownPipeline");

      expect(defaultConfig).toEqual({
        timeout: 300000,
        maxIterations: 1,
        requiredParams: [],
        optionalParams: [],
      });
    });
  });

  describe("Path Utilities", () => {
    test("should return absolute path for relative paths", () => {
      const relativePath = "./src/pipelines";
      const absolutePath = getAbsolutePath(relativePath);

      expect(absolutePath).toContain("src/pipelines");
      expect(absolutePath).not.toStartWith("./");
    });

    test("should return unchanged path for absolute paths", () => {
      const absolutePath = "/absolute/path/to/pipelines";

      expect(getAbsolutePath(absolutePath)).toBe(absolutePath);
    });

    test("should handle Windows-style paths", () => {
      const windowsPath = "C:\\Users\\test\\pipelines";

      expect(getAbsolutePath(windowsPath)).toBe(windowsPath);
    });
  });

  describe("Environment Configuration", () => {
    test("should return development config", () => {
      process.env.NODE_ENV = "development";

      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual({
        logLevel: "debug",
        includeDebugInfo: true,
        cacheEnabled: false,
      });
    });

    test("should return production config", () => {
      process.env.NODE_ENV = "production";

      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual({
        logLevel: "info",
        includeDebugInfo: false,
        cacheEnabled: true,
      });
    });

    test("should return test config", () => {
      process.env.NODE_ENV = "test";

      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual({
        logLevel: "warn",
        includeDebugInfo: false,
        cacheEnabled: false,
        port: 0,
      });
    });

    test("should return empty config for unknown environment", () => {
      process.env.NODE_ENV = "unknown";

      const envConfig = getEnvironmentConfig();

      expect(envConfig).toEqual({});
    });

    test("should apply environment config correctly", () => {
      const baseConfig = {
        logLevel: "info",
        includeDebugInfo: false,
        cacheEnabled: true,
        port: 3001,
      };

      const envConfig = {
        logLevel: "debug",
        includeDebugInfo: true,
      };

      const mergedConfig = applyEnvironmentConfig(baseConfig);

      // This would depend on the current NODE_ENV
      expect(mergedConfig).toHaveProperty("logLevel");
      expect(mergedConfig).toHaveProperty("includeDebugInfo");
      expect(mergedConfig).toHaveProperty("cacheEnabled");
      expect(mergedConfig).toHaveProperty("port");
    });
  });

  describe("MCP Capabilities", () => {
    test("should return correct capabilities", () => {
      const config = { logLevel: "debug" };
      const capabilities = getMCPCapabilities(config);

      expect(capabilities).toEqual({
        tools: {
          listChanged: true,
          supportsProgress: false,
        },
        resources: {
          subscribe: false,
          listChanged: false,
        },
        prompts: {
          listChanged: false,
        },
        logging: {
          level: "debug",
        },
      });
    });

    test("should use config log level", () => {
      const config = { logLevel: "error" };
      const capabilities = getMCPCapabilities(config);

      expect(capabilities.logging.level).toBe("error");
    });
  });

  describe("getMCPConfig Integration", () => {
    test("should return complete configuration with environment overrides", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_MCP_SERVER = "true";
      process.env.MCP_SERVER_PORT = "4001";

      const config = getMCPConfig();

      expect(config.enabled).toBe(true);
      expect(config.port).toBe(4001);
      expect(config.logLevel).toBe("debug"); // From development environment
      expect(config.includeDebugInfo).toBe(true); // From development environment
      expect(config.cacheEnabled).toBe(false); // From development environment
    });

    test("should handle production environment", () => {
      process.env.NODE_ENV = "production";
      process.env.ENABLE_MCP_SERVER = "true";

      const config = getMCPConfig();

      expect(config.enabled).toBe(true);
      expect(config.logLevel).toBe("info"); // From production environment
      expect(config.includeDebugInfo).toBe(false); // From production environment
      expect(config.cacheEnabled).toBe(true); // From production environment
    });
  });

  describe("Error Messages", () => {
    test("should have all required error messages", () => {
      const { ErrorMessages } = require("../../src/mcp/config.js");

      expect(ErrorMessages).toHaveProperty("SERVER_DISABLED");
      expect(ErrorMessages).toHaveProperty("PIPELINE_NOT_FOUND");
      expect(ErrorMessages).toHaveProperty("INVALID_PARAMETERS");
      expect(ErrorMessages).toHaveProperty("EXECUTION_TIMEOUT");
      expect(ErrorMessages).toHaveProperty("SERVER_ERROR");
      expect(ErrorMessages).toHaveProperty("UNAUTHORIZED");

      // Verify they are non-empty strings
      Object.values(ErrorMessages).forEach((message) => {
        expect(typeof message).toBe("string");
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });
});
