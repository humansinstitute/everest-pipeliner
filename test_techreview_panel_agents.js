/**
 * Test script for Tech Review Panel agents
 * Tests agent loading and basic functionality
 */

import { fileURLToPath } from "url";

// ES Module main detection
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

async function testTechReviewAgentLoading() {
  console.log("🔧 Testing Tech Review Panel Agent Loading...\n");

  const agents = [
    {
      name: "Tech Review Moderator",
      path: "./src/agents/panel/techreview/moderator.js",
      expectedFunction: "techReviewModeratorAgent",
    },
    {
      name: "System Architect (Panel 1)",
      path: "./src/agents/panel/techreview/panel1_architect.js",
      expectedFunction: "systemArchitectAgent",
    },
    {
      name: "Performance Engineer (Panel 2)",
      path: "./src/agents/panel/techreview/panel2_performance.js",
      expectedFunction: "performanceEngineerAgent",
    },
    {
      name: "Innovation Engineer (Panel 3)",
      path: "./src/agents/panel/techreview/panel3_innovation.js",
      expectedFunction: "innovationEngineerAgent",
    },
    {
      name: "Tech Review Summary Agent",
      path: "./src/agents/panel/techreview/summarizePanel.js",
      expectedFunction: "techReviewSummaryAgent",
    },
  ];

  let allPassed = true;

  for (const agent of agents) {
    try {
      console.log(`📋 Testing ${agent.name}...`);

      // Import the agent module
      const agentModule = await import(agent.path);

      // Check if default export exists
      if (!agentModule.default) {
        console.log(`❌ ${agent.name}: No default export found`);
        allPassed = false;
        continue;
      }

      // Check if it's a function
      if (typeof agentModule.default !== "function") {
        console.log(`❌ ${agent.name}: Default export is not a function`);
        allPassed = false;
        continue;
      }

      console.log(`✅ ${agent.name}: Successfully loaded`);

      // Test basic function call structure (without actually calling Everest API)
      try {
        const testMessage = "Test technical review context";
        const testContext = "Sample technical review materials";
        const result = await agentModule.default(testMessage, testContext, []);

        if (result && typeof result === "object") {
          console.log(`✅ ${agent.name}: Function call structure valid`);
        } else {
          console.log(
            `⚠️  ${agent.name}: Function call returned unexpected result type`
          );
        }
      } catch (error) {
        // Expected to fail due to missing environment variables, but structure should be valid
        if (
          error.message.includes("requires conversation context") ||
          error.message.includes("EVEREST_API_KEY") ||
          error.message.includes("API key")
        ) {
          console.log(
            `✅ ${agent.name}: Function structure valid (expected API error)`
          );
        } else {
          console.log(`⚠️  ${agent.name}: Unexpected error: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${agent.name}: Failed to load - ${error.message}`);
      allPassed = false;
    }

    console.log("");
  }

  return allPassed;
}

async function testTechReviewConfig() {
  console.log("📋 Testing Tech Review Panel Configuration...\n");

  try {
    const { createPanelConfig } = await import(
      "./src/services/panelTypeConfig.js"
    );

    // Test creating tech review config
    const config = createPanelConfig("techreview");

    console.log("✅ Tech Review Config created successfully");
    console.log(`Panel Type: ${config.panelType}`);
    console.log(`Focus: ${config.focus}`);
    console.log(`Default Interactions: ${config.defaultInteractions}`);
    console.log(
      `Conversation Balance: ${config.conversationBalance?.conservative}% conservative, ${config.conversationBalance?.innovation}% innovation`
    );
    console.log(`Required Inputs: ${config.requiredInputs?.join(", ")}`);

    // Test validation
    const validation = config.validate();
    if (validation.isValid) {
      console.log("✅ Tech Review Config validation passed");
    } else {
      console.log("❌ Tech Review Config validation failed:");
      validation.errors.forEach((error) => console.log(`   - ${error}`));
      return false;
    }

    // Test participants
    console.log("\n👥 Panel Participants:");
    Object.entries(config.participants).forEach(([role, participant]) => {
      console.log(`   ${role}: ${participant.name} - ${participant.role}`);
    });

    return true;
  } catch (error) {
    console.log(`❌ Tech Review Config test failed: ${error.message}`);
    return false;
  }
}

async function testInputFiles() {
  console.log("\n📁 Testing Tech Review Input Files...\n");

  const inputFiles = [
    "input/techreview/sample_prd.md",
    "input/techreview/sample_design_doc.md",
    "input/techreview/sample_codebase.md",
  ];

  let allExist = true;

  for (const filePath of inputFiles) {
    try {
      const fs = await import("fs/promises");
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        const content = await fs.readFile(filePath, "utf-8");
        console.log(`✅ ${filePath}: Exists (${content.length} characters)`);
      } else {
        console.log(`❌ ${filePath}: Not a file`);
        allExist = false;
      }
    } catch (error) {
      console.log(`❌ ${filePath}: Does not exist or cannot be read`);
      allExist = false;
    }
  }

  return allExist;
}

async function runAllTests() {
  console.log("🧪 Tech Review Panel Implementation Tests\n");
  console.log("=".repeat(50));

  const results = {
    agentLoading: await testTechReviewAgentLoading(),
    config: await testTechReviewConfig(),
    inputFiles: await testInputFiles(),
  };

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary:");
  console.log(`Agent Loading: ${results.agentLoading ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Configuration: ${results.config ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Input Files: ${results.inputFiles ? "✅ PASS" : "❌ FAIL"}`);

  const allPassed = Object.values(results).every((result) => result === true);
  console.log(
    `\nOverall: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`
  );

  if (allPassed) {
    console.log("\n🎉 Tech Review Panel is ready for testing!");
    console.log(
      "You can now run the tech review panel from the main CLI menu."
    );
  } else {
    console.log("\n⚠️  Please fix the failing tests before proceeding.");
  }

  return allPassed;
}

// Run tests if this is the main module
if (isMain) {
  runAllTests().catch(console.error);
}

export {
  testTechReviewAgentLoading,
  testTechReviewConfig,
  testInputFiles,
  runAllTests,
};
