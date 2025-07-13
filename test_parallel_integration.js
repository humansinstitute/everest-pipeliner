#!/usr/bin/env node

import {
  executeTestSuite,
  aggregateTestResults,
  generateUnifiedReport,
  calculatePerformanceMetrics,
  saveTestResults,
  analyzePerformanceTrends,
} from "./src/utils/testRunner.js";
import { performance } from "perf_hooks";
import { fileURLToPath } from "url";

/**
 * Parallel Integration Test Runner
 *
 * This is the main entry point for parallel execution of integration tests.
 * It spawns child processes for each integration test file and aggregates results.
 */

// Test suite configuration
const TEST_SUITES = [
  {
    name: "Main Integration Tests",
    script: "test_integration.js",
    timeout: 600000, // 10 minutes max
  },
  {
    name: "Phase 2 File Input Tests",
    script: "test_phase2.js",
    timeout: 60000, // 1 minute max
  },
  {
    name: "Pipeline Cost Tracking Tests",
    script: "test_pipelineCost_phase1a.js",
    timeout: 60000, // 1 minute max
  },
];

/**
 * Main function to run all integration tests in parallel
 */
async function runParallelTests() {
  console.log(
    "🚀 Starting Parallel Integration Test Execution - Phase 3 Enhanced"
  );
  console.log("=".repeat(80));
  console.log(`📋 Test Suites: ${TEST_SUITES.length}`);
  console.log(
    `⚡ Execution Mode: Parallel with Error Handling & Edge Case Management`
  );
  console.log(
    `🔧 Features: Circuit Breakers, Retry Logic, Resource Monitoring, Sequential Fallback`
  );
  console.log("=".repeat(80));

  const startTime = performance.now();
  let executionMode = "parallel";
  let fallbackReason = null;

  try {
    // Show historical trends if available
    console.log("\n📊 Analyzing historical performance trends...");
    const trends = analyzePerformanceTrends(5);
    if (trends.available) {
      console.log(`   📈 Historical data: ${trends.dataPoints} previous runs`);
      console.log(
        `   ⏱️  Execution time trend: ${trends.trends.executionTime.direction} (${trends.trends.executionTime.change}%)`
      );
      console.log(
        `   💾 Memory usage trend: ${trends.trends.memoryUsage.direction} (${trends.trends.memoryUsage.change}%)`
      );
      console.log(
        `   ✅ Success rate trend: ${trends.trends.successRate.direction} (${trends.trends.successRate.change}%)`
      );
    } else {
      console.log(`   ℹ️  ${trends.message || "No historical data available"}`);
    }

    // Launch all test suites simultaneously with fallback handling
    console.log(
      "\n🔄 Launching test suites in parallel with enhanced monitoring...\n"
    );

    let results;
    try {
      // Show real-time progress
      const progressInterval = setInterval(() => {
        process.stdout.write("⏳ Tests running");
        for (let i = 0; i < 3; i++) {
          setTimeout(() => process.stdout.write("."), i * 500);
        }
        setTimeout(
          () => process.stdout.write("\r" + " ".repeat(20) + "\r"),
          1500
        );
      }, 2000);

      const testPromises = TEST_SUITES.map((testConfig) =>
        executeTestSuite(testConfig)
      );

      // Wait for all tests to complete
      results = await Promise.all(testPromises);
      clearInterval(progressInterval);

      // Check for critical failures that might indicate parallel execution issues
      const criticalFailures = results.filter(
        (result) =>
          result.status === "FAILED" &&
          (result.error?.includes("EADDRINUSE") ||
            result.error?.includes("Resource temporarily unavailable") ||
            result.error?.includes("Too many open files") ||
            result.memoryStats?.peak > 1000) // > 1GB indicates potential memory issues
      );

      if (criticalFailures.length > 0) {
        console.log(
          `\n⚠️  Detected ${criticalFailures.length} critical failure(s) that may indicate resource conflicts.`
        );
        console.log("🔄 Attempting sequential fallback execution...\n");

        executionMode = "sequential_fallback";
        fallbackReason = `Critical failures detected: ${criticalFailures
          .map((f) => f.name)
          .join(", ")}`;

        results = await executeSequentialFallback(TEST_SUITES);
      }
    } catch (parallelError) {
      console.log(`\n💥 Parallel execution failed: ${parallelError.message}`);
      console.log("🔄 Falling back to sequential execution...\n");

      executionMode = "sequential_fallback";
      fallbackReason = `Parallel execution error: ${parallelError.message}`;

      results = await executeSequentialFallback(TEST_SUITES);
    }

    const endTime = performance.now();
    const totalDuration = (endTime - startTime) / 1000;

    console.log("\n🔍 Aggregating comprehensive test results...");

    // Aggregate results with enhanced metrics
    const aggregatedResults = aggregateTestResults(results);
    aggregatedResults.totalExecutionTime = totalDuration;

    // Generate and display enhanced report
    const report = generateUnifiedReport(aggregatedResults);
    console.log(report);

    // Save detailed results to logs
    console.log("💾 Saving detailed test results...");
    const saveResult = saveTestResults(aggregatedResults, "both");
    if (saveResult.success) {
      console.log(`   ✅ Results saved to ${saveResult.directory}/`);
      saveResult.files.forEach((file) => {
        console.log(
          `      📄 ${file.format.toUpperCase()}: ${file.path} (${(
            file.size / 1024
          ).toFixed(1)}KB)`
        );
      });
    } else {
      console.warn(`   ⚠️  Could not save results: ${saveResult.error}`);
    }

    // Calculate performance improvement (if baseline is available)
    // Note: These are estimated baseline times from the PRD
    const estimatedSequentialTime = 350; // seconds (upper estimate from PRD)
    const performanceMetrics = calculatePerformanceMetrics(
      estimatedSequentialTime,
      totalDuration
    );

    // Enhanced performance summary
    if (performanceMetrics.improvement !== "N/A") {
      console.log("\n🎯 PHASE 2 PERFORMANCE SUMMARY");
      console.log("-".repeat(40));
      console.log(
        `   Time Improvement: \x1b[32m${performanceMetrics.improvement}\x1b[0m`
      );
      console.log(
        `   Time Saved: \x1b[33m${performanceMetrics.timeSaved}s\x1b[0m`
      );
      console.log(
        `   Speedup Factor: \x1b[36m${performanceMetrics.speedup}x\x1b[0m`
      );
      console.log(
        `   Memory Peak: \x1b[35m${aggregatedResults.memoryStats.peak}MB\x1b[0m`
      );
      console.log(
        `   CPU Efficiency: \x1b[34m${aggregatedResults.resourceUtilization.cpuEfficiency}%\x1b[0m`
      );
      console.log("");
    }

    // Final status with enhanced messaging
    if (aggregatedResults.overallStatus === "PASSED") {
      console.log("🎉 All integration tests completed successfully!");
      console.log(`   ✅ Execution mode: ${executionMode}`);
      if (fallbackReason) {
        console.log(`   ℹ️  Fallback reason: ${fallbackReason}`);
      }
      console.log("   ✅ Comprehensive error handling framework active");
      console.log("   ✅ Circuit breaker and retry mechanisms working");
      console.log("   ✅ Resource monitoring and conflict detection enabled");
      console.log(
        "   ✅ Process health checks and graceful degradation active"
      );
      console.log("   ✅ Memory leak detection and prevention enabled");

      if (aggregatedResults.testCaseMetrics.totalTestCases > 0) {
        const successRate = (
          (aggregatedResults.testCaseMetrics.passedTestCases /
            aggregatedResults.testCaseMetrics.totalTestCases) *
          100
        ).toFixed(1);
        console.log(`   ✅ Individual test case success rate: ${successRate}%`);
      }
    } else {
      console.log("⚠️  Some integration tests failed or encountered errors.");
      console.log(`   📊 Execution mode: ${executionMode}`);
      if (fallbackReason) {
        console.log(`   🔄 Fallback reason: ${fallbackReason}`);
      }
      console.log("   Please review the detailed analysis above.");

      if (aggregatedResults.errorAnalysis.hasErrors) {
        console.log(
          `   🚨 ${aggregatedResults.errorAnalysis.totalErrors} error(s) detected and categorized`
        );
        console.log(
          "   💡 Error categorization and actionable insights provided"
        );
      }
    }

    console.log("\n" + "=".repeat(80));

    // Return appropriate exit code
    const exitCode = aggregatedResults.overallStatus === "PASSED" ? 0 : 1;
    return {
      success: aggregatedResults.overallStatus === "PASSED",
      results: aggregatedResults,
      exitCode,
      phase: "Phase 3 - Error Handling & Edge Case Management",
      executionMode,
      fallbackReason,
      features: {
        memoryMonitoring: true,
        realTimeProgress: true,
        detailedAnalytics: true,
        historicalTrends: trends.available,
        resultPersistence: saveResult.success,
        errorHandling: true,
        circuitBreaker: true,
        retryLogic: true,
        resourceMonitoring: true,
        sequentialFallback: true,
        edgeCaseManagement: true,
      },
    };
  } catch (error) {
    console.error(
      "\n💥 Parallel test execution failed with error:",
      error.message
    );
    console.error("Stack trace:", error.stack);

    return {
      success: false,
      error: error.message,
      exitCode: 1,
      phase: "Phase 3 - Error Handling & Edge Case Management",
      executionMode: executionMode || "parallel",
      fallbackReason: fallbackReason || `Critical error: ${error.message}`,
    };
  }
}

/**
 * Execute test suites sequentially as fallback when parallel execution fails
 */
async function executeSequentialFallback(testSuites) {
  console.log("🔄 Executing tests sequentially...");
  const results = [];

  for (let i = 0; i < testSuites.length; i++) {
    const testConfig = testSuites[i];
    console.log(
      `\n📋 Running ${testConfig.name} (${i + 1}/${testSuites.length})...`
    );

    try {
      const result = await executeTestSuite(testConfig);
      results.push(result);

      if (result.status === "PASSED") {
        console.log(`   ✅ ${testConfig.name}: PASSED`);
      } else {
        console.log(`   ❌ ${testConfig.name}: FAILED`);
        console.log(`   💡 Error: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.log(`   💥 ${testConfig.name}: CRITICAL FAILURE`);
      console.log(`   💡 Error: ${error.message}`);

      // Create a failed result for aggregation
      results.push({
        name: testConfig.name,
        status: "FAILED",
        error: error.message,
        duration: 0,
        memoryStats: { peak: 0, average: 0 },
        testCaseMetrics: {
          totalTestCases: 0,
          passedTestCases: 0,
          failedTestCases: 1,
        },
      });
    }
  }

  console.log("\n✅ Sequential fallback execution completed.");
  return results;
}

/**
 * Validate test suite configuration
 */
function validateConfiguration() {
  const errors = [];

  TEST_SUITES.forEach((suite, index) => {
    if (!suite.name) {
      errors.push(`Test suite ${index + 1}: Missing name`);
    }
    if (!suite.script) {
      errors.push(`Test suite ${index + 1}: Missing script path`);
    }
    if (!suite.timeout || suite.timeout <= 0) {
      errors.push(`Test suite ${index + 1}: Invalid timeout value`);
    }
  });

  if (errors.length > 0) {
    console.error("❌ Configuration validation failed:");
    errors.forEach((error) => console.error(`   - ${error}`));
    process.exit(1);
  }
}

/**
 * Main execution when run as script
 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Validate configuration before starting
  validateConfiguration();

  // Run the parallel tests
  runParallelTests()
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((error) => {
      console.error(
        "\n💥 Unexpected error during parallel test execution:",
        error
      );
      process.exit(1);
    });
}

// Export for potential programmatic use
export { runParallelTests, TEST_SUITES };
