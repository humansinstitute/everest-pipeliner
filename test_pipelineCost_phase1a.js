/**
 * Phase 1a Test Script for pipelineCost.js Utility Module
 *
 * This script validates the Phase 1a implementation against all requirements:
 * - Import functionality
 * - extractCostData() with enhanced and legacy responses
 * - initializePipelineCosts() functionality
 * - addStepCost() with different response types
 * - formatCostSummary() exact formatting requirements
 */

import {
  extractCostData,
  initializePipelineCosts,
  addStepCost,
  formatCostSummary,
} from "./src/utils/pipelineCost.js";

// Test data as specified in requirements
const enhancedApiResponse = {
  callID: "1234",
  billingID: "bill-1111",
  message: "Test response",
  usage: {
    prompt_tokens: 23,
    completion_tokens: 414,
    total_tokens: 437,
    cost: 0.00621621,
    model: "anthropic/claude-sonnet-4",
  },
};

const legacyApiResponse = {
  callID: "legacy-1234",
  message: "Legacy response without usage field",
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function runTest(testName, testFunction) {
  try {
    console.log(`\n🧪 Running: ${testName}`);
    const result = testFunction();
    if (result.success) {
      testResults.passed++;
      console.log(`✅ PASSED: ${testName}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    } else {
      testResults.failed++;
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${result.error}`);
    }
    testResults.tests.push({ name: testName, ...result });
  } catch (error) {
    testResults.failed++;
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Exception: ${error.message}`);
    testResults.tests.push({
      name: testName,
      success: false,
      error: error.message,
    });
  }
}

// Test 1: Import Test
function testImports() {
  if (
    typeof extractCostData === "function" &&
    typeof initializePipelineCosts === "function" &&
    typeof addStepCost === "function" &&
    typeof formatCostSummary === "function"
  ) {
    return {
      success: true,
      details: "All functions imported successfully",
    };
  }
  return {
    success: false,
    error: "One or more functions failed to import",
  };
}

// Test 2: extractCostData with enhanced response
function testExtractCostDataEnhanced() {
  const result = extractCostData(enhancedApiResponse);

  if (!result) {
    return {
      success: false,
      error: "Function returned null for enhanced response",
    };
  }

  const expected = {
    cost: 0.00621621,
    tokensIn: 23,
    tokensOut: 414,
    totalTokens: 437,
    model: "anthropic/claude-sonnet-4",
    callID: "1234",
    billingID: "bill-1111",
  };

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (result[key] !== expectedValue) {
      return {
        success: false,
        error: `Expected ${key}: ${expectedValue}, got: ${result[key]}`,
      };
    }
  }

  return {
    success: true,
    details: `Correctly extracted: cost=$${result.cost}, tokens=${result.totalTokens}`,
  };
}

// Test 3: extractCostData with legacy response
function testExtractCostDataLegacy() {
  const result = extractCostData(legacyApiResponse);

  if (result === null) {
    return {
      success: true,
      details: "Correctly returned null for legacy response",
    };
  }

  return {
    success: false,
    error: `Expected null for legacy response, got: ${JSON.stringify(result)}`,
  };
}

// Test 4: extractCostData with null/undefined
function testExtractCostDataNull() {
  const nullResult = extractCostData(null);
  const undefinedResult = extractCostData(undefined);

  if (nullResult === null && undefinedResult === null) {
    return {
      success: true,
      details: "Correctly handled null and undefined inputs",
    };
  }

  return {
    success: false,
    error: `Expected null for both inputs, got null: ${nullResult}, undefined: ${undefinedResult}`,
  };
}

// Test 5: initializePipelineCosts
function testInitializePipelineCosts() {
  const pipelineData = { runId: "test-run-123", steps: [], outputs: [] };

  initializePipelineCosts(pipelineData);

  const expectedStructure = {
    totalCost: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalTokens: 0,
    stepCosts: [],
  };

  if (!pipelineData.costs) {
    return { success: false, error: "costs property not created" };
  }

  for (const [key, expectedValue] of Object.entries(expectedStructure)) {
    if (key === "stepCosts") {
      if (!Array.isArray(pipelineData.costs[key])) {
        return { success: false, error: `stepCosts should be an array` };
      }
    } else if (pipelineData.costs[key] !== expectedValue) {
      return {
        success: false,
        error: `Expected ${key}: ${expectedValue}, got: ${pipelineData.costs[key]}`,
      };
    }
  }

  return {
    success: true,
    details: "Cost structure initialized correctly with zero values",
  };
}

// Test 6: addStepCost with enhanced response
function testAddStepCostEnhanced() {
  const pipelineData = { runId: "test-run-456", steps: [], outputs: [] };
  initializePipelineCosts(pipelineData);

  addStepCost(pipelineData, "agent1_initial", enhancedApiResponse);

  const costs = pipelineData.costs;

  // Check accumulated costs
  if (costs.totalCost !== 0.00621621) {
    return {
      success: false,
      error: `Expected totalCost: 0.00621621, got: ${costs.totalCost}`,
    };
  }

  if (costs.totalTokensIn !== 23) {
    return {
      success: false,
      error: `Expected totalTokensIn: 23, got: ${costs.totalTokensIn}`,
    };
  }

  if (costs.totalTokensOut !== 414) {
    return {
      success: false,
      error: `Expected totalTokensOut: 414, got: ${costs.totalTokensOut}`,
    };
  }

  if (costs.totalTokens !== 437) {
    return {
      success: false,
      error: `Expected totalTokens: 437, got: ${costs.totalTokens}`,
    };
  }

  // Check step costs array
  if (costs.stepCosts.length !== 1) {
    return {
      success: false,
      error: `Expected 1 step cost entry, got: ${costs.stepCosts.length}`,
    };
  }

  const stepEntry = costs.stepCosts[0];
  if (stepEntry.stepId !== "agent1_initial") {
    return {
      success: false,
      error: `Expected stepId: agent1_initial, got: ${stepEntry.stepId}`,
    };
  }

  return {
    success: true,
    details: `Correctly accumulated costs: $${costs.totalCost}, tokens: ${costs.totalTokens}`,
  };
}

// Test 7: addStepCost with legacy response
function testAddStepCostLegacy() {
  const pipelineData = { runId: "test-run-789", steps: [], outputs: [] };
  initializePipelineCosts(pipelineData);

  const initialCosts = { ...pipelineData.costs };

  addStepCost(pipelineData, "legacy_step", legacyApiResponse);

  // Costs should remain unchanged
  const costs = pipelineData.costs;

  if (
    costs.totalCost !== initialCosts.totalCost ||
    costs.totalTokensIn !== initialCosts.totalTokensIn ||
    costs.totalTokensOut !== initialCosts.totalTokensOut ||
    costs.totalTokens !== initialCosts.totalTokens
  ) {
    return {
      success: false,
      error:
        "Costs changed when they should have remained zero for legacy response",
    };
  }

  if (costs.stepCosts.length !== 0) {
    return {
      success: false,
      error: `Expected 0 step cost entries, got: ${costs.stepCosts.length}`,
    };
  }

  return {
    success: true,
    details: "Correctly handled legacy response - no cost accumulation",
  };
}

// Test 8: formatCostSummary exact format
function testFormatCostSummaryExact() {
  const pipelineData = { runId: "test-format", steps: [], outputs: [] };
  initializePipelineCosts(pipelineData);
  addStepCost(pipelineData, "format_test", enhancedApiResponse);

  const summary = formatCostSummary(pipelineData);

  const expectedLines = [
    "Total Cost USD $ 0.0062",
    "TotalTokens In: 23",
    "TotalTokens Out: 414",
  ];

  const actualLines = summary.split("\n");

  if (actualLines.length !== expectedLines.length) {
    return {
      success: false,
      error: `Expected ${expectedLines.length} lines, got: ${actualLines.length}`,
    };
  }

  for (let i = 0; i < expectedLines.length; i++) {
    if (actualLines[i] !== expectedLines[i]) {
      return {
        success: false,
        error: `Line ${i + 1} - Expected: "${expectedLines[i]}", Got: "${
          actualLines[i]
        }"`,
      };
    }
  }

  return {
    success: true,
    details: "Format matches exact requirements: 4 decimal USD, integer tokens",
  };
}

// Test 9: formatCostSummary with zero costs
function testFormatCostSummaryZero() {
  const pipelineData = { runId: "test-zero", steps: [], outputs: [] };
  initializePipelineCosts(pipelineData);

  const summary = formatCostSummary(pipelineData);

  const expectedSummary =
    "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0";

  if (summary !== expectedSummary) {
    return {
      success: false,
      error: `Expected: "${expectedSummary}", Got: "${summary}"`,
    };
  }

  return {
    success: true,
    details: "Correctly formatted zero costs with 4 decimal places",
  };
}

// Test 10: formatCostSummary with no cost data
function testFormatCostSummaryNoCosts() {
  const pipelineData = { runId: "test-no-costs" };

  const summary = formatCostSummary(pipelineData);

  const expectedSummary =
    "Total Cost USD $ 0.0000\nTotalTokens In: 0\nTotalTokens Out: 0";

  if (summary !== expectedSummary) {
    return {
      success: false,
      error: `Expected: "${expectedSummary}", Got: "${summary}"`,
    };
  }

  return {
    success: true,
    details: "Correctly handled missing cost data",
  };
}

// Run all tests
console.log("🚀 Starting Phase 1a Validation Tests for pipelineCost.js");
console.log("=" * 60);

runTest("1. Import Test", testImports);
runTest(
  "2. extractCostData() - Enhanced Response",
  testExtractCostDataEnhanced
);
runTest("3. extractCostData() - Legacy Response", testExtractCostDataLegacy);
runTest("4. extractCostData() - Null/Undefined Input", testExtractCostDataNull);
runTest(
  "5. initializePipelineCosts() - Structure Creation",
  testInitializePipelineCosts
);
runTest("6. addStepCost() - Enhanced Response", testAddStepCostEnhanced);
runTest("7. addStepCost() - Legacy Response", testAddStepCostLegacy);
runTest("8. formatCostSummary() - Exact Format", testFormatCostSummaryExact);
runTest("9. formatCostSummary() - Zero Costs", testFormatCostSummaryZero);
runTest("10. formatCostSummary() - No Cost Data", testFormatCostSummaryNoCosts);

// Print final results
console.log("\n" + "=" * 60);
console.log("📊 PHASE 1A VALIDATION RESULTS");
console.log("=" * 60);
console.log(`✅ Tests Passed: ${testResults.passed}`);
console.log(`❌ Tests Failed: ${testResults.failed}`);
console.log(
  `📈 Success Rate: ${(
    (testResults.passed / (testResults.passed + testResults.failed)) *
    100
  ).toFixed(1)}%`
);

if (testResults.failed === 0) {
  console.log(
    "\n🎉 ALL TESTS PASSED! Phase 1a implementation is working correctly."
  );
  console.log("\n✅ SUCCESS CRITERIA MET:");
  console.log("   • All imports work without errors");
  console.log(
    "   • extractCostData() returns correct structure for enhanced responses"
  );
  console.log("   • extractCostData() returns null for legacy responses");
  console.log("   • formatCostSummary() shows exact format requirements");
  console.log("   • Token counts display as integers");
  console.log("   • Cost accumulation works correctly");
} else {
  console.log("\n⚠️  Some tests failed. Please review the implementation.");
  console.log("\nFailed tests:");
  testResults.tests
    .filter((test) => !test.success)
    .forEach((test) => console.log(`   • ${test.name}: ${test.error}`));
}

console.log("\n🏁 Phase 1a validation complete.");
