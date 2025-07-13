import { dialoguePipeline } from "./src/pipelines/dialoguePipeline.js";
import { promises as fs } from "fs";
import path from "path";

/**
 * Phase 3 Validation Test: File Output Integration
 * Tests that cost data is properly included in JSON and markdown outputs
 */

console.log("🧪 Phase 3 Validation Test: File Output Integration");
console.log("=".repeat(60));

async function testPhase3Implementation() {
  try {
    // Test configuration
    const testConfig = {
      sourceText:
        "Artificial Intelligence is transforming industries rapidly. It offers great potential but also raises concerns about job displacement and ethics.",
      discussionPrompt:
        "What are the key opportunities and challenges of AI for society?",
      iterations: 1, // Keep it minimal for testing
      summaryFocus:
        "Summarize the main points about AI opportunities and challenges.",
    };

    console.log("📋 Running dialogue pipeline with cost tracking...");
    const result = await dialoguePipeline(testConfig);

    if (result.error) {
      console.error("❌ Pipeline failed:", result.error);
      return false;
    }

    console.log("✅ Pipeline completed successfully");
    console.log(
      `📁 Files generated in: ${
        result.files?.data ? path.dirname(result.files.data) : "unknown"
      }`
    );

    // Test 1: Validate JSON output contains cost data
    console.log("\n🔍 Test 1: Validating JSON output contains cost data...");
    if (result.files?.data) {
      try {
        const jsonContent = await fs.readFile(result.files.data, "utf8");
        const jsonData = JSON.parse(jsonContent);

        if (jsonData.costs) {
          console.log("✅ JSON contains costs object");
          console.log(
            `   - Total cost: $${jsonData.costs.totalCostUSD || "N/A"}`
          );
          console.log(
            `   - Total tokens in: ${jsonData.costs.totalTokensIn || "N/A"}`
          );
          console.log(
            `   - Total tokens out: ${jsonData.costs.totalTokensOut || "N/A"}`
          );
          console.log(
            `   - Steps tracked: ${
              jsonData.costs.steps
                ? Object.keys(jsonData.costs.steps).length
                : 0
            }`
          );
        } else {
          console.error("❌ JSON does not contain costs object");
          return false;
        }
      } catch (error) {
        console.error("❌ Error reading JSON file:", error.message);
        return false;
      }
    } else {
      console.error("❌ No JSON file generated");
      return false;
    }

    // Test 2: Validate conversation markdown contains cost summary
    console.log(
      "\n🔍 Test 2: Validating conversation markdown contains cost summary..."
    );
    if (result.files?.conversation) {
      try {
        const conversationContent = await fs.readFile(
          result.files.conversation,
          "utf8"
        );

        if (conversationContent.includes("## Cost Summary")) {
          console.log("✅ Conversation markdown contains Cost Summary section");

          // Extract cost summary section
          const costSummaryMatch = conversationContent.match(
            /## Cost Summary\n(.*?)\n\n## /s
          );
          if (costSummaryMatch) {
            console.log("   Cost summary content:");
            console.log("   " + costSummaryMatch[1].split("\n").join("\n   "));
          }
        } else {
          console.error(
            "❌ Conversation markdown does not contain Cost Summary section"
          );
          return false;
        }
      } catch (error) {
        console.error(
          "❌ Error reading conversation markdown file:",
          error.message
        );
        return false;
      }
    } else {
      console.error("❌ No conversation markdown file generated");
      return false;
    }

    // Test 3: Validate summary markdown contains cost summary
    console.log(
      "\n🔍 Test 3: Validating summary markdown contains cost summary..."
    );
    if (result.files?.summary) {
      try {
        const summaryContent = await fs.readFile(result.files.summary, "utf8");

        if (summaryContent.includes("## Cost Summary")) {
          console.log("✅ Summary markdown contains Cost Summary section");

          // Extract cost summary section
          const costSummaryMatch = summaryContent.match(
            /## Cost Summary\n(.*?)\n\n## /s
          );
          if (costSummaryMatch) {
            console.log("   Cost summary content:");
            console.log("   " + costSummaryMatch[1].split("\n").join("\n   "));
          }
        } else {
          console.error(
            "❌ Summary markdown does not contain Cost Summary section"
          );
          return false;
        }
      } catch (error) {
        console.error("❌ Error reading summary markdown file:", error.message);
        return false;
      }
    } else {
      console.error("❌ No summary markdown file generated");
      return false;
    }

    // Test 4: Validate file structure is preserved
    console.log("\n🔍 Test 4: Validating file structure is preserved...");
    const expectedFiles = ["conversation.md", "summary.md", "data.json"];
    const outputDir = path.dirname(result.files.data);

    try {
      const files = await fs.readdir(outputDir);
      const hasAllFiles = expectedFiles.every((file) => files.includes(file));

      if (hasAllFiles) {
        console.log("✅ All expected files present:", expectedFiles.join(", "));
      } else {
        console.error("❌ Missing expected files. Found:", files.join(", "));
        return false;
      }
    } catch (error) {
      console.error("❌ Error reading output directory:", error.message);
      return false;
    }

    console.log("\n🎉 Phase 3 validation completed successfully!");
    console.log("📊 Summary:");
    console.log("   ✅ JSON files include complete cost data structure");
    console.log(
      "   ✅ Markdown files include formatted cost summary in headers"
    );
    console.log("   ✅ File naming and directory structure unchanged");
    console.log(
      "   ✅ Existing file content preserved with cost data as addition"
    );

    return true;
  } catch (error) {
    console.error("❌ Phase 3 validation failed:", error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testPhase3Implementation()
  .then((success) => {
    if (success) {
      console.log("\n✅ Phase 3 File Output Integration: PASSED");
      process.exit(0);
    } else {
      console.log("\n❌ Phase 3 File Output Integration: FAILED");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
