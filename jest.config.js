export default {
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {},
  // Enhanced test patterns to include parallel integration tests
  testMatch: [
    "**/tests/**/*.test.js",
    "**/__tests__/**/*.test.js",
    "**/test_*.js", // Include parallel integration test files
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/index.js",
    "!test_*.js", // Exclude integration test files from coverage
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  // Increased timeout for long-running integration tests
  testTimeout: 600000, // 10 minutes for integration tests
  verbose: true,

  // Parallel test execution configuration
  maxWorkers: "50%", // Use 50% of available CPU cores
  maxConcurrency: 5, // Maximum concurrent test suites

  // Performance optimizations
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache",
  clearMocks: true,
  restoreMocks: true,

  // Enhanced error reporting
  errorOnDeprecated: true,
  bail: false, // Continue running tests even if some fail

  // Coverage configuration for parallel tests
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test result processors for CI/CD integration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Global test setup for parallel execution
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",

  // Memory management for large test suites
  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true,

  // Test environment options
  testEnvironmentOptions: {
    node: {
      // Increase memory limit for integration tests
      options: "--max-old-space-size=4096",
    },
  },
};
