/**
 * Test script to verify security panel agents can be loaded correctly
 */

import { fileURLToPath } from "url";

// ES Module main detection
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

async function testSecurityAgentLoading() {
  console.log("🔒 Testing Security Panel Agent Loading...\n");

  try {
    // Test loading security moderator
    console.log("1. Testing Security Moderator Agent...");
    const moderatorAgent = await import(
      "./src/agents/panel/security/moderator.js"
    );
    console.log("✅ Security Moderator loaded successfully");

    // Test loading offensive security agent
    console.log("2. Testing Offensive Security Agent...");
    const offensiveAgent = await import(
      "./src/agents/panel/security/panel1_offensive.js"
    );
    console.log("✅ Offensive Security Agent loaded successfully");

    // Test loading defensive security agent
    console.log("3. Testing Defensive Security Agent...");
    const defensiveAgent = await import(
      "./src/agents/panel/security/panel2_defensive.js"
    );
    console.log("✅ Defensive Security Agent loaded successfully");

    // Test loading risk assessment agent
    console.log("4. Testing Risk Assessment Agent...");
    const riskAgent = await import(
      "./src/agents/panel/security/panel3_risk.js"
    );
    console.log("✅ Risk Assessment Agent loaded successfully");

    // Test loading security summarizer
    console.log("5. Testing Security Summarizer Agent...");
    const summarizerAgent = await import(
      "./src/agents/panel/security/summarizePanel.js"
    );
    console.log("✅ Security Summarizer Agent loaded successfully");

    console.log("\n🎉 All security panel agents loaded successfully!");

    // Test SecurityConfig
    console.log("\n6. Testing SecurityConfig...");
    const { createPanelConfig } = await import(
      "./src/services/panelTypeConfig.js"
    );
    const securityConfig = createPanelConfig("security");

    console.log("Security Config created:");
    console.log(`- Panel Type: ${securityConfig.panelType}`);
    console.log(`- Focus: ${securityConfig.focus}`);
    console.log(
      `- Default Interactions: ${securityConfig.defaultInteractions}`
    );
    console.log(
      `- Participants: ${Object.keys(securityConfig.participants).length}`
    );

    // Test validation
    const validation = securityConfig.validate();
    if (validation.isValid) {
      console.log("✅ SecurityConfig validation passed");
    } else {
      console.log("❌ SecurityConfig validation failed:");
      validation.errors.forEach((error) => console.log(`  - ${error}`));
    }

    console.log("\n🔒 Security Panel Agent Loading Test Complete!");
    return true;
  } catch (error) {
    console.error("❌ Error testing security panel agents:", error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test if this is the main module
if (isMain) {
  testSecurityAgentLoading()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

export { testSecurityAgentLoading };
