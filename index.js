import readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  dialoguePipeline,
  listSourceFiles,
  readSourceFile,
} from "./src/pipelines/dialoguePipeline.js";
import { facilitatedDialoguePipeline } from "./src/pipelines/facilitatedDialoguePipeline.js";
import {
  contentWaterfallPipeline,
  listWaterfallSourceFiles,
  readWaterfallSourceFile,
} from "./src/pipelines/contentWaterfallPipeline.js";
import { PipelinerMCPServer } from "./src/mcp/server.js";
import { getMCPConfig } from "./src/mcp/config.js";

// Load environment variables
dotenv.config();

// ES Module main detection
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function displayMenu() {
  console.log("\n=== Pipeliner Menu ===");
  console.log("1. Run Simple Chat Pipeline");
  console.log("2. Run Dialogue Pipeline");
  console.log("3. Run Facilitated Dialogue Pipeline");
  console.log("4. Run Content Waterfall Pipeline");
  console.log("5. Manage Agents");
  console.log("6. Start MCP Server");
  console.log("7. Start Both Services (MCP + NostrMQ)");
  console.log("8. Service Status");
  console.log("0. Exit");
  console.log("======================");
}

function handleMenuChoice(choice) {
  switch (choice.trim()) {
    case "1":
      console.log("\n🚀 Run Simple Chat Pipeline - Coming soon!");
      showMenu();
      break;
    case "2":
      runDialoguePipeline();
      break;
    case "3":
      runFacilitatedDialoguePipeline();
      break;
    case "4":
      runContentWaterfallPipeline();
      break;
    case "5":
      console.log("\n🤖 Manage Agents - Coming soon!");
      showMenu();
      break;
    case "6":
      startMCPServer();
      break;
    case "7":
      startBothServices();
      break;
    case "8":
      showServiceStatus();
      break;
    case "0":
      console.log("\nGoodbye!");
      rl.close();
      break;
    default:
      console.log("\nInvalid option. Please try again.");
      showMenu();
      break;
  }
}

function showMenu() {
  displayMenu();
  rl.question("Please select an option: ", handleMenuChoice);
}

/**
 * Collects multiline input from user until '###' terminator is entered
 * @param {string} prompt - The prompt to display to the user
 * @returns {Promise<string>} - The collected multiline text
 */
function collectMultilineInput(prompt) {
  return new Promise((resolve) => {
    console.log(prompt);
    let lines = [];

    const collectLine = () => {
      rl.question("", (line) => {
        if (line.trim() === "###") {
          resolve(lines.join("\n"));
        } else {
          lines.push(line);
          collectLine();
        }
      });
    };

    collectLine();
  });
}

/**
 * Collects single line input with optional default value
 * @param {string} prompt - The prompt to display to the user
 * @param {string} defaultValue - Optional default value
 * @returns {Promise<string>} - The collected input or default value
 */
function collectSingleLineInput(prompt, defaultValue = "") {
  return new Promise((resolve) => {
    const fullPrompt = defaultValue
      ? `${prompt} (default: ${defaultValue}): `
      : `${prompt}: `;

    rl.question(fullPrompt, (input) => {
      resolve(input.trim() || defaultValue);
    });
  });
}

/**
 * Collects number input with validation and optional bounds
 * @param {string} prompt - The prompt to display to the user
 * @param {number} defaultValue - Default value if none provided
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {Promise<number>} - The validated number input
 */
function collectNumberInput(prompt, defaultValue, min = 1, max = 10) {
  return new Promise((resolve) => {
    const fullPrompt = `${prompt} (${min}-${max}, default: ${defaultValue}): `;

    const askForNumber = () => {
      rl.question(fullPrompt, (input) => {
        if (input.trim() === "") {
          resolve(defaultValue);
          return;
        }

        const num = parseInt(input.trim(), 10);
        if (isNaN(num) || num < min || num > max) {
          console.log(`❌ Please enter a number between ${min} and ${max}.`);
          askForNumber();
        } else {
          resolve(num);
        }
      });
    };

    askForNumber();
  });
}

/**
 * Asks for yes/no confirmation
 * @param {string} prompt - The confirmation prompt
 * @returns {Promise<boolean>} - True if confirmed, false otherwise
 */
function confirmAction(prompt) {
  return new Promise((resolve) => {
    rl.question(`${prompt} (y/N): `, (input) => {
      const answer = input.trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    });
  });
}

/**
 * Displays available source files and allows user to select one
 * @param {string} pipelineType - Type of pipeline ('dialogue' or 'waterfall')
 * @returns {Promise<string|null>} - Selected file content or null if cancelled
 */
async function selectSourceFile(pipelineType = "dialogue") {
  try {
    console.log("\n📁 Loading available source files...");

    let sourceFiles, readFileFunction, directoryPath;

    if (pipelineType === "waterfall") {
      sourceFiles = await listWaterfallSourceFiles();
      readFileFunction = readWaterfallSourceFile;
      directoryPath = "output/waterfall/ip";
    } else {
      sourceFiles = await listSourceFiles();
      readFileFunction = readSourceFile;
      directoryPath = "output/dialogue/ip";
    }

    if (sourceFiles.length === 0) {
      console.log(`❌ No source files found in ${directoryPath} directory.`);
      console.log(
        `💡 Tip: Place .txt or .md files in ${directoryPath}/ to use file input.`
      );
      return null;
    }

    console.log("\n📋 Available source files:");
    sourceFiles.forEach((file) => {
      console.log(`${file.index}. ${file.name} (${file.extension})`);
    });
    console.log("0. Cancel and return to text input");

    const choice = await collectNumberInput(
      "Select a file",
      1,
      0,
      sourceFiles.length
    );

    if (choice === 0) {
      console.log("📝 Switching to manual text input...");
      return null;
    }

    const selectedFile = sourceFiles[choice - 1];
    console.log(`\n📖 Reading file: ${selectedFile.name}`);

    const fileContent = await readFileFunction(selectedFile.path);

    // Show preview of file content
    const preview =
      fileContent.length > 200
        ? fileContent.substring(0, 200) + "..."
        : fileContent;

    console.log(`\n📄 File preview (${fileContent.length} characters):`);
    console.log("-".repeat(50));
    console.log(preview);
    console.log("-".repeat(50));

    const confirmed = await confirmAction("Use this file as source material?");

    if (!confirmed) {
      console.log("❌ File selection cancelled. Returning to text input...");
      return null;
    }

    console.log(`✅ Using file: ${selectedFile.name}`);
    return fileContent;
  } catch (error) {
    console.error(`❌ Error selecting source file: ${error.message}`);
    console.log("📝 Falling back to manual text input...");
    return null;
  }
}

/**
 * Collects source text either from file selection or manual input
 * @param {string} pipelineType - Type of pipeline ('dialogue' or 'waterfall')
 * @returns {Promise<string|null>} - Source text or null if cancelled
 */
async function collectSourceText(pipelineType = "dialogue") {
  console.log("\n📝 === Source Material Input ===");
  console.log("1. Select from available files");
  console.log("2. Input text directly");
  console.log("0. Cancel");

  const inputChoice = await collectNumberInput("Choose input method", 1, 0, 2);

  switch (inputChoice) {
    case 0:
      return null; // User cancelled

    case 1:
      // File selection
      const fileContent = await selectSourceFile(pipelineType);
      if (fileContent) {
        return fileContent;
      }
      // If file selection failed/cancelled, fall through to manual input
      console.log("\n📝 === Manual Text Input ===");

    case 2:
      // Manual text input
      const sourceText = await collectMultilineInput(
        "Enter your source material (end with '###' on a new line):"
      );

      if (!sourceText.trim()) {
        console.log("❌ Source text cannot be empty.");
        return null;
      }

      return sourceText;

    default:
      console.log("❌ Invalid choice.");
      return null;
  }
}

/**
 * Displays pipeline results in a formatted way
 * @param {Object} result - The pipeline result object
 */
function displayPipelineResults(result) {
  console.log("\n✅ === Pipeline Completed ===");
  console.log(`📋 Pipeline ID: ${result.runId}`);
  console.log(
    `⏱️  Duration: ${result.pipeline?.statistics?.durationSeconds || "N/A"}s`
  );
  console.log(
    `📊 Steps completed: ${result.pipeline?.statistics?.completedSteps || 0}/${
      result.pipeline?.statistics?.totalSteps || 0
    }`
  );

  // Display facilitator information if applicable
  if (result.config?.facilitatorEnabled !== undefined) {
    console.log(
      `🎯 Facilitator: ${
        result.config.facilitatorEnabled ? "Enabled" : "Disabled"
      }`
    );
    if (
      result.config.facilitatorEnabled &&
      result.pipeline?.facilitatorInterventions
    ) {
      console.log(
        `🎯 Facilitator interventions: ${result.pipeline.facilitatorInterventions.length}`
      );
    }
  }

  if (result.error) {
    console.log(`❌ Status: Failed`);
    console.log(`🚨 Error: ${result.error}`);
    if (result.details) {
      console.log(`📝 Details: ${result.details}`);
    }
    if (result.errors && result.errors.length > 0) {
      console.log(`🔍 Validation errors:`);
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }
  } else {
    console.log(`✅ Status: Completed successfully`);

    // Handle waterfall pipeline results
    if (result.topics || result.linkedinPosts || result.reelsConcepts) {
      console.log(`\n🌊 === Content Waterfall Results ===`);
      console.log(`📊 Topics extracted: ${result.topics?.topics?.length || 0}`);
      console.log(
        `📱 LinkedIn posts: ${result.linkedinPosts?.linkedinPosts?.length || 0}`
      );
      console.log(
        `🎬 Reels concepts: ${result.reelsConcepts?.reelsConcepts?.length || 0}`
      );

      // Display file generation results for waterfall
      if (result.fileGenerationStatus === "success" && result.files) {
        console.log(`\n📁 === Generated Files ===`);
        console.log(`✅ File generation: Successful`);
        console.log(`📄 Topic Extractions: ${result.files.topicExtractions}`);
        console.log(
          `📱 LinkedIn Posts: ${result.files.linkedinPosts?.length || 0} files`
        );
        console.log(
          `🎬 Reels Concepts: ${result.files.reelsConcepts?.length || 0} files`
        );
        console.log(`📋 Summary: ${result.files.summary}`);
        console.log(`📊 Data (JSON): ${result.files.data}`);
      } else if (result.fileGenerationStatus === "failed") {
        console.log(`\n📁 === File Generation ===`);
        console.log(`⚠️  File generation: Failed (non-critical)`);
      }
    } else {
      // Handle dialogue pipeline results
      console.log(
        `💬 Conversation exchanges: ${result.conversation?.length || 0}`
      );

      // Display file generation results for dialogue
      if (result.fileGenerationStatus === "success" && result.files) {
        console.log(`\n📁 === Generated Files ===`);
        console.log(`✅ File generation: Successful`);
        console.log(`📄 Conversation: ${result.files.conversation}`);
        console.log(`📋 Summary: ${result.files.summary}`);
        console.log(`📊 Data (JSON): ${result.files.data}`);
      } else if (result.fileGenerationStatus === "failed") {
        console.log(`\n📁 === File Generation ===`);
        console.log(`⚠️  File generation: Failed (non-critical)`);
      }

      if (result.summary?.content) {
        console.log(`\n📝 === Summary ===`);
        console.log(result.summary.content);
      }

      if (result.conversation && result.conversation.length > 0) {
        console.log(`\n🗣️  === Conversation Preview ===`);
        result.conversation.slice(0, 2).forEach((entry, index) => {
          const preview =
            entry.content.length > 100
              ? entry.content.substring(0, 100) + "..."
              : entry.content;

          // Show facilitator interventions differently
          if (entry.isFacilitator) {
            console.log(`🎯 Facilitator (${entry.iteration}): ${preview}`);
          } else {
            console.log(`${entry.agent} (${entry.iteration}): ${preview}`);
          }
        });

        if (result.conversation.length > 2) {
          console.log(
            `... and ${result.conversation.length - 2} more exchanges`
          );
        }
      }
    }

    // Display warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n⚠️  === Warnings ===`);
      result.warnings.forEach((warning) => console.log(`   - ${warning}`));
    }
  }

  console.log("\n" + "=".repeat(50));
}

/**
 * Runs the dialogue pipeline with user input collection
 */
async function runDialoguePipeline() {
  try {
    console.log("\n🗣️  === Dialogue Pipeline ===");

    // Collect source text (either from file or manual input)
    const sourceText = await collectSourceText();

    if (!sourceText) {
      console.log("❌ No source text provided. Returning to menu.");
      showMenu();
      return;
    }

    // Collect discussion prompt
    const discussionPrompt = await collectSingleLineInput(
      "Enter discussion prompt"
    );

    if (!discussionPrompt.trim()) {
      console.log("❌ Discussion prompt cannot be empty. Returning to menu.");
      showMenu();
      return;
    }

    // Collect iterations
    const iterations = await collectNumberInput(
      "Number of dialogue iterations",
      3,
      1,
      10
    );

    // Collect summary focus (optional)
    const summaryFocus = await collectSingleLineInput(
      "Summary focus (press Enter for default)",
      "Please provide a comprehensive summary of the key points, insights, and conclusions from this dialogue."
    );

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `Source text: ${sourceText.substring(0, 100)}${
        sourceText.length > 100 ? "..." : ""
      }`
    );
    console.log(`Discussion prompt: ${discussionPrompt}`);
    console.log(`Iterations: ${iterations}`);
    console.log(
      `Summary focus: ${summaryFocus.substring(0, 80)}${
        summaryFocus.length > 80 ? "..." : ""
      }`
    );

    // Ask for confirmation
    const confirmed = await confirmAction("\nProceed with dialogue pipeline?");

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to menu.");
      showMenu();
      return;
    }

    // Run the pipeline
    console.log("\n🚀 Starting dialogue pipeline...");

    const config = {
      sourceText,
      discussionPrompt,
      iterations,
      summaryFocus,
    };

    const result = await dialoguePipeline(config);

    // Display results
    displayPipelineResults(result);
  } catch (error) {
    console.error("\n❌ Error running dialogue pipeline:", error.message);
    console.log("Returning to menu.");
  }

  // Return to menu
  console.log("\nPress Enter to return to menu...");
  rl.question("", () => {
    showMenu();
  });
}

/**
 * Runs the facilitated dialogue pipeline with user input collection including facilitator configuration
 */
async function runFacilitatedDialoguePipeline() {
  try {
    console.log("\n🎯 === Facilitated Dialogue Pipeline ===");

    // Collect source text (either from file or manual input)
    const sourceText = await collectSourceText();

    if (!sourceText) {
      console.log("❌ No source text provided. Returning to menu.");
      showMenu();
      return;
    }

    // Collect discussion prompt
    const discussionPrompt = await collectSingleLineInput(
      "Enter discussion prompt"
    );

    if (!discussionPrompt.trim()) {
      console.log("❌ Discussion prompt cannot be empty. Returning to menu.");
      showMenu();
      return;
    }

    // Collect facilitator configuration
    console.log("\n🎯 === Facilitator Configuration ===");
    console.log("The facilitator agent can intervene during the dialogue to:");
    console.log("• Improve discussion quality");
    console.log("• Prevent agreement bias");
    console.log("• Ensure thorough exploration of ideas");
    console.log("• Guide conversation focus");

    const facilitatorEnabled = await confirmAction(
      "\nEnable facilitator interventions?"
    );

    // Collect iterations with facilitator-specific validation
    let iterations;
    if (facilitatorEnabled) {
      console.log(
        "\n📝 Note: When facilitator is enabled, iterations must be even (2, 4, 6, 8, 10)"
      );
      iterations = await collectNumberInput(
        "Number of dialogue iterations",
        4,
        2,
        10
      );

      // Validate even number for facilitator mode
      if (iterations % 2 !== 0) {
        console.log("⚠️  Adjusting to even number for facilitator mode...");
        iterations = iterations + 1;
        console.log(`✅ Adjusted to ${iterations} iterations`);
      }
    } else {
      iterations = await collectNumberInput(
        "Number of dialogue iterations",
        3,
        1,
        10
      );
    }

    // Collect summary focus (optional)
    const defaultSummaryFocus = facilitatorEnabled
      ? "Please provide a comprehensive summary of the key points, insights, and conclusions from this facilitated dialogue, highlighting how the facilitator interventions enhanced the discussion."
      : "Please provide a comprehensive summary of the key points, insights, and conclusions from this dialogue.";

    const summaryFocus = await collectSingleLineInput(
      "Summary focus (press Enter for default)",
      defaultSummaryFocus
    );

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `Source text: ${sourceText.substring(0, 100)}${
        sourceText.length > 100 ? "..." : ""
      }`
    );
    console.log(`Discussion prompt: ${discussionPrompt}`);
    console.log(
      `Facilitator: ${facilitatorEnabled ? "🎯 Enabled" : "❌ Disabled"}`
    );
    console.log(`Iterations: ${iterations}`);
    console.log(
      `Summary focus: ${summaryFocus.substring(0, 80)}${
        summaryFocus.length > 80 ? "..." : ""
      }`
    );

    if (facilitatorEnabled) {
      console.log(
        `\n🎯 Facilitator will intervene at iterations: ${Array.from(
          { length: Math.floor(iterations / 2) },
          (_, i) => (i + 1) * 2
        ).join(", ")}`
      );
    }

    // Ask for confirmation
    const confirmed = await confirmAction(
      "\nProceed with facilitated dialogue pipeline?"
    );

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to menu.");
      showMenu();
      return;
    }

    // Run the pipeline
    console.log(
      `\n🚀 Starting ${
        facilitatorEnabled ? "facilitated " : ""
      }dialogue pipeline...`
    );

    const config = {
      sourceText,
      discussionPrompt,
      iterations,
      summaryFocus,
      facilitatorEnabled,
    };

    const result = await facilitatedDialoguePipeline(config);

    // Display results
    displayPipelineResults(result);
  } catch (error) {
    console.error(
      "\n❌ Error running facilitated dialogue pipeline:",
      error.message
    );
    console.log("Returning to menu.");
  }

  // Return to menu
  console.log("\nPress Enter to return to menu...");
  rl.question("", () => {
    showMenu();
  });
}

/**
 * Runs the content waterfall pipeline with user input collection
 */
async function runContentWaterfallPipeline() {
  try {
    console.log("\n🌊 === Content Waterfall Pipeline ===");
    console.log(
      "Transform long-form content into LinkedIn posts and YouTube Reels concepts"
    );
    console.log(
      "Suitable for: podcast transcripts, articles, interviews, blog posts"
    );
    console.log(
      "Expected output: 4 topics → 4 LinkedIn posts → 8 Reels concepts"
    );

    // Collect source text (either from file or manual input)
    const sourceText = await collectSourceText("waterfall");

    if (!sourceText) {
      console.log("❌ No source text provided. Returning to menu.");
      showMenu();
      return;
    }

    // Collect optional custom focus
    const customFocus = await collectSingleLineInput(
      "Custom focus areas (optional - press Enter to skip)",
      ""
    );

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `Source text: ${sourceText.substring(0, 100)}${
        sourceText.length > 100 ? "..." : ""
      }`
    );
    console.log(`Source length: ${sourceText.length} characters`);
    if (customFocus.trim()) {
      console.log(`Custom focus: ${customFocus}`);
    } else {
      console.log(`Custom focus: None (using default extraction strategy)`);
    }

    // Ask for confirmation
    const confirmed = await confirmAction(
      "\nProceed with Content Waterfall Pipeline?"
    );

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to menu.");
      showMenu();
      return;
    }

    // Run the pipeline with progress feedback
    console.log("\n🚀 Starting Content Waterfall Pipeline...");

    const config = {
      sourceText,
      customFocus: customFocus.trim() || undefined,
    };

    // Show progress during execution
    console.log("📊 Step 1/4: Analyzing content and extracting topics...");

    const result = await contentWaterfallPipeline(config);

    // Display results
    displayPipelineResults(result);

    // Additional waterfall-specific result summary
    if (!result.error) {
      console.log("\n🎉 === Content Waterfall Summary ===");
      console.log(
        `✅ Content analysis complete (${
          result.topics?.topics?.length || 0
        } topics extracted)`
      );
      console.log(
        `✅ LinkedIn posts generated (${
          result.linkedinPosts?.linkedinPosts?.length || 0
        } posts created)`
      );
      console.log(
        `✅ Reels concepts generated (${
          result.reelsConcepts?.reelsConcepts?.length || 0
        } concepts created)`
      );

      if (result.fileGenerationStatus === "success") {
        console.log(`✅ Output files generated`);
        console.log(`📁 Output folder: output/waterfall/`);
        console.log(
          `📄 Files organized by type: topics, LinkedIn posts, Reels concepts`
        );
      }

      // Display cost summary if available
      if (result.pipeline?.costs) {
        console.log(`\n💰 === Cost Summary ===`);
        const totalCost = Object.values(result.pipeline.costs).reduce(
          (sum, cost) => sum + (cost.total || 0),
          0
        );
        console.log(`Total cost: $${totalCost.toFixed(4)}`);
      }
    }
  } catch (error) {
    console.error(
      "\n❌ Error running Content Waterfall Pipeline:",
      error.message
    );
    console.log("Returning to menu.");
  }

  // Return to menu
  console.log("\nPress Enter to return to menu...");
  rl.question("", () => {
    showMenu();
  });
}

// Global variable to track MCP server instance
let mcpServerInstance = null;

/**
 * Starts the MCP server
 */
async function startMCPServer() {
  try {
    console.log("\n🚀 === Starting MCP Server ===");

    const config = getMCPConfig();

    if (!config.enabled) {
      console.log("❌ MCP server is disabled.");
      console.log("💡 To enable: Set ENABLE_MCP_SERVER=true in your .env file");
      console.log("\nPress Enter to return to menu...");
      rl.question("", () => {
        showMenu();
      });
      return;
    }

    if (mcpServerInstance) {
      console.log("⚠️  MCP server is already running.");
      console.log("💡 Use option 8 to check service status");
      console.log("\nPress Enter to return to menu...");
      rl.question("", () => {
        showMenu();
      });
      return;
    }

    console.log("📋 Initializing MCP server...");
    mcpServerInstance = new PipelinerMCPServer(config);
    await mcpServerInstance.initialize();

    console.log("🔧 Available tools:");
    const tools = mcpServerInstance.listTools();
    tools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });

    console.log("\n🎯 Starting MCP server...");
    await mcpServerInstance.start();

    console.log("✅ MCP server started successfully!");
    console.log("📡 Server is ready for Claude Desktop integration");
    console.log(
      "📖 See MCP_SERVER_INTEGRATION_GUIDE.md for setup instructions"
    );
  } catch (error) {
    console.error("❌ Failed to start MCP server:", error.message);
    mcpServerInstance = null;
  }

  console.log("\nPress Enter to return to menu...");
  rl.question("", () => {
    showMenu();
  });
}

/**
 * Starts both MCP and NostrMQ services (placeholder for future implementation)
 */
async function startBothServices() {
  console.log("\n🚀 === Starting Both Services ===");
  console.log("🔧 MCP + NostrMQ dual service mode");

  try {
    // Start MCP server first
    console.log("📋 Starting MCP server...");
    const config = getMCPConfig();

    if (!config.enabled) {
      console.log("❌ MCP server is disabled.");
      console.log("💡 To enable: Set ENABLE_MCP_SERVER=true in your .env file");
      console.log("\nPress Enter to return to menu...");
      rl.question("", () => {
        showMenu();
      });
      return;
    }

    if (!mcpServerInstance) {
      mcpServerInstance = new PipelinerMCPServer(config);
      await mcpServerInstance.initialize();
      await mcpServerInstance.start();
      console.log("✅ MCP server started");
    } else {
      console.log("✅ MCP server already running");
    }

    // NostrMQ service placeholder
    console.log("📋 NostrMQ service...");
    console.log("⚠️  NostrMQ service not yet implemented");
    console.log("💡 Currently only MCP server is running");

    console.log("\n✅ Service startup completed!");
    console.log("📡 MCP server ready for Claude Desktop integration");
  } catch (error) {
    console.error("❌ Failed to start services:", error.message);
  }

  console.log("\nPress Enter to return to menu...");
  rl.question("", () => {
    showMenu();
  });
}

/**
 * Shows the status of all services
 */
async function showServiceStatus() {
  console.log("\n📊 === Service Status ===");

  // MCP Server Status
  console.log("\n🔧 MCP Server:");
  if (mcpServerInstance) {
    try {
      const status = mcpServerInstance.getStatus();
      console.log(`   Status: ✅ Running`);
      console.log(`   Enabled: ${status.enabled ? "✅" : "❌"}`);
      console.log(`   Initialized: ${status.initialized ? "✅" : "❌"}`);
      console.log(`   Tools: ${status.toolCount}`);
      console.log(`   Host: ${status.config.host}`);
      console.log(`   Port: ${status.config.port}`);
      console.log(`   Log Level: ${status.config.logLevel}`);
      console.log(`   Local Only: ${status.config.localOnly ? "✅" : "❌"}`);

      if (status.tools.length > 0) {
        console.log("   Available Tools:");
        status.tools.forEach((tool) => {
          console.log(`     - ${tool}`);
        });
      }
    } catch (error) {
      console.log(`   Status: ❌ Error - ${error.message}`);
    }
  } else {
    console.log("   Status: ❌ Not running");
  }

  // NostrMQ Service Status (placeholder)
  console.log("\n📡 NostrMQ Service:");
  console.log("   Status: ❌ Not implemented");
  console.log("   💡 Future implementation planned");

  // Configuration Status
  console.log("\n⚙️  Configuration:");
  try {
    const config = getMCPConfig();
    console.log(`   MCP Enabled: ${config.enabled ? "✅" : "❌"}`);
    console.log(`   Pipeline Directory: ${config.pipelineDirectory}`);
    console.log(`   Output Directory: ${config.outputDirectory}`);
    console.log(`   Auto Discovery: ${config.autoDiscovery ? "✅" : "❌"}`);
  } catch (error) {
    console.log(`   Configuration Error: ❌ ${error.message}`);
  }

  console.log("\nPress Enter to return to menu...");
  rl.question("", () => {
    showMenu();
  });
}

function main() {
  console.log("Welcome to Pipeliner!");
  showMenu();
}

// Handle readline close
rl.on("close", () => {
  process.exit(0);
});

// Run main function if this is the main module
if (isMain) {
  main();
}
