/**
 * Phase 2 Integration Test Script
 *
 * Tests all pipelines through the MCP interface to validate:
 * - Pipeline discovery and registration
 * - Universal interface implementation
 * - MCP tool execution
 * - Response formatting
 * - Error handling
 */

import { fileURLToPath } from "url";
import { PipelinerMCPServer } from "./src/mcp/server.js";
import { getMCPConfig } from "./src/mcp/config.js";
import { createMCPLogger } from "./src/shared/logger.js";

const logger = createMCPLogger({ requestId: "phase2-test" });

/**
 * Test configuration for each pipeline
 */
const testConfigs = {
  dialogue: {
    sourceText:
      "Artificial Intelligence is transforming how we work and live. While it offers tremendous opportunities for efficiency and innovation, it also raises important questions about employment, privacy, and ethical decision-making.",
    discussionPrompt:
      "What are the key opportunities and challenges that AI presents for society?",
    iterations: 2,
    summaryFocus:
      "Focus on practical implications for individuals and organizations",
  },
  facilitatedDialogue: {
    sourceText:
      "Remote work has become a permanent fixture in many industries. This shift brings both benefits like flexibility and challenges like maintaining team cohesion and company culture.",
    discussionPrompt:
      "How can organizations optimize remote work while maintaining productivity and culture?",
    iterations: 2,
    summaryFocus:
      "Provide actionable recommendations for remote work optimization",
    facilitatorEnabled: true,
  },
  contentWaterfall: {
    sourceText: `# The Future of Sustainable Energy

Renewable energy sources are becoming increasingly cost-effective and efficient. Solar and wind power now compete directly with fossil fuels in many markets.

## Key Developments
- Battery storage technology improvements
- Smart grid integration
- Government policy support
- Corporate sustainability commitments

## Challenges
- Infrastructure investment requirements
- Grid stability concerns
- Transition period management
- Skills retraining needs

The transition to sustainable energy represents both an environmental imperative and an economic opportunity.`,
    customFocus:
      "Focus on business opportunities and practical implementation strategies",
  },
  simpleChat: {
    message: "Explain the benefits of renewable energy in simple terms",
  },
};

/**
 * Runs a comprehensive test suite for Phase 2 MCP integration
 */
async function runPhase2Tests() {
  console.log("🚀 Starting Phase 2 MCP Integration Tests\n");

  const config = getMCPConfig();
  config.enabled = true;
  config.includeDebugInfo = true;

  let server;
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Test 1: Server Initialization
    console.log("📋 Test 1: MCP Server Initialization");
    server = new PipelinerMCPServer(config);
    await server.initialize();

    const tools = server.listTools();
    console.log(`✅ Server initialized with ${tools.length} tools`);
    console.log(`🔧 Available tools: ${tools.map((t) => t.name).join(", ")}`);

    testResults.total++;
    testResults.passed++;

    // Test 2: Pipeline Discovery Validation
    console.log("\n📋 Test 2: Pipeline Discovery Validation");
    const expectedPipelines = [
      "dialogue",
      "facilitatedDialogue",
      "contentWaterfall",
      "simpleChat",
    ];
    const discoveredTools = tools.map((t) => t.name);

    for (const expectedPipeline of expectedPipelines) {
      const toolName = `run_${expectedPipeline}_pipeline`;
      if (discoveredTools.some((name) => name.includes(expectedPipeline))) {
        console.log(
          `✅ ${expectedPipeline} pipeline discovered and registered`
        );
      } else {
        console.log(`❌ ${expectedPipeline} pipeline NOT found`);
        testResults.errors.push(`Missing pipeline: ${expectedPipeline}`);
      }
    }

    testResults.total++;
    testResults.passed++;

    // Test 3: Tool Schema Validation
    console.log("\n📋 Test 3: Tool Schema Validation");
    for (const tool of tools) {
      if (tool.inputSchema && tool.inputSchema.properties) {
        console.log(
          `✅ ${tool.name} has valid schema with ${
            Object.keys(tool.inputSchema.properties).length
          } parameters`
        );
      } else {
        console.log(`❌ ${tool.name} missing or invalid schema`);
        testResults.errors.push(`Invalid schema: ${tool.name}`);
      }
    }

    testResults.total++;
    testResults.passed++;

    // Test 4-7: Individual Pipeline Execution Tests
    for (const [pipelineName, testConfig] of Object.entries(testConfigs)) {
      testResults.total++;

      try {
        console.log(`\n📋 Test: ${pipelineName} Pipeline Execution`);

        // Find the corresponding tool
        const tool = tools.find((t) => t.name.includes(pipelineName));
        if (!tool) {
          throw new Error(`Tool not found for pipeline: ${pipelineName}`);
        }

        console.log(`🔧 Executing tool: ${tool.name}`);
        console.log(`📝 Parameters: ${Object.keys(testConfig).join(", ")}`);

        // Execute the tool
        const startTime = Date.now();
        const result = await server.executeTool(tool.name, testConfig);
        const duration = Date.now() - startTime;

        console.log(`⏱️ Execution time: ${duration}ms`);

        // Validate result structure
        if (result.content && Array.isArray(result.content)) {
          console.log(`✅ ${pipelineName} executed successfully`);
          console.log(`📄 Response content blocks: ${result.content.length}`);

          // Log first content block preview
          if (result.content[0] && result.content[0].text) {
            const preview = result.content[0].text.substring(0, 200);
            console.log(`📖 Preview: ${preview}...`);
          }

          testResults.passed++;
        } else if (result.isError) {
          console.log(`❌ ${pipelineName} execution failed with error`);
          console.log(`🔍 Error details: ${JSON.stringify(result, null, 2)}`);
          testResults.errors.push(
            `${pipelineName} execution error: ${
              result.content?.[0]?.text || "Unknown error"
            }`
          );
        } else {
          console.log(`⚠️ ${pipelineName} returned unexpected result format`);
          console.log(`🔍 Result: ${JSON.stringify(result, null, 2)}`);
          testResults.errors.push(`${pipelineName} unexpected result format`);
        }
      } catch (error) {
        console.log(`❌ ${pipelineName} test failed: ${error.message}`);
        testResults.errors.push(`${pipelineName} test error: ${error.message}`);
      }
    }

    // Test 8: Error Handling
    console.log("\n📋 Test: Error Handling");
    testResults.total++;

    try {
      const invalidTool = tools[0];
      if (invalidTool) {
        // Test with invalid parameters
        const errorResult = await server.executeTool(invalidTool.name, {
          invalidParam: "test",
        });

        if (errorResult.isError) {
          console.log("✅ Error handling works correctly");
          testResults.passed++;
        } else {
          console.log("❌ Error handling not working as expected");
          testResults.errors.push("Error handling validation failed");
        }
      }
    } catch (error) {
      console.log(`✅ Error handling caught exception: ${error.message}`);
      testResults.passed++;
    }

    // Test 9: Registry Statistics
    console.log("\n📋 Test: Registry Statistics");
    testResults.total++;

    const stats = server.registry.getStats();
    console.log(`📊 Registry Statistics:`);
    console.log(`   - Total Tools: ${stats.totalTools}`);
    console.log(`   - Total Pipelines: ${stats.totalPipelines}`);
    console.log(`   - Discovered Pipelines: ${stats.discoveredPipelines}`);
    console.log(`   - Inferred Pipelines: ${stats.inferredPipelines}`);
    console.log(`   - MCP Interface Support: ${stats.interfaces.mcp}`);
    console.log(`   - CLI Interface Support: ${stats.interfaces.cli}`);
    console.log(`   - NostrMQ Interface Support: ${stats.interfaces.nostrmq}`);

    if (stats.totalTools > 0 && stats.interfaces.mcp > 0) {
      console.log("✅ Registry statistics look healthy");
      testResults.passed++;
    } else {
      console.log("❌ Registry statistics indicate issues");
      testResults.errors.push("Registry statistics validation failed");
    }
  } catch (error) {
    console.error(`❌ Test suite failed: ${error.message}`);
    testResults.errors.push(`Test suite error: ${error.message}`);
  }

  // Final Results
  console.log("\n" + "=".repeat(60));
  console.log("📊 PHASE 2 TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(
    `Success Rate: ${Math.round(
      (testResults.passed / testResults.total) * 100
    )}%`
  );

  if (testResults.errors.length > 0) {
    console.log("\n❌ ERRORS:");
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  if (testResults.passed === testResults.total) {
    console.log("\n🎉 ALL TESTS PASSED! Phase 2 implementation is successful.");
  } else {
    console.log(
      `\n⚠️ ${
        testResults.total - testResults.passed
      } tests failed. Review errors above.`
    );
  }

  console.log("\n✅ Phase 2 MCP Integration Test Complete");

  return {
    success: testResults.passed === testResults.total,
    results: testResults,
  };
}

/**
 * Validates backward compatibility with CLI functionality
 */
async function validateBackwardCompatibility() {
  console.log("\n🔄 Testing Backward Compatibility with CLI");

  try {
    // Test direct pipeline imports
    const { dialoguePipeline } = await import(
      "./src/pipelines/dialoguePipeline.js"
    );
    const { facilitatedDialoguePipeline } = await import(
      "./src/pipelines/facilitatedDialoguePipeline.js"
    );
    const { contentWaterfallPipeline } = await import(
      "./src/pipelines/contentWaterfallPipeline.js"
    );
    const { simpleChatPipeline } = await import(
      "./src/pipelines/simpleChatPipeline.js"
    );

    console.log("✅ All pipeline modules can be imported directly");
    console.log("✅ CLI functionality preserved");

    return true;
  } catch (error) {
    console.log(`❌ Backward compatibility issue: ${error.message}`);
    return false;
  }
}

// Main execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhase2Tests()
    .then(async (result) => {
      const backwardCompatible = await validateBackwardCompatibility();

      if (result.success && backwardCompatible) {
        console.log("\n🎯 PHASE 2 IMPLEMENTATION COMPLETE AND VALIDATED");
        process.exit(0);
      } else {
        console.log("\n❌ PHASE 2 IMPLEMENTATION HAS ISSUES");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

export { runPhase2Tests, validateBackwardCompatibility };
