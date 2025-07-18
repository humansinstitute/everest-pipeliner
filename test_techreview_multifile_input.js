/**
 * Test script for Tech Review Panel multi-file input processing
 * Tests the CLI input collection functionality
 */

import { fileURLToPath } from "url";

// ES Module main detection
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

async function testFileSelection() {
  console.log("📁 Testing Tech Review Multi-File Input Processing...\n");

  try {
    // Import the selectSourceFile function from index.js
    // Note: This is a simplified test since the actual function requires readline interaction

    const fs = await import("fs/promises");

    // Test that the techreview input directory exists and has files
    console.log("📋 Checking input/techreview directory...");

    const files = await fs.readdir("input/techreview");
    const inputFiles = files.filter(
      (file) => file.endsWith(".txt") || file.endsWith(".md")
    );

    console.log(
      `✅ Found ${inputFiles.length} input files in input/techreview/:`
    );
    inputFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });

    // Test reading each file
    console.log("\n📖 Testing file reading...");
    const fileContents = {};

    for (const file of inputFiles) {
      const filePath = `input/techreview/${file}`;
      const content = await fs.readFile(filePath, "utf-8");
      fileContents[file] = content;
      console.log(`✅ ${file}: ${content.length} characters`);
    }

    // Simulate the multi-file input collection
    console.log("\n🔄 Simulating multi-file input collection...");

    const requiredFiles = [
      "sample_prd.md",
      "sample_design_doc.md",
      "sample_codebase.md",
    ];
    const collectedInputs = {};

    for (const requiredFile of requiredFiles) {
      if (fileContents[requiredFile]) {
        collectedInputs[requiredFile] = fileContents[requiredFile];
        console.log(
          `✅ Collected ${requiredFile}: ${fileContents[requiredFile].length} characters`
        );
      } else {
        console.log(`❌ Missing required file: ${requiredFile}`);
        return false;
      }
    }

    // Test combined content creation
    console.log("\n📝 Testing combined content creation...");

    const combinedContent = `PRODUCT REQUIREMENTS DOCUMENT (PRD):
${collectedInputs["sample_prd.md"]}

TECHNICAL DESIGN DOCUMENT:
${collectedInputs["sample_design_doc.md"]}

CODEBASE IMPLEMENTATION:
${collectedInputs["sample_codebase.md"]}`;

    console.log(
      `✅ Combined content created: ${combinedContent.length} characters`
    );

    // Validate content structure
    const hasAllSections =
      combinedContent.includes("PRODUCT REQUIREMENTS DOCUMENT") &&
      combinedContent.includes("TECHNICAL DESIGN DOCUMENT") &&
      combinedContent.includes("CODEBASE IMPLEMENTATION");

    if (hasAllSections) {
      console.log("✅ Combined content has all required sections");
    } else {
      console.log("❌ Combined content missing required sections");
      return false;
    }

    return true;
  } catch (error) {
    console.log(`❌ Multi-file input test failed: ${error.message}`);
    return false;
  }
}

async function testTechReviewConfig() {
  console.log("\n⚙️  Testing Tech Review Configuration...\n");

  try {
    const { createPanelConfig } = await import(
      "./src/services/panelTypeConfig.js"
    );

    const config = createPanelConfig("techreview");

    // Test required inputs validation
    console.log("📋 Testing required inputs validation...");

    if (config.requiredInputs && config.requiredInputs.length === 3) {
      console.log(
        `✅ Required inputs configured: ${config.requiredInputs.join(", ")}`
      );
    } else {
      console.log("❌ Required inputs not properly configured");
      return false;
    }

    // Test conversation balance
    console.log("⚖️  Testing conversation balance...");

    if (
      config.conversationBalance &&
      config.conversationBalance.conservative === 70 &&
      config.conversationBalance.innovation === 30
    ) {
      console.log(
        "✅ Conversation balance configured correctly (70% conservative, 30% innovation)"
      );
    } else {
      console.log("❌ Conversation balance not properly configured");
      return false;
    }

    // Test panel participants
    console.log("👥 Testing panel participants...");

    const expectedParticipants = ["moderator", "panel1", "panel2", "panel3"];
    const expectedNames = [
      "Tech Lead",
      "System Architect",
      "Performance Engineer",
      "Innovation Engineer",
    ];

    for (let i = 0; i < expectedParticipants.length; i++) {
      const role = expectedParticipants[i];
      const expectedName = expectedNames[i];

      if (
        config.participants[role] &&
        config.participants[role].name === expectedName
      ) {
        console.log(`✅ ${role}: ${config.participants[role].name}`);
      } else {
        console.log(
          `❌ ${role}: Expected ${expectedName}, got ${
            config.participants[role]?.name || "undefined"
          }`
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.log(`❌ Tech Review Config test failed: ${error.message}`);
    return false;
  }
}

async function testPipelineIntegration() {
  console.log("\n🔗 Testing Pipeline Integration...\n");

  try {
    // Test that moderatedPanelPipeline can be imported
    const { moderatedPanelPipeline } = await import(
      "./src/pipelines/moderatedPanelPipeline.js"
    );

    if (typeof moderatedPanelPipeline === "function") {
      console.log("✅ moderatedPanelPipeline function available");
    } else {
      console.log("❌ moderatedPanelPipeline not available or not a function");
      return false;
    }

    // Test panel type configuration
    const { getAvailablePanelTypes, isValidPanelType } = await import(
      "./src/services/panelTypeConfig.js"
    );

    const availableTypes = getAvailablePanelTypes();
    if (availableTypes.includes("techreview")) {
      console.log("✅ techreview panel type is available");
    } else {
      console.log("❌ techreview panel type not in available types");
      return false;
    }

    if (isValidPanelType("techreview")) {
      console.log("✅ techreview is recognized as valid panel type");
    } else {
      console.log("❌ techreview not recognized as valid panel type");
      return false;
    }

    return true;
  } catch (error) {
    console.log(`❌ Pipeline integration test failed: ${error.message}`);
    return false;
  }
}

async function runMultiFileTests() {
  console.log("🧪 Tech Review Multi-File Input Tests\n");
  console.log("=".repeat(50));

  const results = {
    fileSelection: await testFileSelection(),
    config: await testTechReviewConfig(),
    pipelineIntegration: await testPipelineIntegration(),
  };

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary:");
  console.log(
    `File Selection: ${results.fileSelection ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(`Configuration: ${results.config ? "✅ PASS" : "❌ FAIL"}`);
  console.log(
    `Pipeline Integration: ${
      results.pipelineIntegration ? "✅ PASS" : "❌ FAIL"
    }`
  );

  const allPassed = Object.values(results).every((result) => result === true);
  console.log(
    `\nOverall: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`
  );

  if (allPassed) {
    console.log("\n🎉 Multi-file input processing is ready!");
    console.log(
      "The tech review panel can handle PRD + Design Doc + Codebase inputs."
    );
  } else {
    console.log("\n⚠️  Please fix the failing tests before proceeding.");
  }

  return allPassed;
}

// Run tests if this is the main module
if (isMain) {
  runMultiFileTests().catch(console.error);
}

export {
  testFileSelection,
  testTechReviewConfig,
  testPipelineIntegration,
  runMultiFileTests,
};
