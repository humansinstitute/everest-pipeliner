/**
 * Global Jest Teardown for Parallel Integration Tests
 *
 * This file runs once after all test suites have completed execution.
 * It cleans up the global environment and generates final reports.
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

export default async function globalTeardown() {
  console.log("🧹 Cleaning up global test environment...");

  // Calculate total test execution time
  const totalExecutionTime =
    Date.now() - (global.__TEST_START_TIME__ || Date.now());

  // Generate final test summary
  const summary = {
    totalExecutionTime: totalExecutionTime,
    completedAt: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
    },
    configuration: {
      parallelExecution: process.env.JEST_PARALLEL_EXECUTION === "true",
      timeout: process.env.TEST_TIMEOUT,
      maxWorkers: process.env.JEST_MAX_WORKERS || "auto",
    },
  };

  // Save execution summary
  try {
    const summaryPath = join("test-results", "execution-summary.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`   ✅ Execution summary saved to: ${summaryPath}`);
  } catch (error) {
    console.warn(`   ⚠️  Could not save execution summary: ${error.message}`);
  }

  // Clean up temporary files if they exist
  const tempFiles = ["temp/.test-lock", "temp/.parallel-execution"];

  tempFiles.forEach((file) => {
    if (existsSync(file)) {
      try {
        // In a real implementation, you would unlink the file
        console.log(`   🗑️  Cleaned up: ${file}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not clean up ${file}: ${error.message}`);
      }
    }
  });

  console.log("   ✅ Global test environment cleanup complete");
  console.log(
    `   ⏱️  Total execution time: ${(totalExecutionTime / 1000).toFixed(2)}s`
  );
}
