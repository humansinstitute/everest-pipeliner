/**
 * Comprehensive End-to-End Cost Tracking Test
 *
 * This test validates the complete cost tracking system with real dialogue pipeline execution.
 * It tests cost data capture, accumulation, display, and file integration across multiple scenarios.
 *
 * Test Scenarios:
 * 1. Short Pipeline (1 iteration) - Basic validation
 * 2. Multi-Step Pipeline (2+ iterations) - Accumulation testing
 * 3. Cost Data Validation - Structure and format compliance
 * 4. File Output Validation - JSON and markdown integration
 * 5. Performance Impact Assessment
 */

import { dialoguePipeline } from "./src/pipelines/dialoguePipeline.js";
import {
  formatCostSummary,
  generateCostBreakdown,
} from "./src/utils/pipelineCost.js";
import { promises as fs } from "fs";
import path from "path";

// Test configuration constants
const TEST_CONFIGS = {
  SHORT_PIPELINE: {
    sourceText:
      "Cost tracking validation test for the Pipeline Cost Tracking feature.",
    discussionPrompt:
      "Discuss the implementation and benefits of cost tracking in AI pipelines.",
    iterations: 1,
    summaryFocus:
      "Summarize the key points about cost tracking implementation.",
  },
  MULTI_STEP_PIPELINE: {
    sourceText:
      "Cost tracking validation test for the Pipeline Cost Tracking feature. This test validates comprehensive cost accumulation across multiple dialogue iterations.",
    discussionPrompt:
      "Discuss the implementation, benefits, and challenges of cost tracking in AI pipelines, including performance considerations.",
    iterations: 2,
    summaryFocus:
      "Summarize the key points about cost tracking implementation, benefits, and performance considerations.",
  },
};

// Expected cost format patterns
const COST_FORMAT_PATTERNS = {
  USD_FORMAT: /^Total Cost USD \$ \d+\.\d{4}$/,
  TOKENS_IN_FORMAT: /^TotalTokens In: \d+$/,
  TOKENS_OUT_FORMAT: /^TotalTokens Out: \d+$/,
};

/**
 * Validation Functions
 */

/**
 * Validates cost data structure compliance
 * @param {Object} costData - Cost data object to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateCostDataStructure(costData) {
  const errors = [];

  if (!costData) {
    errors.push("Cost data is null or undefined");
    return { isValid: false, errors };
  }

  // Check required fields
  const requiredFields = [
    "totalCost",
    "totalTokensIn",
    "totalTokensOut",
    "totalTokens",
    "stepCosts",
  ];
  for (const field of requiredFields) {
    if (!(field in costData)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate data types
  if (typeof costData.totalCost !== "number") {
    errors.push("totalCost must be a number");
  }
  if (typeof costData.totalTokensIn !== "number") {
    errors.push("totalTokensIn must be a number");
  }
  if (typeof costData.totalTokensOut !== "number") {
    errors.push("totalTokensOut must be a number");
  }
  if (typeof costData.totalTokens !== "number") {
    errors.push("totalTokens must be a number");
  }
  if (!Array.isArray(costData.stepCosts)) {
    errors.push("stepCosts must be an array");
  }

  // Validate step costs structure
  if (Array.isArray(costData.stepCosts)) {
    costData.stepCosts.forEach((step, index) => {
      const stepRequiredFields = [
        "stepId",
        "cost",
        "tokensIn",
        "tokensOut",
        "model",
        "timestamp",
      ];
      for (const field of stepRequiredFields) {
        if (!(field in step)) {
          errors.push(`Step ${index}: Missing required field: ${field}`);
        }
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates cost format compliance (USD 4 decimals, integer tokens)
 * @param {Object} costData - Cost data object to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateCostFormatCompliance(costData) {
  const errors = [];

  if (!costData) {
    errors.push("Cost data is null or undefined");
    return { isValid: false, errors };
  }

  // Validate USD format (4 decimal places)
  const costString = costData.totalCost.toFixed(4);
  if (!/^\d+\.\d{4}$/.test(costString)) {
    errors.push(`Cost format invalid: ${costString} (expected X.XXXX format)`);
  }

  // Validate token counts are integers
  if (!Number.isInteger(costData.totalTokensIn)) {
    errors.push(`totalTokensIn must be integer: ${costData.totalTokensIn}`);
  }
  if (!Number.isInteger(costData.totalTokensOut)) {
    errors.push(`totalTokensOut must be integer: ${costData.totalTokensOut}`);
  }
  if (!Number.isInteger(costData.totalTokens)) {
    errors.push(`totalTokens must be integer: ${costData.totalTokens}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates console output format
 * @param {string} consoleOutput - Console output to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateConsoleOutputFormat(consoleOutput) {
  const errors = [];
  const lines = consoleOutput.split("\n");

  // Check for required format lines
  const usdLine = lines.find((line) => line.includes("Total Cost USD $"));
  const tokensInLine = lines.find((line) => line.includes("TotalTokens In:"));
  const tokensOutLine = lines.find((line) => line.includes("TotalTokens Out:"));

  if (!usdLine) {
    errors.push("Missing 'Total Cost USD $' line in console output");
  } else if (!COST_FORMAT_PATTERNS.USD_FORMAT.test(usdLine.trim())) {
    errors.push(`USD format invalid: ${usdLine.trim()}`);
  }

  if (!tokensInLine) {
    errors.push("Missing 'TotalTokens In:' line in console output");
  } else if (!COST_FORMAT_PATTERNS.TOKENS_IN_FORMAT.test(tokensInLine.trim())) {
    errors.push(`Tokens In format invalid: ${tokensInLine.trim()}`);
  }

  if (!tokensOutLine) {
    errors.push("Missing 'TotalTokens Out:' line in console output");
  } else if (
    !COST_FORMAT_PATTERNS.TOKENS_OUT_FORMAT.test(tokensOutLine.trim())
  ) {
    errors.push(`Tokens Out format invalid: ${tokensOutLine.trim()}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates file output contains cost data
 * @param {string} filePath - Path to file to validate
 * @param {string} fileType - Type of file ('json' or 'markdown')
 * @returns {Promise<Object>} Validation result with isValid and errors
 */
async function validateFileOutputCostData(filePath, fileType) {
  const errors = [];

  try {
    const content = await fs.readFile(filePath, "utf8");

    if (fileType === "json") {
      const jsonData = JSON.parse(content);

      // Check for costs field in JSON
      if (!jsonData.costs) {
        errors.push("JSON file missing 'costs' field");
      } else {
        const costValidation = validateCostDataStructure(jsonData.costs);
        if (!costValidation.isValid) {
          errors.push(
            ...costValidation.errors.map((err) => `JSON costs: ${err}`)
          );
        }
      }
    } else if (fileType === "markdown") {
      // Check for cost summary section in markdown
      if (!content.includes("## Cost Summary")) {
        errors.push("Markdown file missing '## Cost Summary' section");
      }

      if (!content.includes("Total Cost USD $")) {
        errors.push("Markdown file missing cost summary data");
      }
    }
  } catch (error) {
    errors.push(`Error reading ${fileType} file: ${error.message}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Test Execution Functions
 */

/**
 * Executes short pipeline test (1 iteration)
 * @returns {Promise<Object>} Test result
 */
async function executeShortPipelineTest() {
  console.log("\n🧪 EXECUTING SHORT PIPELINE TEST (1 iteration)");
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    const result = await dialoguePipeline(TEST_CONFIGS.SHORT_PIPELINE);
    const executionTime = Date.now() - startTime;

    console.log(`✅ Short pipeline completed in ${executionTime}ms`);

    // Validate result structure
    if (result.error) {
      return {
        success: false,
        error: `Pipeline failed: ${result.error}`,
        executionTime,
      };
    }

    // Validate cost data exists
    if (!result.pipeline.costs) {
      return {
        success: false,
        error: "No cost data found in pipeline result",
        executionTime,
      };
    }

    // Validate cost data structure
    const structureValidation = validateCostDataStructure(
      result.pipeline.costs
    );
    if (!structureValidation.isValid) {
      return {
        success: false,
        error: `Cost data structure invalid: ${structureValidation.errors.join(
          ", "
        )}`,
        executionTime,
      };
    }

    // Validate cost format compliance
    const formatValidation = validateCostFormatCompliance(
      result.pipeline.costs
    );
    if (!formatValidation.isValid) {
      return {
        success: false,
        error: `Cost format invalid: ${formatValidation.errors.join(", ")}`,
        executionTime,
      };
    }

    // Generate and validate console output
    const consoleOutput = formatCostSummary(result.pipeline);
    const consoleValidation = validateConsoleOutputFormat(consoleOutput);
    if (!consoleValidation.isValid) {
      return {
        success: false,
        error: `Console output format invalid: ${consoleValidation.errors.join(
          ", "
        )}`,
        executionTime,
      };
    }

    return {
      success: true,
      result,
      executionTime,
      costData: result.pipeline.costs,
      consoleOutput,
      stepCount: result.pipeline.costs.stepCosts.length,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: `Test execution failed: ${error.message}`,
      executionTime,
    };
  }
}

/**
 * Executes multi-step pipeline test (2+ iterations)
 * @returns {Promise<Object>} Test result
 */
async function executeMultiStepPipelineTest() {
  console.log("\n🧪 EXECUTING MULTI-STEP PIPELINE TEST (2 iterations)");
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    const result = await dialoguePipeline(TEST_CONFIGS.MULTI_STEP_PIPELINE);
    const executionTime = Date.now() - startTime;

    console.log(`✅ Multi-step pipeline completed in ${executionTime}ms`);

    // Validate result structure
    if (result.error) {
      return {
        success: false,
        error: `Pipeline failed: ${result.error}`,
        executionTime,
      };
    }

    // Validate cost data exists
    if (!result.pipeline.costs) {
      return {
        success: false,
        error: "No cost data found in pipeline result",
        executionTime,
      };
    }

    // Validate cost accumulation (should have multiple steps)
    if (result.pipeline.costs.stepCosts.length < 3) {
      return {
        success: false,
        error: `Insufficient step costs for multi-step test: ${result.pipeline.costs.stepCosts.length}`,
        executionTime,
      };
    }

    // Validate cost accumulation logic
    let calculatedTotal = 0;
    let calculatedTokensIn = 0;
    let calculatedTokensOut = 0;

    for (const step of result.pipeline.costs.stepCosts) {
      calculatedTotal += step.cost;
      calculatedTokensIn += step.tokensIn;
      calculatedTokensOut += step.tokensOut;
    }

    const tolerance = 0.0001; // Allow for floating point precision
    if (
      Math.abs(calculatedTotal - result.pipeline.costs.totalCost) > tolerance
    ) {
      return {
        success: false,
        error: `Cost accumulation mismatch: calculated ${calculatedTotal}, stored ${result.pipeline.costs.totalCost}`,
        executionTime,
      };
    }

    if (calculatedTokensIn !== result.pipeline.costs.totalTokensIn) {
      return {
        success: false,
        error: `Token In accumulation mismatch: calculated ${calculatedTokensIn}, stored ${result.pipeline.costs.totalTokensIn}`,
        executionTime,
      };
    }

    if (calculatedTokensOut !== result.pipeline.costs.totalTokensOut) {
      return {
        success: false,
        error: `Token Out accumulation mismatch: calculated ${calculatedTokensOut}, stored ${result.pipeline.costs.totalTokensOut}`,
        executionTime,
      };
    }

    return {
      success: true,
      result,
      executionTime,
      costData: result.pipeline.costs,
      stepCount: result.pipeline.costs.stepCosts.length,
      accumulationValidated: true,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: `Test execution failed: ${error.message}`,
      executionTime,
    };
  }
}

/**
 * Validates file outputs contain cost data
 * @param {Object} pipelineResult - Pipeline result with file paths
 * @returns {Promise<Object>} Validation result
 */
async function validateFileOutputs(pipelineResult) {
  console.log("\n🧪 VALIDATING FILE OUTPUTS");
  console.log("=".repeat(60));

  const errors = [];

  if (!pipelineResult.files) {
    return {
      success: false,
      error: "No file paths found in pipeline result",
    };
  }

  // Validate JSON file
  if (pipelineResult.files.data) {
    const jsonValidation = await validateFileOutputCostData(
      pipelineResult.files.data,
      "json"
    );
    if (!jsonValidation.isValid) {
      errors.push(...jsonValidation.errors.map((err) => `JSON: ${err}`));
    } else {
      console.log("✅ JSON file cost data validation passed");
    }
  } else {
    errors.push("No JSON data file path found");
  }

  // Validate Markdown files
  const markdownFiles = ["conversation", "summary"];
  for (const fileType of markdownFiles) {
    if (pipelineResult.files[fileType]) {
      const markdownValidation = await validateFileOutputCostData(
        pipelineResult.files[fileType],
        "markdown"
      );
      if (!markdownValidation.isValid) {
        errors.push(
          ...markdownValidation.errors.map((err) => `${fileType}.md: ${err}`)
        );
      } else {
        console.log(`✅ ${fileType}.md cost data validation passed`);
      }
    } else {
      errors.push(`No ${fileType} markdown file path found`);
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Main test execution function
 */
async function runEndToEndCostTrackingTest() {
  console.log("🚀 COMPREHENSIVE END-TO-END COST TRACKING TEST");
  console.log("=".repeat(80));
  console.log(
    "Testing complete cost tracking system with real dialogue pipeline execution"
  );
  console.log("=".repeat(80));

  const testResults = {
    startTime: new Date().toISOString(),
    tests: {},
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalExecutionTime: 0,
    },
  };

  const overallStartTime = Date.now();

  try {
    // Test 1: Short Pipeline
    testResults.tests.shortPipeline = await executeShortPipelineTest();
    testResults.summary.totalTests++;
    if (testResults.tests.shortPipeline.success) {
      testResults.summary.passedTests++;
    } else {
      testResults.summary.failedTests++;
    }

    // Test 2: Multi-Step Pipeline
    testResults.tests.multiStepPipeline = await executeMultiStepPipelineTest();
    testResults.summary.totalTests++;
    if (testResults.tests.multiStepPipeline.success) {
      testResults.summary.passedTests++;
    } else {
      testResults.summary.failedTests++;
    }

    // Test 3: File Output Validation (using multi-step result)
    if (testResults.tests.multiStepPipeline.success) {
      testResults.tests.fileOutputValidation = await validateFileOutputs(
        testResults.tests.multiStepPipeline.result
      );
      testResults.summary.totalTests++;
      if (testResults.tests.fileOutputValidation.success) {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    }

    testResults.summary.totalExecutionTime = Date.now() - overallStartTime;
    testResults.endTime = new Date().toISOString();

    // Display results
    console.log("\n📊 TEST RESULTS SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${testResults.summary.totalTests}`);
    console.log(`Passed: ${testResults.summary.passedTests}`);
    console.log(`Failed: ${testResults.summary.failedTests}`);
    console.log(
      `Success Rate: ${(
        (testResults.summary.passedTests / testResults.summary.totalTests) *
        100
      ).toFixed(1)}%`
    );
    console.log(
      `Total Execution Time: ${testResults.summary.totalExecutionTime}ms`
    );

    // Detailed results
    console.log("\n📋 DETAILED RESULTS");
    console.log("=".repeat(80));

    for (const [testName, result] of Object.entries(testResults.tests)) {
      console.log(`\n${testName.toUpperCase()}:`);
      console.log(`  Status: ${result.success ? "✅ PASSED" : "❌ FAILED"}`);
      if (result.executionTime) {
        console.log(`  Execution Time: ${result.executionTime}ms`);
      }
      if (result.stepCount) {
        console.log(`  Steps Executed: ${result.stepCount}`);
      }
      if (result.costData) {
        console.log(`  Total Cost: $${result.costData.totalCost.toFixed(4)}`);
        console.log(`  Total Tokens: ${result.costData.totalTokens}`);
      }
      if (!result.success && result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.errors) {
        console.log(`  Errors: ${result.errors.join(", ")}`);
      }
    }

    // Performance assessment
    console.log("\n⚡ PERFORMANCE ASSESSMENT");
    console.log("=".repeat(80));

    if (
      testResults.tests.shortPipeline.success &&
      testResults.tests.multiStepPipeline.success
    ) {
      const shortTime = testResults.tests.shortPipeline.executionTime;
      const multiTime = testResults.tests.multiStepPipeline.executionTime;
      const shortSteps = testResults.tests.shortPipeline.stepCount;
      const multiSteps = testResults.tests.multiStepPipeline.stepCount;

      const avgTimePerStep = {
        short: shortTime / shortSteps,
        multi: multiTime / multiSteps,
      };

      console.log(
        `Average time per step (short): ${avgTimePerStep.short.toFixed(0)}ms`
      );
      console.log(
        `Average time per step (multi): ${avgTimePerStep.multi.toFixed(0)}ms`
      );
      console.log(
        `Performance impact: ${Math.abs(
          avgTimePerStep.multi - avgTimePerStep.short
        ).toFixed(0)}ms difference per step`
      );

      if (Math.abs(avgTimePerStep.multi - avgTimePerStep.short) < 100) {
        console.log("✅ Minimal performance impact from cost tracking");
      } else {
        console.log("⚠️ Noticeable performance impact detected");
      }
    }

    // Cost tracking validation summary
    console.log("\n💰 COST TRACKING VALIDATION SUMMARY");
    console.log("=".repeat(80));

    const allTestsPassed = testResults.summary.failedTests === 0;

    if (allTestsPassed) {
      console.log("✅ All cost tracking validations PASSED");
      console.log("✅ Cost data capture working correctly");
      console.log("✅ Cost accumulation working correctly");
      console.log("✅ Console output format compliant");
      console.log("✅ File integration working correctly");
      console.log("✅ Format requirements met (4 decimal USD, integer tokens)");
    } else {
      console.log("❌ Some cost tracking validations FAILED");
      console.log("❌ Review detailed results above for specific issues");
    }

    return testResults;
  } catch (error) {
    console.error("\n❌ TEST EXECUTION FAILED:", error);
    testResults.error = error.message;
    testResults.summary.totalExecutionTime = Date.now() - overallStartTime;
    testResults.endTime = new Date().toISOString();
    return testResults;
  }
}

// Execute the test if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runEndToEndCostTrackingTest()
    .then((results) => {
      const success = results.summary.failedTests === 0 && !results.error;
      console.log(
        `\n🏁 END-TO-END COST TRACKING TEST ${
          success ? "COMPLETED SUCCESSFULLY" : "FAILED"
        }`
      );
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test runner failed:", error);
      process.exit(1);
    });
}

export {
  runEndToEndCostTrackingTest,
  validateCostDataStructure,
  validateCostFormatCompliance,
  validateConsoleOutputFormat,
  validateFileOutputCostData,
};
