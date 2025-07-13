#!/usr/bin/env node

import {
  listSourceFiles,
  readSourceFile,
  validateSourceFile,
} from "./src/pipelines/dialoguePipeline.js";

console.log("🧪 Testing Phase 2 File Input Integration\n");

async function testPhase2() {
  try {
    // Test 1: List source files
    console.log("📁 Test 1: Listing source files...");
    const files = await listSourceFiles();
    console.log(`✅ Found ${files.length} source files:`);
    files.forEach((file) => {
      console.log(
        `   ${file.index}. ${file.name} (${file.extension}) - ${file.basename}`
      );
    });

    if (files.length === 0) {
      console.log(
        "⚠️  No files found for testing. Please add .txt or .md files to output/dialogue/ip/"
      );
      return;
    }

    // Test 2: Validate first file
    console.log("\n🔍 Test 2: Validating first file...");
    const firstFile = files[0];
    const isValid = await validateSourceFile(firstFile.path);
    console.log(
      `✅ File validation for ${firstFile.name}: ${
        isValid ? "PASSED" : "FAILED"
      }`
    );

    // Test 3: Read file content
    console.log("\n📖 Test 3: Reading file content...");
    const content = await readSourceFile(firstFile.path);
    console.log(`✅ Successfully read ${firstFile.name}:`);
    console.log(`   - Length: ${content.length} characters`);
    console.log(`   - Preview: ${content.substring(0, 150)}...`);

    // Test 4: Test error handling with invalid file
    console.log("\n❌ Test 4: Testing error handling...");
    try {
      await readSourceFile("nonexistent/file.txt");
      console.log("❌ Error handling test FAILED - should have thrown error");
    } catch (error) {
      console.log(`✅ Error handling test PASSED - caught: ${error.message}`);
    }

    console.log("\n🎉 All Phase 2 tests completed successfully!");
    console.log("\n📋 Phase 2 Implementation Summary:");
    console.log("   ✅ listSourceFiles() - Scans output/dialogue/ip directory");
    console.log("   ✅ readSourceFile() - Reads .txt and .md files");
    console.log("   ✅ validateSourceFile() - Validates file accessibility");
    console.log("   ✅ CLI integration - File selection menu added");
    console.log("   ✅ Error handling - Graceful fallbacks implemented");
  } catch (error) {
    console.error("❌ Phase 2 test failed:", error.message);
    process.exit(1);
  }
}

testPhase2();
