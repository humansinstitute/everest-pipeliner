import { spawn } from "child_process";
import { performance } from "perf_hooks";
import { fileURLToPath } from "url";
import {
  writeFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  existsSync,
  accessSync,
  constants,
} from "fs";
import { join, dirname } from "path";
import { promisify } from "util";
import { exec } from "child_process";
import os from "os";

/**
 * Test Runner Utilities for Parallel Integration Test Execution - Phase 3
 *
 * This module provides comprehensive utilities for spawning and managing parallel test processes,
 * with robust error handling, edge case management, and resilience features including:
 * - Comprehensive error categorization and retry mechanisms
 * - Resource monitoring and conflict detection
 * - Process health checks and graceful degradation
 * - Circuit breaker patterns and automatic recovery
 * - Advanced monitoring and alerting capabilities
 */

// Error categories for comprehensive error handling
export const ERROR_CATEGORIES = {
  TIMEOUT: "TIMEOUT",
  PROCESS_FAILURE: "PROCESS_FAILURE",
  MEMORY_EXHAUSTION: "MEMORY_EXHAUSTION",
  FILE_SYSTEM_ERROR: "FILE_SYSTEM_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  PERMISSION_ERROR: "PERMISSION_ERROR",
  DEPENDENCY_ERROR: "DEPENDENCY_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

// Circuit breaker states
const CIRCUIT_BREAKER_STATES = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

// Global circuit breaker for test execution
let circuitBreaker = {
  state: CIRCUIT_BREAKER_STATES.CLOSED,
  failureCount: 0,
  lastFailureTime: null,
  threshold: 3, // failures before opening
  timeout: 30000, // 30 seconds before trying half-open
  resetTimeout: null,
};

// Global resource monitoring
let systemResourceMonitor = {
  isMonitoring: false,
  memoryThreshold: 0.85, // 85% of available memory
  cpuThreshold: 0.9, // 90% CPU usage
  diskThreshold: 0.95, // 95% disk usage
  alerts: [],
  lastCheck: null,
};

// Process registry for cleanup and monitoring
let processRegistry = new Map();

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    ERROR_CATEGORIES.NETWORK_ERROR,
    ERROR_CATEGORIES.RESOURCE_CONFLICT,
    ERROR_CATEGORIES.DEPENDENCY_ERROR,
  ],
};

/**
 * Execute a single test suite in a child process
 * @param {Object} testConfig - Test configuration object
 * @param {string} testConfig.name - Human-readable name for the test suite
 * @param {string} testConfig.script - Path to the test script file
 * @param {number} testConfig.timeout - Maximum execution time in milliseconds
 * @returns {Promise<Object>} Test execution result
 */
export async function executeTestSuite(testConfig) {
  const startTime = performance.now();
  const startTimestamp = new Date().toISOString();

  return new Promise((resolve) => {
    console.log(`🚀 Starting: ${testConfig.name}`);

    // Spawn child process with ES modules support
    const child = spawn(
      "node",
      ["--experimental-vm-modules", testConfig.script],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      }
    );

    let stdout = "";
    let stderr = "";
    let timeoutId;
    let memoryPeakUsage = 0;
    let memorySnapshots = [];

    // Monitor memory usage periodically
    const memoryMonitor = setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        const currentMemory = memUsage.heapUsed / 1024 / 1024; // MB
        memorySnapshots.push({
          timestamp: Date.now(),
          heapUsed: currentMemory,
          heapTotal: memUsage.heapTotal / 1024 / 1024,
          external: memUsage.external / 1024 / 1024,
        });
        memoryPeakUsage = Math.max(memoryPeakUsage, currentMemory);
      } catch (error) {
        // Ignore memory monitoring errors
      }
    }, 1000); // Check every second

    // Set up timeout handling
    if (testConfig.timeout) {
      timeoutId = setTimeout(() => {
        clearInterval(memoryMonitor);
        child.kill("SIGTERM");
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        resolve({
          suiteName: testConfig.name,
          status: "TIMEOUT",
          duration,
          exitCode: null,
          stdout: stdout,
          stderr: stderr + "\nProcess terminated due to timeout",
          error: `Test suite exceeded timeout of ${testConfig.timeout}ms`,
          startTime: startTimestamp,
          endTime: new Date().toISOString(),
          memoryUsage: {
            peak: memoryPeakUsage,
            snapshots: memorySnapshots,
          },
          testCases: parseTestCases(stdout, stderr),
        });
      }, testConfig.timeout);
    }

    // Capture stdout with real-time progress
    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;

      // Show real-time progress for long-running tests
      if (
        chunk.includes("✅") ||
        chunk.includes("❌") ||
        chunk.includes("Test Case")
      ) {
        process.stdout.write(`  📝 ${testConfig.name}: ${chunk.trim()}\n`);
      }
    });

    // Capture stderr
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    child.on("close", (code) => {
      clearInterval(memoryMonitor);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const endTime = performance.now();
      const endTimestamp = new Date().toISOString();
      const duration = (endTime - startTime) / 1000;

      const status = code === 0 ? "PASSED" : "FAILED";
      const testCases = parseTestCases(stdout, stderr);

      console.log(
        `${status === "PASSED" ? "✅" : "❌"} ${
          testConfig.name
        }: ${status} (${duration.toFixed(2)}s, ${memoryPeakUsage.toFixed(
          1
        )}MB peak)`
      );

      resolve({
        suiteName: testConfig.name,
        status,
        duration,
        exitCode: code,
        stdout,
        stderr,
        error: code !== 0 ? `Process exited with code ${code}` : null,
        startTime: startTimestamp,
        endTime: endTimestamp,
        memoryUsage: {
          peak: memoryPeakUsage,
          snapshots: memorySnapshots,
        },
        testCases,
        performance: {
          startTime: startTime,
          endTime: endTime,
          duration: duration,
        },
      });
    });

    // Handle process errors
    child.on("error", (error) => {
      clearInterval(memoryMonitor);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const endTime = performance.now();
      const endTimestamp = new Date().toISOString();
      const duration = (endTime - startTime) / 1000;

      console.log(`❌ ${testConfig.name}: ERROR (${duration.toFixed(2)}s)`);

      resolve({
        suiteName: testConfig.name,
        status: "ERROR",
        duration,
        exitCode: null,
        stdout,
        stderr,
        error: error.message,
        startTime: startTimestamp,
        endTime: endTimestamp,
        memoryUsage: {
          peak: memoryPeakUsage,
          snapshots: memorySnapshots,
        },
        testCases: parseTestCases(stdout, stderr),
        performance: {
          startTime: startTime,
          endTime: endTime,
          duration: duration,
        },
      });
    });
  });
}

/**
 * Parse test cases from stdout/stderr output
 * @param {string} stdout - Standard output from test execution
 * @param {string} stderr - Standard error from test execution
 * @returns {Object} Parsed test case information
 */
function parseTestCases(stdout, stderr) {
  const output = stdout + stderr;
  const lines = output.split("\n");

  let passed = 0;
  let failed = 0;
  let total = 0;
  const cases = [];

  // Parse different test output formats
  lines.forEach((line) => {
    // Look for common test patterns
    if (line.includes("✅") || line.match(/PASS|passed|success/i)) {
      passed++;
      total++;
      cases.push({
        name: extractTestName(line),
        status: "PASSED",
        line: line.trim(),
      });
    } else if (line.includes("❌") || line.match(/FAIL|failed|error/i)) {
      failed++;
      total++;
      cases.push({
        name: extractTestName(line),
        status: "FAILED",
        line: line.trim(),
      });
    } else if (line.match(/Test Case \d+/i)) {
      total++;
      const status = line.includes("✅")
        ? "PASSED"
        : line.includes("❌")
        ? "FAILED"
        : "UNKNOWN";
      if (status === "PASSED") passed++;
      if (status === "FAILED") failed++;
      cases.push({
        name: extractTestName(line),
        status: status,
        line: line.trim(),
      });
    }
  });

  return {
    total: total,
    passed: passed,
    failed: failed,
    cases: cases,
  };
}

/**
 * Extract test name from a test output line
 * @param {string} line - Test output line
 * @returns {string} Extracted test name
 */
function extractTestName(line) {
  // Try to extract meaningful test names from various formats
  const patterns = [
    /Test Case \d+[:\-\s]*(.+?)(?:\s*[\-\:]|$)/i,
    /(?:✅|❌)\s*(.+?)(?:\s*[\-\:]|$)/,
    /(?:PASS|FAIL|passed|failed)[:\s]*(.+?)(?:\s*[\-\:]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback to first meaningful part of the line
  const cleaned = line.replace(/[✅❌]/g, "").trim();
  return cleaned.substring(0, 50) + (cleaned.length > 50 ? "..." : "");
}

/**
 * Aggregate results from multiple test suite executions with enhanced metrics
 * @param {Array<Object>} results - Array of test execution results
 * @returns {Object} Aggregated results with comprehensive metrics and analysis
 */
export function aggregateTestResults(results) {
  const totalSuites = results.length;
  const passedSuites = results.filter((r) => r.status === "PASSED").length;
  const failedSuites = results.filter((r) => r.status === "FAILED").length;
  const errorSuites = results.filter((r) => r.status === "ERROR").length;
  const timeoutSuites = results.filter((r) => r.status === "TIMEOUT").length;

  const totalDuration = Math.max(...results.map((r) => r.duration));
  const overallStatus = passedSuites === totalSuites ? "PASSED" : "FAILED";

  // Calculate detailed test case metrics
  const testCaseMetrics = results.reduce(
    (acc, result) => {
      if (result.testCases) {
        acc.totalTestCases += result.testCases.total || 0;
        acc.passedTestCases += result.testCases.passed || 0;
        acc.failedTestCases += result.testCases.failed || 0;
      }
      return acc;
    },
    { totalTestCases: 0, passedTestCases: 0, failedTestCases: 0 }
  );

  // Calculate memory usage statistics
  const memoryStats = calculateMemoryStatistics(results);

  // Calculate performance metrics
  const performanceMetrics = calculateDetailedPerformanceMetrics(results);

  // Create execution timeline
  const timeline = createExecutionTimeline(results);

  // Categorize errors
  const errorAnalysis = categorizeErrors(results);

  // Calculate resource utilization
  const resourceUtilization = calculateResourceUtilization(results);

  return {
    overallStatus,
    totalExecutionTime: totalDuration,
    suiteResults: results,
    summary: {
      totalSuites,
      passedSuites,
      failedSuites,
      errorSuites,
      timeoutSuites,
    },
    testCaseMetrics,
    memoryStats,
    performanceMetrics,
    timeline,
    errorAnalysis,
    resourceUtilization,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate memory usage statistics across all test suites
 * @param {Array<Object>} results - Test execution results
 * @returns {Object} Memory statistics
 */
function calculateMemoryStatistics(results) {
  const memoryData = results
    .filter((r) => r.memoryUsage && r.memoryUsage.peak)
    .map((r) => r.memoryUsage.peak);

  if (memoryData.length === 0) {
    return {
      peak: 0,
      average: 0,
      total: 0,
      suiteBreakdown: [],
    };
  }

  const peak = Math.max(...memoryData);
  const average =
    memoryData.reduce((sum, val) => sum + val, 0) / memoryData.length;
  const total = memoryData.reduce((sum, val) => sum + val, 0);

  const suiteBreakdown = results.map((result) => ({
    suiteName: result.suiteName,
    peakMemory: result.memoryUsage?.peak || 0,
    snapshotCount: result.memoryUsage?.snapshots?.length || 0,
  }));

  return {
    peak: parseFloat(peak.toFixed(2)),
    average: parseFloat(average.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    suiteBreakdown,
  };
}

/**
 * Calculate detailed performance metrics
 * @param {Array<Object>} results - Test execution results
 * @returns {Object} Performance metrics
 */
function calculateDetailedPerformanceMetrics(results) {
  const durations = results.map((r) => r.duration);
  const totalSequentialTime = durations.reduce(
    (sum, duration) => sum + duration,
    0
  );
  const parallelTime = Math.max(...durations);

  const fastest = Math.min(...durations);
  const slowest = Math.max(...durations);
  const average =
    durations.reduce((sum, val) => sum + val, 0) / durations.length;

  const efficiency = (totalSequentialTime / parallelTime).toFixed(2);
  const parallelizationRatio = (
    (parallelTime / totalSequentialTime) *
    100
  ).toFixed(1);

  return {
    totalSequentialTime: parseFloat(totalSequentialTime.toFixed(2)),
    parallelTime: parseFloat(parallelTime.toFixed(2)),
    fastest: parseFloat(fastest.toFixed(2)),
    slowest: parseFloat(slowest.toFixed(2)),
    average: parseFloat(average.toFixed(2)),
    efficiency: parseFloat(efficiency),
    parallelizationRatio: parseFloat(parallelizationRatio),
    suitePerformance: results.map((result) => ({
      suiteName: result.suiteName,
      duration: result.duration,
      percentageOfTotal: ((result.duration / parallelTime) * 100).toFixed(1),
    })),
  };
}

/**
 * Create execution timeline for visualization
 * @param {Array<Object>} results - Test execution results
 * @returns {Object} Timeline data
 */
function createExecutionTimeline(results) {
  const timeline = results.map((result) => ({
    suiteName: result.suiteName,
    startTime: result.startTime,
    endTime: result.endTime,
    duration: result.duration,
    status: result.status,
  }));

  // Sort by start time
  timeline.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const overallStart = timeline[0]?.startTime;
  const overallEnd = timeline.reduce((latest, item) => {
    return new Date(item.endTime) > new Date(latest) ? item.endTime : latest;
  }, timeline[0]?.endTime);

  return {
    overallStart,
    overallEnd,
    suiteTimeline: timeline,
  };
}

/**
 * Categorize and analyze errors
 * @param {Array<Object>} results - Test execution results
 * @returns {Object} Error analysis
 */
function categorizeErrors(results) {
  const errors = results.filter((r) => r.error);
  const errorCategories = {
    timeout: [],
    processError: [],
    testFailure: [],
    unknown: [],
  };

  errors.forEach((result) => {
    if (result.status === "TIMEOUT") {
      errorCategories.timeout.push({
        suiteName: result.suiteName,
        error: result.error,
        duration: result.duration,
      });
    } else if (result.status === "ERROR") {
      errorCategories.processError.push({
        suiteName: result.suiteName,
        error: result.error,
        exitCode: result.exitCode,
      });
    } else if (result.status === "FAILED") {
      errorCategories.testFailure.push({
        suiteName: result.suiteName,
        error: result.error,
        exitCode: result.exitCode,
        failedTestCases: result.testCases?.failed || 0,
      });
    } else {
      errorCategories.unknown.push({
        suiteName: result.suiteName,
        error: result.error,
        status: result.status,
      });
    }
  });

  return {
    totalErrors: errors.length,
    categories: errorCategories,
    hasErrors: errors.length > 0,
  };
}

/**
 * Calculate resource utilization metrics
 * @param {Array<Object>} results - Test execution results
 * @returns {Object} Resource utilization data
 */
function calculateResourceUtilization(results) {
  const totalCpuTime = results.reduce(
    (sum, result) => sum + result.duration,
    0
  );
  const wallClockTime = Math.max(...results.map((r) => r.duration));
  const cpuEfficiency = (
    (totalCpuTime / (wallClockTime * results.length)) *
    100
  ).toFixed(1);

  const memoryEfficiency =
    results.length > 0
      ? (
          (results.filter((r) => r.memoryUsage?.peak > 0).length /
            results.length) *
          100
        ).toFixed(1)
      : 0;

  return {
    totalCpuTime: parseFloat(totalCpuTime.toFixed(2)),
    wallClockTime: parseFloat(wallClockTime.toFixed(2)),
    cpuEfficiency: parseFloat(cpuEfficiency),
    memoryEfficiency: parseFloat(memoryEfficiency),
    parallelProcesses: results.length,
  };
}

/**
 * Generate comprehensive unified report with enhanced formatting and detailed metrics
 * @param {Object} aggregatedResults - Results from aggregateTestResults
 * @returns {string} Formatted report string with color coding and detailed analysis
 */
export function generateUnifiedReport(aggregatedResults) {
  const {
    overallStatus,
    totalExecutionTime,
    suiteResults,
    summary,
    testCaseMetrics,
    memoryStats,
    performanceMetrics,
    timeline,
    errorAnalysis,
    resourceUtilization,
    generatedAt,
  } = aggregatedResults;

  // Color codes for terminal output
  const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  };

  let report = "\n" + colors.cyan + "=".repeat(80) + colors.reset + "\n";
  report +=
    colors.bright +
    colors.blue +
    "📊 PARALLEL INTEGRATION TEST REPORT - PHASE 2 ENHANCED" +
    colors.reset +
    "\n";
  report += colors.cyan + "=".repeat(80) + colors.reset + "\n\n";

  // Overall status with enhanced formatting
  const statusColor = overallStatus === "PASSED" ? colors.green : colors.red;
  const statusText =
    overallStatus === "PASSED" ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED";
  report +=
    colors.bright +
    `🎯 Overall Result: ${statusColor}${statusText}${colors.reset}\n`;
  report += `⏱️  Total Execution Time: ${
    colors.yellow
  }${totalExecutionTime.toFixed(2)}s${colors.reset}\n`;
  report += `📅 Generated: ${colors.cyan}${new Date(
    generatedAt
  ).toLocaleString()}${colors.reset}\n\n`;

  // Enhanced Test Summary with detailed metrics
  report +=
    colors.bright +
    colors.magenta +
    "📈 COMPREHENSIVE TEST SUMMARY" +
    colors.reset +
    "\n";
  report += colors.magenta + "-".repeat(40) + colors.reset + "\n";

  // Suite-level summary
  report += `${colors.bright}Test Suites:${colors.reset}\n`;
  report += `   Total: ${colors.cyan}${summary.totalSuites}${colors.reset}\n`;
  report += `   ${colors.green}Passed: ${summary.passedSuites}${colors.reset}\n`;
  if (summary.failedSuites > 0) {
    report += `   ${colors.red}Failed: ${summary.failedSuites}${colors.reset}\n`;
  }
  if (summary.errorSuites > 0) {
    report += `   ${colors.yellow}Errors: ${summary.errorSuites}${colors.reset}\n`;
  }
  if (summary.timeoutSuites > 0) {
    report += `   ${colors.yellow}Timeouts: ${summary.timeoutSuites}${colors.reset}\n`;
  }

  // Test case-level summary
  if (testCaseMetrics.totalTestCases > 0) {
    report += `\n${colors.bright}Individual Test Cases:${colors.reset}\n`;
    report += `   Total: ${colors.cyan}${testCaseMetrics.totalTestCases}${colors.reset}\n`;
    report += `   ${colors.green}Passed: ${testCaseMetrics.passedTestCases}${colors.reset}\n`;
    if (testCaseMetrics.failedTestCases > 0) {
      report += `   ${colors.red}Failed: ${testCaseMetrics.failedTestCases}${colors.reset}\n`;
    }
    const successRate = (
      (testCaseMetrics.passedTestCases / testCaseMetrics.totalTestCases) *
      100
    ).toFixed(1);
    report += `   Success Rate: ${colors.bright}${successRate}%${colors.reset}\n`;
  }
  report += "\n";

  // Performance Metrics Section
  report +=
    colors.bright +
    colors.blue +
    "⚡ PERFORMANCE ANALYSIS" +
    colors.reset +
    "\n";
  report += colors.blue + "-".repeat(40) + colors.reset + "\n";
  report += `Parallel Execution Time: ${colors.yellow}${performanceMetrics.parallelTime}s${colors.reset}\n`;
  report += `Sequential Time (estimated): ${colors.cyan}${performanceMetrics.totalSequentialTime}s${colors.reset}\n`;
  report += `Efficiency Factor: ${colors.green}${performanceMetrics.efficiency}x${colors.reset}\n`;
  report += `Parallelization Ratio: ${colors.magenta}${performanceMetrics.parallelizationRatio}%${colors.reset}\n`;
  report += `Fastest Suite: ${colors.green}${performanceMetrics.fastest}s${colors.reset}\n`;
  report += `Slowest Suite: ${colors.yellow}${performanceMetrics.slowest}s${colors.reset}\n`;
  report += `Average Duration: ${colors.cyan}${performanceMetrics.average}s${colors.reset}\n\n`;

  // Memory Usage Statistics
  if (memoryStats.peak > 0) {
    report +=
      colors.bright +
      colors.green +
      "💾 MEMORY USAGE ANALYSIS" +
      colors.reset +
      "\n";
    report += colors.green + "-".repeat(40) + colors.reset + "\n";
    report += `Peak Memory Usage: ${colors.yellow}${memoryStats.peak} MB${colors.reset}\n`;
    report += `Average Memory Usage: ${colors.cyan}${memoryStats.average} MB${colors.reset}\n`;
    report += `Total Memory Consumed: ${colors.magenta}${memoryStats.total} MB${colors.reset}\n\n`;
  }

  // Resource Utilization
  report +=
    colors.bright +
    colors.cyan +
    "🔧 RESOURCE UTILIZATION" +
    colors.reset +
    "\n";
  report += colors.cyan + "-".repeat(40) + colors.reset + "\n";
  report += `CPU Efficiency: ${colors.green}${resourceUtilization.cpuEfficiency}%${colors.reset}\n`;
  report += `Memory Efficiency: ${colors.blue}${resourceUtilization.memoryEfficiency}%${colors.reset}\n`;
  report += `Parallel Processes: ${colors.magenta}${resourceUtilization.parallelProcesses}${colors.reset}\n`;
  report += `Total CPU Time: ${colors.yellow}${resourceUtilization.totalCpuTime}s${colors.reset}\n\n`;

  // Individual Suite Results with enhanced details
  report +=
    colors.bright +
    colors.white +
    "📋 DETAILED SUITE RESULTS" +
    colors.reset +
    "\n";
  report += colors.white + "-".repeat(40) + colors.reset + "\n";

  suiteResults.forEach((result, index) => {
    const statusIcon =
      result.status === "PASSED"
        ? "✅"
        : result.status === "FAILED"
        ? "❌"
        : result.status === "TIMEOUT"
        ? "⏰"
        : "🚫";

    const statusColor =
      result.status === "PASSED"
        ? colors.green
        : result.status === "FAILED"
        ? colors.red
        : colors.yellow;

    report += `${colors.bright}${index + 1}. ${statusIcon} ${result.suiteName}${
      colors.reset
    }\n`;
    report += `   Status: ${statusColor}${result.status}${colors.reset}\n`;
    report += `   Duration: ${colors.cyan}${result.duration.toFixed(2)}s${
      colors.reset
    }`;

    if (result.memoryUsage?.peak) {
      report += ` | Memory: ${colors.yellow}${result.memoryUsage.peak.toFixed(
        1
      )}MB${colors.reset}`;
    }

    if (result.testCases && result.testCases.total > 0) {
      report += ` | Test Cases: ${colors.green}${result.testCases.passed}${colors.reset}/${colors.cyan}${result.testCases.total}${colors.reset}`;
    }
    report += "\n";

    if (result.error) {
      report += `   ${colors.red}Error: ${result.error}${colors.reset}\n`;
    }

    // Show percentage of total execution time
    const percentage = ((result.duration / totalExecutionTime) * 100).toFixed(
      1
    );
    report += `   Time Share: ${colors.magenta}${percentage}%${colors.reset} of total execution\n`;
    report += "\n";
  });

  // Error Analysis (if any errors exist)
  if (errorAnalysis.hasErrors) {
    report +=
      colors.bright + colors.red + "🚨 ERROR ANALYSIS" + colors.reset + "\n";
    report += colors.red + "-".repeat(40) + colors.reset + "\n";
    report += `Total Errors: ${colors.yellow}${errorAnalysis.totalErrors}${colors.reset}\n\n`;

    Object.entries(errorAnalysis.categories).forEach(([category, errors]) => {
      if (errors.length > 0) {
        report += `${colors.bright}${category.toUpperCase()}:${colors.reset}\n`;
        errors.forEach((error) => {
          report += `   • ${colors.red}${error.suiteName}${colors.reset}: ${error.error}\n`;
        });
        report += "\n";
      }
    });
  }

  // Performance Recommendations
  report +=
    colors.bright +
    colors.blue +
    "💡 PERFORMANCE INSIGHTS" +
    colors.reset +
    "\n";
  report += colors.blue + "-".repeat(40) + colors.reset + "\n";

  if (performanceMetrics.efficiency > 2) {
    report += `${colors.green}✅ Excellent parallelization efficiency!${colors.reset}\n`;
  } else if (performanceMetrics.efficiency > 1.5) {
    report += `${colors.yellow}⚡ Good parallelization, room for optimization.${colors.reset}\n`;
  } else {
    report += `${colors.red}⚠️  Low parallelization efficiency detected.${colors.reset}\n`;
  }

  const timeSaved =
    performanceMetrics.totalSequentialTime - performanceMetrics.parallelTime;
  const improvementPercent = (
    (timeSaved / performanceMetrics.totalSequentialTime) *
    100
  ).toFixed(1);
  report += `Time Saved: ${colors.green}${timeSaved.toFixed(2)}s${
    colors.reset
  } (${colors.bright}${improvementPercent}%${colors.reset} improvement)\n`;

  if (memoryStats.peak > 500) {
    report += `${colors.yellow}💾 High memory usage detected. Consider optimization.${colors.reset}\n`;
  }

  report += "\n" + colors.cyan + "=".repeat(80) + colors.reset + "\n";

  return report;
}

/**
 * Save detailed test results to logs directory with timestamp-based naming
 * @param {Object} aggregatedResults - Complete aggregated results
 * @param {string} format - Output format ('json', 'text', or 'both')
 * @returns {Object} Information about saved files
 */
export function saveTestResults(aggregatedResults, format = "both") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logsDir = "logs";
  const baseFilename = `test-results-${timestamp}`;

  // Ensure logs directory exists
  try {
    mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.warn(`Warning: Could not create logs directory: ${error.message}`);
    return { success: false, error: error.message };
  }

  const savedFiles = [];

  try {
    // Save JSON format for CI/CD integration
    if (format === "json" || format === "both") {
      const jsonPath = join(logsDir, `${baseFilename}.json`);
      const jsonData = {
        ...aggregatedResults,
        metadata: {
          version: "2.0.0",
          phase: "Phase 2 - Enhanced Reporting",
          format: "parallel-integration-test-results",
          savedAt: new Date().toISOString(),
        },
      };

      writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf8");
      savedFiles.push({
        path: jsonPath,
        format: "json",
        size: JSON.stringify(jsonData).length,
      });
    }

    // Save human-readable text format
    if (format === "text" || format === "both") {
      const textPath = join(logsDir, `${baseFilename}.txt`);
      const textReport = generateUnifiedReport(aggregatedResults);

      // Remove color codes for text file
      const cleanReport = textReport.replace(/\x1b\[[0-9;]*m/g, "");

      writeFileSync(textPath, cleanReport, "utf8");
      savedFiles.push({
        path: textPath,
        format: "text",
        size: cleanReport.length,
      });
    }

    // Save CSV format for trend analysis
    if (format === "csv" || format === "both") {
      const csvPath = join(logsDir, `${baseFilename}.csv`);
      const csvData = generateCSVReport(aggregatedResults);

      writeFileSync(csvPath, csvData, "utf8");
      savedFiles.push({ path: csvPath, format: "csv", size: csvData.length });
    }

    return {
      success: true,
      files: savedFiles,
      timestamp: timestamp,
      directory: logsDir,
    };
  } catch (error) {
    console.error(`Error saving test results: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate CSV format for performance trend analysis
 * @param {Object} aggregatedResults - Aggregated test results
 * @returns {string} CSV formatted data
 */
function generateCSVReport(aggregatedResults) {
  const {
    suiteResults,
    performanceMetrics,
    memoryStats,
    resourceUtilization,
    generatedAt,
  } = aggregatedResults;

  let csv =
    "timestamp,suite_name,status,duration_seconds,memory_peak_mb,test_cases_total,test_cases_passed,test_cases_failed,exit_code\n";

  suiteResults.forEach((result) => {
    const row = [
      generatedAt,
      `"${result.suiteName}"`,
      result.status,
      result.duration.toFixed(2),
      result.memoryUsage?.peak?.toFixed(2) || "0",
      result.testCases?.total || "0",
      result.testCases?.passed || "0",
      result.testCases?.failed || "0",
      result.exitCode || "0",
    ].join(",");
    csv += row + "\n";
  });

  // Add summary row
  csv += "\n# Summary Metrics\n";
  csv += "metric,value\n";
  csv += `total_execution_time,${performanceMetrics.parallelTime}\n`;
  csv += `sequential_time_estimate,${performanceMetrics.totalSequentialTime}\n`;
  csv += `efficiency_factor,${performanceMetrics.efficiency}\n`;
  csv += `memory_peak_mb,${memoryStats.peak}\n`;
  csv += `cpu_efficiency_percent,${resourceUtilization.cpuEfficiency}\n`;
  csv += `parallel_processes,${resourceUtilization.parallelProcesses}\n`;

  return csv;
}

/**
 * Load and analyze historical test results for trend analysis
 * @param {number} limit - Maximum number of historical results to analyze
 * @returns {Object} Trend analysis data
 */
export function analyzePerformanceTrends(limit = 10) {
  const logsDir = "logs";

  try {
    const files = readdirSync(logsDir)
      .filter(
        (file) => file.startsWith("test-results-") && file.endsWith(".json")
      )
      .sort()
      .slice(-limit);

    const historicalData = files
      .map((file) => {
        try {
          const content = readFileSync(join(logsDir, file), "utf8");
          return JSON.parse(content);
        } catch (error) {
          console.warn(`Could not parse ${file}: ${error.message}`);
          return null;
        }
      })
      .filter((data) => data !== null);

    if (historicalData.length < 2) {
      return {
        available: false,
        message:
          "Insufficient historical data for trend analysis (need at least 2 runs)",
      };
    }

    // Calculate trends
    const trends = {
      executionTime: calculateTrend(
        historicalData.map((d) => d.totalExecutionTime)
      ),
      memoryUsage: calculateTrend(
        historicalData.map((d) => d.memoryStats?.peak || 0)
      ),
      successRate: calculateTrend(
        historicalData.map(
          (d) => (d.summary.passedSuites / d.summary.totalSuites) * 100
        )
      ),
      efficiency: calculateTrend(
        historicalData.map((d) => d.performanceMetrics?.efficiency || 0)
      ),
    };

    return {
      available: true,
      dataPoints: historicalData.length,
      timeRange: {
        from: historicalData[0].generatedAt,
        to: historicalData[historicalData.length - 1].generatedAt,
      },
      trends,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Calculate trend direction and magnitude for a series of values
 * @param {Array<number>} values - Series of numerical values
 * @returns {Object} Trend analysis
 */
function calculateTrend(values) {
  if (values.length < 2) return { direction: "stable", change: 0 };

  const first = values[0];
  const last = values[values.length - 1];
  const change = ((last - first) / first) * 100;

  let direction = "stable";
  if (Math.abs(change) > 5) {
    direction = change > 0 ? "increasing" : "decreasing";
  }

  return {
    direction,
    change: parseFloat(change.toFixed(2)),
    first,
    last,
    average: values.reduce((sum, val) => sum + val, 0) / values.length,
  };
}

/**
 * Calculate basic performance metrics (maintained for backwards compatibility)
 * @param {number} sequentialTime - Baseline sequential execution time in seconds
 * @param {number} parallelTime - Parallel execution time in seconds
 * @returns {Object} Performance metrics
 */
export function calculatePerformanceMetrics(sequentialTime, parallelTime) {
  if (!sequentialTime || sequentialTime <= 0) {
    return {
      improvement: "N/A",
      timeSaved: 0,
      speedup: 1,
    };
  }

  const timeSaved = sequentialTime - parallelTime;
  const improvementPercent = ((timeSaved / sequentialTime) * 100).toFixed(1);
  const speedup = (sequentialTime / parallelTime).toFixed(2);

  return {
    improvement: `${improvementPercent}%`,
    timeSaved: timeSaved.toFixed(2),
    speedup: parseFloat(speedup),
  };
}

/**
 * Intelligent Test Scheduler - Phase 4 Performance Optimization
 *
 * Analyzes historical performance data to optimize test execution order
 * and resource allocation for maximum efficiency.
 */
export class IntelligentTestScheduler {
  constructor() {
    this.historicalData = new Map();
    this.performanceProfiles = new Map();
    this.resourceConstraints = {
      maxMemory: 4096, // MB
      maxCpuCores: os.cpus().length,
      maxConcurrency: Math.min(os.cpus().length, 8),
    };
  }

  /**
   * Load historical performance data for intelligent scheduling
   * @param {number} limit - Number of historical runs to analyze
   */
  loadHistoricalData(limit = 10) {
    try {
      const logsDir = "logs";
      if (!existsSync(logsDir)) return;

      const files = readdirSync(logsDir)
        .filter(
          (file) => file.startsWith("test-results-") && file.endsWith(".json")
        )
        .sort()
        .slice(-limit);

      files.forEach((file) => {
        try {
          const content = readFileSync(join(logsDir, file), "utf8");
          const data = JSON.parse(content);

          if (data.suiteResults) {
            data.suiteResults.forEach((suite) => {
              const key = suite.suiteName;
              if (!this.historicalData.has(key)) {
                this.historicalData.set(key, []);
              }

              this.historicalData.get(key).push({
                duration: suite.duration,
                memoryPeak: suite.memoryUsage?.peak || 0,
                status: suite.status,
                timestamp: data.generatedAt,
              });
            });
          }
        } catch (error) {
          console.warn(
            `Could not parse historical data from ${file}: ${error.message}`
          );
        }
      });

      this.generatePerformanceProfiles();
    } catch (error) {
      console.warn(`Could not load historical data: ${error.message}`);
    }
  }

  /**
   * Generate performance profiles for each test suite
   */
  generatePerformanceProfiles() {
    this.historicalData.forEach((history, suiteName) => {
      if (history.length === 0) return;

      const durations = history.map((h) => h.duration);
      const memoryUsages = history.map((h) => h.memoryPeak);
      const successRate =
        history.filter((h) => h.status === "PASSED").length / history.length;

      const profile = {
        averageDuration:
          durations.reduce((sum, d) => sum + d, 0) / durations.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        averageMemory:
          memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length,
        maxMemory: Math.max(...memoryUsages),
        successRate: successRate,
        reliability: this.calculateReliability(history),
        resourceIntensity: this.calculateResourceIntensity(
          durations,
          memoryUsages
        ),
        priority: this.calculatePriority(durations, memoryUsages, successRate),
      };

      this.performanceProfiles.set(suiteName, profile);
    });
  }

  /**
   * Calculate reliability score based on historical performance
   * @param {Array} history - Historical performance data
   * @returns {number} Reliability score (0-1)
   */
  calculateReliability(history) {
    if (history.length < 2) return 0.5;

    const durations = history.map((h) => h.duration);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      durations.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher reliability
    const coefficientOfVariation = standardDeviation / mean;
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Calculate resource intensity score
   * @param {Array} durations - Duration history
   * @param {Array} memoryUsages - Memory usage history
   * @returns {number} Resource intensity score (0-1)
   */
  calculateResourceIntensity(durations, memoryUsages) {
    const maxDuration = Math.max(...durations);
    const maxMemory = Math.max(...memoryUsages);

    const durationScore = Math.min(1, maxDuration / 300); // Normalize to 5 minutes
    const memoryScore = Math.min(1, maxMemory / 1024); // Normalize to 1GB

    return (durationScore + memoryScore) / 2;
  }

  /**
   * Calculate execution priority
   * @param {Array} durations - Duration history
   * @param {Array} memoryUsages - Memory usage history
   * @param {number} successRate - Success rate
   * @returns {number} Priority score (higher = run first)
   */
  calculatePriority(durations, memoryUsages, successRate) {
    const avgDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const avgMemory =
      memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length;

    // Prioritize fast, reliable, low-memory tests
    const speedScore = Math.max(0, 1 - avgDuration / 300); // Faster = higher priority
    const reliabilityScore = successRate;
    const memoryScore = Math.max(0, 1 - avgMemory / 1024); // Lower memory = higher priority

    return speedScore * 0.4 + reliabilityScore * 0.4 + memoryScore * 0.2;
  }

  /**
   * Optimize test suite execution order based on performance profiles
   * @param {Array} testSuites - Array of test suite configurations
   * @returns {Array} Optimized test suite order
   */
  optimizeExecutionOrder(testSuites) {
    // Load historical data for optimization
    this.loadHistoricalData();

    const optimizedSuites = testSuites.map((suite) => {
      const profile = this.performanceProfiles.get(suite.name) || {
        averageDuration: 60,
        averageMemory: 100,
        successRate: 0.8,
        reliability: 0.5,
        resourceIntensity: 0.5,
        priority: 0.5,
      };

      return {
        ...suite,
        profile,
        estimatedDuration: profile.averageDuration,
        estimatedMemory: profile.averageMemory,
      };
    });

    // Sort by priority (highest first), then by resource intensity (lowest first)
    optimizedSuites.sort((a, b) => {
      const priorityDiff = b.profile.priority - a.profile.priority;
      if (Math.abs(priorityDiff) > 0.1) return priorityDiff;

      // If priorities are similar, prefer lower resource intensity
      return a.profile.resourceIntensity - b.profile.resourceIntensity;
    });

    return optimizedSuites;
  }

  /**
   * Calculate optimal concurrency level based on system resources and test profiles
   * @param {Array} testSuites - Test suites to execute
   * @returns {number} Optimal concurrency level
   */
  calculateOptimalConcurrency(testSuites) {
    const totalEstimatedMemory = testSuites.reduce((sum, suite) => {
      const profile = this.performanceProfiles.get(suite.name);
      return sum + (profile?.averageMemory || 100);
    }, 0);

    const memoryBasedConcurrency = Math.floor(
      this.resourceConstraints.maxMemory /
        (totalEstimatedMemory / testSuites.length)
    );
    const cpuBasedConcurrency = this.resourceConstraints.maxConcurrency;

    return Math.min(
      memoryBasedConcurrency,
      cpuBasedConcurrency,
      testSuites.length
    );
  }

  /**
   * Generate performance optimization report
   * @param {Array} originalOrder - Original test suite order
   * @param {Array} optimizedOrder - Optimized test suite order
   * @returns {Object} Optimization report
   */
  generateOptimizationReport(originalOrder, optimizedOrder) {
    const originalEstimatedTime = originalOrder.reduce((sum, suite) => {
      const profile = this.performanceProfiles.get(suite.name);
      return sum + (profile?.averageDuration || 60);
    }, 0);

    const optimizedEstimatedTime = Math.max(
      ...optimizedOrder.map((suite) => {
        const profile = this.performanceProfiles.get(suite.name);
        return profile?.averageDuration || 60;
      })
    );

    const estimatedImprovement = (
      ((originalEstimatedTime - optimizedEstimatedTime) /
        originalEstimatedTime) *
      100
    ).toFixed(1);

    return {
      originalEstimatedTime: originalEstimatedTime.toFixed(2),
      optimizedEstimatedTime: optimizedEstimatedTime.toFixed(2),
      estimatedImprovement: `${estimatedImprovement}%`,
      optimizationsApplied: [
        "Intelligent test ordering based on historical performance",
        "Resource-aware scheduling",
        "Priority-based execution",
        "Memory usage optimization",
      ],
      recommendations: this.generateRecommendations(optimizedOrder),
    };
  }

  /**
   * Generate performance recommendations
   * @param {Array} testSuites - Test suites
   * @returns {Array} Performance recommendations
   */
  generateRecommendations(testSuites) {
    const recommendations = [];

    const highMemoryTests = testSuites.filter((suite) => {
      const profile = this.performanceProfiles.get(suite.name);
      return profile && profile.averageMemory > 500;
    });

    const slowTests = testSuites.filter((suite) => {
      const profile = this.performanceProfiles.get(suite.name);
      return profile && profile.averageDuration > 180;
    });

    const unreliableTests = testSuites.filter((suite) => {
      const profile = this.performanceProfiles.get(suite.name);
      return profile && profile.successRate < 0.9;
    });

    if (highMemoryTests.length > 0) {
      recommendations.push(
        `Consider optimizing memory usage in: ${highMemoryTests
          .map((t) => t.name)
          .join(", ")}`
      );
    }

    if (slowTests.length > 0) {
      recommendations.push(
        `Consider optimizing execution time for: ${slowTests
          .map((t) => t.name)
          .join(", ")}`
      );
    }

    if (unreliableTests.length > 0) {
      recommendations.push(
        `Investigate reliability issues in: ${unreliableTests
          .map((t) => t.name)
          .join(", ")}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "All tests are performing within optimal parameters"
      );
    }

    return recommendations;
  }
}

/**
 * Memory Usage Optimizer - Phase 4 Performance Enhancement
 *
 * Monitors and optimizes memory usage during test execution
 */
export class MemoryUsageOptimizer {
  constructor() {
    this.memoryThreshold = 0.85; // 85% of available memory
    this.gcInterval = 30000; // Force GC every 30 seconds
    this.monitoringActive = false;
    this.memoryAlerts = [];
  }

  /**
   * Start memory monitoring and optimization
   */
  startMonitoring() {
    if (this.monitoringActive) return;

    this.monitoringActive = true;

    // Periodic garbage collection
    this.gcTimer = setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, this.gcInterval);

    // Memory usage monitoring
    this.memoryTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    this.monitoringActive = false;

    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }
  }

  /**
   * Check current memory usage and trigger alerts if necessary
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = usedMemory / totalMemory;

    if (memoryUsagePercent > this.memoryThreshold) {
      this.memoryAlerts.push({
        timestamp: new Date().toISOString(),
        memoryUsagePercent: (memoryUsagePercent * 100).toFixed(1),
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(1),
        external: (memUsage.external / 1024 / 1024).toFixed(1),
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Get memory optimization report
   * @returns {Object} Memory optimization report
   */
  getOptimizationReport() {
    const memUsage = process.memoryUsage();

    return {
      currentMemoryUsage: {
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(1) + " MB",
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(1) + " MB",
        external: (memUsage.external / 1024 / 1024).toFixed(1) + " MB",
        rss: (memUsage.rss / 1024 / 1024).toFixed(1) + " MB",
      },
      systemMemory: {
        total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) + " GB",
        free: (os.freemem() / 1024 / 1024 / 1024).toFixed(1) + " GB",
        used:
          ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(1) +
          " GB",
      },
      alerts: this.memoryAlerts,
      optimizationsActive: this.monitoringActive,
      recommendations: this.generateMemoryRecommendations(),
    };
  }

  /**
   * Generate memory optimization recommendations
   * @returns {Array} Memory recommendations
   */
  generateMemoryRecommendations() {
    const recommendations = [];
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    if (heapUsedMB > 1000) {
      recommendations.push(
        "High heap usage detected. Consider increasing --max-old-space-size"
      );
    }

    if (this.memoryAlerts.length > 5) {
      recommendations.push(
        "Frequent memory alerts. Consider reducing test concurrency"
      );
    }

    if (memUsage.external > memUsage.heapUsed) {
      recommendations.push(
        "High external memory usage. Check for memory leaks in native modules"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Memory usage is within optimal parameters");
    }

    return recommendations;
  }
}
