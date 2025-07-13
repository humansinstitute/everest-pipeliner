/**
 * Global Jest Setup for Parallel Integration Tests
 *
 * This file runs once before all test suites begin execution.
 * It sets up the global environment for parallel test execution.
 */

import { mkdirSync, existsSync } from "fs";
import { join } from "path";

export default async function globalSetup() {
  console.log(
    "🔧 Setting up global test environment for parallel execution..."
  );

  // Ensure required directories exist
  const directories = [
    "logs",
    "test-results",
    "coverage",
    ".jest-cache",
    "temp",
  ];

  directories.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`   ✅ Created directory: ${dir}`);
    }
  });

  // Set environment variables for test execution
  process.env.NODE_ENV = "test";
  process.env.JEST_PARALLEL_EXECUTION = "true";
  process.env.TEST_TIMEOUT = "600000";

  // Initialize performance monitoring
  global.__TEST_START_TIME__ = Date.now();

  console.log("   ✅ Global test environment setup complete");
}
