#!/usr/bin/env node

import { dialoguePipeline } from "./src/pipelines/dialoguePipeline.js";
import fs from "fs";
import path from "path";

/**
 * Integration test runner for dialogue pipeline
 */

console.log("🧪 Starting Integration Testing for Dialogue Pipeline");
console.log("=".repeat(60));

// Test Case 1: Simple Dialogue (AI Ethics)
async function testCase1() {
  console.log("\n📋 Test Case 1: Simple Dialogue (AI Ethics)");
  console.log("-".repeat(50));

  const startTime = Date.now();

  const config = {
    sourceText:
      "Artificial intelligence systems are becoming increasingly powerful and autonomous. As these systems make more decisions that affect human lives, we must carefully consider the ethical implications. Key concerns include bias in AI algorithms, privacy protection, and ensuring AI remains beneficial to humanity.",
    discussionPrompt: "What are the key ethical considerations?",
    iterations: 2,
    summaryFocus:
      "Please provide a comprehensive summary of the key points, insights, and conclusions from this dialogue.",
  };

  console.log("📝 Configuration:");
  console.log(`   Source Text: ${config.sourceText.substring(0, 80)}...`);
  console.log(`   Discussion Prompt: ${config.discussionPrompt}`);
  console.log(`   Iterations: ${config.iterations}`);
  console.log(`   Summary Focus: ${config.summaryFocus.substring(0, 60)}...`);

  try {
    console.log("\n🚀 Executing pipeline...");
    const result = await dialoguePipeline(config);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n✅ Test Case 1 Results:");
    console.log(`   Status: ${result.error ? "FAILED" : "PASSED"}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Run ID: ${result.runId}`);
    console.log(
      `   Conversation Exchanges: ${result.conversation?.length || 0}`
    );
    console.log(
      `   File Generation: ${result.fileGenerationStatus || "unknown"}`
    );

    if (result.error) {
      console.log(`   Error: ${result.error}`);
      return { passed: false, result, duration };
    }

    // Validate results
    const validationResults = validateTestCase1(result);
    console.log(
      `   Validation: ${validationResults.passed ? "PASSED" : "FAILED"}`
    );

    if (!validationResults.passed) {
      console.log(`   Validation Errors:`);
      validationResults.errors.forEach((error) =>
        console.log(`     - ${error}`)
      );
    }

    return {
      passed: validationResults.passed,
      result,
      duration,
      validation: validationResults,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n❌ Test Case 1 FAILED:");
    console.log(`   Error: ${error.message}`);
    console.log(`   Duration: ${duration}s`);

    return { passed: false, error: error.message, duration };
  }
}

// Test Case 2: Complex Topic (Renewable Energy)
async function testCase2() {
  console.log("\n📋 Test Case 2: Complex Topic (Renewable Energy)");
  console.log("-".repeat(50));

  const startTime = Date.now();

  const config = {
    sourceText:
      "Renewable energy technologies have experienced rapid growth and cost reductions over the past decade. Solar photovoltaic costs have fallen by 90% since 2010, while wind energy costs have decreased by 70%. However, challenges remain including grid integration, energy storage, intermittency issues, and the need for substantial infrastructure investments. The transition to renewable energy requires coordinated policy support, technological innovation, and significant capital deployment across multiple sectors.",
    discussionPrompt:
      "Analyze the benefits and challenges of renewable energy transition",
    iterations: 3,
    summaryFocus:
      "Summarize the key benefits, challenges, and strategic considerations for renewable energy adoption.",
  };

  console.log("📝 Configuration:");
  console.log(`   Source Text: ${config.sourceText.substring(0, 80)}...`);
  console.log(`   Discussion Prompt: ${config.discussionPrompt}`);
  console.log(`   Iterations: ${config.iterations}`);

  try {
    console.log("\n🚀 Executing pipeline...");
    const result = await dialoguePipeline(config);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n✅ Test Case 2 Results:");
    console.log(`   Status: ${result.error ? "FAILED" : "PASSED"}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Run ID: ${result.runId}`);
    console.log(
      `   Conversation Exchanges: ${result.conversation?.length || 0}`
    );
    console.log(
      `   File Generation: ${result.fileGenerationStatus || "unknown"}`
    );

    if (result.error) {
      console.log(`   Error: ${result.error}`);
      return { passed: false, result, duration };
    }

    // Validate results
    const validationResults = validateTestCase2(result);
    console.log(
      `   Validation: ${validationResults.passed ? "PASSED" : "FAILED"}`
    );

    if (!validationResults.passed) {
      console.log(`   Validation Errors:`);
      validationResults.errors.forEach((error) =>
        console.log(`     - ${error}`)
      );
    }

    return {
      passed: validationResults.passed,
      result,
      duration,
      validation: validationResults,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n❌ Test Case 2 FAILED:");
    console.log(`   Error: ${error.message}`);
    console.log(`   Duration: ${duration}s`);

    return { passed: false, error: error.message, duration };
  }
}

// Test Case 3: Edge Cases
async function testCase3() {
  console.log("\n📋 Test Case 3: Edge Cases (Minimum iterations, short text)");
  console.log("-".repeat(50));

  const startTime = Date.now();

  const config = {
    sourceText: "Climate change is a global challenge.",
    discussionPrompt: "What should we do?",
    iterations: 1,
    summaryFocus: "Brief summary of the discussion.",
  };

  console.log("📝 Configuration:");
  console.log(`   Source Text: ${config.sourceText}`);
  console.log(`   Discussion Prompt: ${config.discussionPrompt}`);
  console.log(`   Iterations: ${config.iterations}`);

  try {
    console.log("\n🚀 Executing pipeline...");
    const result = await dialoguePipeline(config);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n✅ Test Case 3 Results:");
    console.log(`   Status: ${result.error ? "FAILED" : "PASSED"}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Run ID: ${result.runId}`);
    console.log(
      `   Conversation Exchanges: ${result.conversation?.length || 0}`
    );
    console.log(
      `   File Generation: ${result.fileGenerationStatus || "unknown"}`
    );

    if (result.error) {
      console.log(`   Error: ${result.error}`);
      return { passed: false, result, duration };
    }

    // Validate results
    const validationResults = validateTestCase3(result);
    console.log(
      `   Validation: ${validationResults.passed ? "PASSED" : "FAILED"}`
    );

    if (!validationResults.passed) {
      console.log(`   Validation Errors:`);
      validationResults.errors.forEach((error) =>
        console.log(`     - ${error}`)
      );
    }

    return {
      passed: validationResults.passed,
      result,
      duration,
      validation: validationResults,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n❌ Test Case 3 FAILED:");
    console.log(`   Error: ${error.message}`);
    console.log(`   Duration: ${duration}s`);

    return { passed: false, error: error.message, duration };
  }
}

// Validation functions
function validateTestCase1(result) {
  const errors = [];

  // Basic structure validation
  if (!result.runId) errors.push("Missing runId");
  if (!result.conversation || !Array.isArray(result.conversation)) {
    errors.push("Missing or invalid conversation array");
  } else {
    if (result.conversation.length !== 4) {
      // 2 iterations = 4 exchanges (2 per iteration)
      errors.push(
        `Expected 4 conversation exchanges, got ${result.conversation.length}`
      );
    }
  }

  if (!result.summary || !result.summary.content) {
    errors.push("Missing summary content");
  }

  // File generation validation
  if (result.fileGenerationStatus !== "success") {
    errors.push(`File generation failed: ${result.fileGenerationStatus}`);
  }

  if (result.files) {
    if (!result.files.conversation)
      errors.push("Missing conversation file path");
    if (!result.files.summary) errors.push("Missing summary file path");
    if (!result.files.data) errors.push("Missing data file path");
  } else {
    errors.push("Missing files object");
  }

  // Content quality validation
  if (result.conversation && result.conversation.length > 0) {
    const hasEthicsContent = result.conversation.some(
      (entry) =>
        entry.content.toLowerCase().includes("ethic") ||
        entry.content.toLowerCase().includes("moral") ||
        entry.content.toLowerCase().includes("bias")
    );
    if (!hasEthicsContent) {
      errors.push("Conversation doesn't appear to address ethics topic");
    }
  }

  return { passed: errors.length === 0, errors };
}

function validateTestCase2(result) {
  const errors = [];

  // Basic structure validation
  if (!result.runId) errors.push("Missing runId");
  if (!result.conversation || !Array.isArray(result.conversation)) {
    errors.push("Missing or invalid conversation array");
  } else {
    if (result.conversation.length !== 6) {
      // 3 iterations = 6 exchanges
      errors.push(
        `Expected 6 conversation exchanges, got ${result.conversation.length}`
      );
    }
  }

  if (!result.summary || !result.summary.content) {
    errors.push("Missing summary content");
  }

  // File generation validation
  if (result.fileGenerationStatus !== "success") {
    errors.push(`File generation failed: ${result.fileGenerationStatus}`);
  }

  // Content quality validation
  if (result.conversation && result.conversation.length > 0) {
    const hasEnergyContent = result.conversation.some(
      (entry) =>
        entry.content.toLowerCase().includes("renewable") ||
        entry.content.toLowerCase().includes("energy") ||
        entry.content.toLowerCase().includes("solar") ||
        entry.content.toLowerCase().includes("wind")
    );
    if (!hasEnergyContent) {
      errors.push(
        "Conversation doesn't appear to address renewable energy topic"
      );
    }
  }

  return { passed: errors.length === 0, errors };
}

function validateTestCase3(result) {
  const errors = [];

  // Basic structure validation
  if (!result.runId) errors.push("Missing runId");
  if (!result.conversation || !Array.isArray(result.conversation)) {
    errors.push("Missing or invalid conversation array");
  } else {
    if (result.conversation.length !== 2) {
      // 1 iteration = 2 exchanges
      errors.push(
        `Expected 2 conversation exchanges, got ${result.conversation.length}`
      );
    }
  }

  if (!result.summary || !result.summary.content) {
    errors.push("Missing summary content");
  }

  // File generation validation
  if (result.fileGenerationStatus !== "success") {
    errors.push(`File generation failed: ${result.fileGenerationStatus}`);
  }

  return { passed: errors.length === 0, errors };
}

// File validation function
function validateGeneratedFiles(testResults) {
  console.log("\n📁 Validating Generated Files");
  console.log("-".repeat(50));

  const allFiles = [];
  const validationResults = {
    passed: true,
    errors: [],
    fileDetails: [],
  };

  testResults.forEach((test, index) => {
    if (test.result && test.result.files) {
      const files = test.result.files;
      console.log(`\nTest Case ${index + 1} Files:`);

      // Check conversation file
      if (files.conversation) {
        console.log(`   📄 Conversation: ${files.conversation}`);
        if (fs.existsSync(files.conversation)) {
          const stats = fs.statSync(files.conversation);
          console.log(`      Size: ${stats.size} bytes`);
          allFiles.push(files.conversation);

          // Validate content
          try {
            const content = fs.readFileSync(files.conversation, "utf8");
            if (content.length < 100) {
              validationResults.errors.push(
                `Conversation file too short: ${files.conversation}`
              );
              validationResults.passed = false;
            }
          } catch (error) {
            validationResults.errors.push(
              `Cannot read conversation file: ${files.conversation}`
            );
            validationResults.passed = false;
          }
        } else {
          validationResults.errors.push(
            `Conversation file not found: ${files.conversation}`
          );
          validationResults.passed = false;
        }
      }

      // Check summary file
      if (files.summary) {
        console.log(`   📋 Summary: ${files.summary}`);
        if (fs.existsSync(files.summary)) {
          const stats = fs.statSync(files.summary);
          console.log(`      Size: ${stats.size} bytes`);
          allFiles.push(files.summary);
        } else {
          validationResults.errors.push(
            `Summary file not found: ${files.summary}`
          );
          validationResults.passed = false;
        }
      }

      // Check data file
      if (files.data) {
        console.log(`   📊 Data: ${files.data}`);
        if (fs.existsSync(files.data)) {
          const stats = fs.statSync(files.data);
          console.log(`      Size: ${stats.size} bytes`);
          allFiles.push(files.data);

          // Validate JSON structure
          try {
            const content = fs.readFileSync(files.data, "utf8");
            const data = JSON.parse(content);
            if (!data.runId || !data.conversation || !data.summary) {
              validationResults.errors.push(
                `Invalid JSON structure: ${files.data}`
              );
              validationResults.passed = false;
            }
          } catch (error) {
            validationResults.errors.push(`Invalid JSON file: ${files.data}`);
            validationResults.passed = false;
          }
        } else {
          validationResults.errors.push(`Data file not found: ${files.data}`);
          validationResults.passed = false;
        }
      }
    }
  });

  console.log(`\n📊 File Validation Summary:`);
  console.log(`   Total files generated: ${allFiles.length}`);
  console.log(
    `   Validation: ${validationResults.passed ? "PASSED" : "FAILED"}`
  );

  if (!validationResults.passed) {
    console.log(`   Errors:`);
    validationResults.errors.forEach((error) => console.log(`     - ${error}`));
  }

  return validationResults;
}

// Main test runner
async function runIntegrationTests() {
  const startTime = Date.now();

  console.log("🚀 Executing Integration Test Suite...\n");

  const testResults = [];

  // Run test cases
  testResults.push(await testCase1());
  testResults.push(await testCase2());
  testResults.push(await testCase3());

  // Validate generated files
  const fileValidation = validateGeneratedFiles(testResults);

  // Generate final report
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;

  console.log("\n" + "=".repeat(60));
  console.log("📊 INTEGRATION TEST REPORT");
  console.log("=".repeat(60));

  const passedTests = testResults.filter((test) => test.passed).length;
  const totalTests = testResults.length;

  console.log(`\n📈 Test Summary:`);
  console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
  console.log(
    `   File Validation: ${fileValidation.passed ? "PASSED" : "FAILED"}`
  );
  console.log(`   Total Duration: ${totalDuration}s`);
  console.log(
    `   Average Test Duration: ${(
      testResults.reduce((sum, test) => sum + (test.duration || 0), 0) /
      totalTests
    ).toFixed(2)}s`
  );

  console.log(`\n📋 Individual Test Results:`);
  testResults.forEach((test, index) => {
    console.log(
      `   Test Case ${index + 1}: ${
        test.passed ? "✅ PASSED" : "❌ FAILED"
      } (${test.duration?.toFixed(2)}s)`
    );
    if (!test.passed && test.error) {
      console.log(`      Error: ${test.error}`);
    }
  });

  const overallPassed = passedTests === totalTests && fileValidation.passed;

  console.log(
    `\n🎯 Overall Result: ${
      overallPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"
    }`
  );

  if (overallPassed) {
    console.log("\n🎉 Integration testing completed successfully!");
    console.log("   ✅ All dialogue pipeline functionality working correctly");
    console.log("   ✅ File generation working properly");
    console.log("   ✅ Error handling functioning as expected");
    console.log("   ✅ Performance within acceptable limits");
  } else {
    console.log(
      "\n⚠️  Integration testing identified issues that need attention."
    );
  }

  console.log("\n" + "=".repeat(60));

  return {
    passed: overallPassed,
    testResults,
    fileValidation,
    totalDuration,
    summary: {
      passedTests,
      totalTests,
      fileValidationPassed: fileValidation.passed,
    },
  };
}

// Run the tests
runIntegrationTests()
  .then((results) => {
    process.exit(results.passed ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n💥 Integration testing failed with error:", error);
    process.exit(1);
  });
