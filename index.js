import readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  dialoguePipeline,
  listSourceFiles,
  readSourceFile,
} from "./src/pipelines/dialoguePipeline.js";
import { facilitatedDialoguePipeline } from "./src/pipelines/facilitatedDialoguePipeline.js";
import { moderatedPanelPipeline } from "./src/pipelines/moderatedPanelPipeline.js";
import {
  contentWaterfallPipeline,
  listWaterfallSourceFiles,
  readWaterfallSourceFile,
} from "./src/pipelines/contentWaterfallPipeline.js";
import { startNostrMQService } from "./src/nostrmq/index.js";
import {
  getAvailablePanelTypes,
  createPanelConfig,
} from "./src/services/panelTypeConfig.js";

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
  console.log("6. Start NostrMQ Service");
  console.log("7. Run Panel Pipeline");
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
      startNostrMQServiceFromCLI();
      break;
    case "7":
      showPanelTypeMenu();
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
    } else if (pipelineType === "discussion") {
      // For discussion panels, we need to use a custom file listing since listSourceFiles expects output directory
      const fs = await import("fs/promises");

      try {
        const files = await fs.readdir("input/dialogue");
        sourceFiles = files
          .filter((file) => file.endsWith(".txt") || file.endsWith(".md"))
          .map((file, index) => ({
            index: index + 1,
            name: file.replace(/\.(txt|md)$/, ""),
            extension: `.${file.split(".").pop()}`,
            path: `input/dialogue/${file}`,
          }));
        readFileFunction = readSourceFile;
        directoryPath = "input/dialogue";
      } catch (error) {
        console.log(
          `❌ Error reading input/dialogue directory: ${error.message}`
        );
        sourceFiles = [];
        readFileFunction = readSourceFile;
        directoryPath = "input/dialogue";
      }
    } else if (pipelineType === "security") {
      // For security panels, read from input/security directory
      const fs = await import("fs/promises");

      try {
        const files = await fs.readdir("input/security");
        sourceFiles = files
          .filter((file) => file.endsWith(".txt") || file.endsWith(".md"))
          .map((file, index) => ({
            index: index + 1,
            name: file.replace(/\.(txt|md)$/, ""),
            extension: `.${file.split(".").pop()}`,
            path: `input/security/${file}`,
          }));
        readFileFunction = readSourceFile;
        directoryPath = "input/security";
      } catch (error) {
        console.log(
          `❌ Error reading input/security directory: ${error.message}`
        );
        sourceFiles = [];
        readFileFunction = readSourceFile;
        directoryPath = "input/security";
      }
    } else if (pipelineType === "techreview") {
      // For tech review panels, read from input/techreview directory
      const fs = await import("fs/promises");

      try {
        const files = await fs.readdir("input/techreview");
        sourceFiles = files
          .filter((file) => file.endsWith(".txt") || file.endsWith(".md"))
          .map((file, index) => ({
            index: index + 1,
            name: file.replace(/\.(txt|md)$/, ""),
            extension: `.${file.split(".").pop()}`,
            path: `input/techreview/${file}`,
          }));
        readFileFunction = readSourceFile;
        directoryPath = "input/techreview";
      } catch (error) {
        console.log(
          `❌ Error reading input/techreview directory: ${error.message}`
        );
        sourceFiles = [];
        readFileFunction = readSourceFile;
        directoryPath = "input/techreview";
      }
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

/**
 * Runs the moderated panel pipeline with user input collection
 */
async function runModeratedPanelPipeline() {
  try {
    console.log("\n🎭 === Moderated Panel Pipeline ===");
    console.log(
      "4-agent moderated discussion system with intelligent flow control"
    );
    console.log("Panel Members:");
    console.log(
      "• Panel 1 (Challenger): Questions assumptions, high disagreeableness"
    );
    console.log("• Panel 2 (Analyst): Balanced, evidence-based approach");
    console.log("• Panel 3 (Explorer): Creative, unconventional thinking");
    console.log(
      "• Moderator: Controls conversation flow and speaker selection"
    );

    // Collect source text (either from file or manual input)
    const sourceText = await collectSourceText();

    if (!sourceText) {
      console.log("❌ No source text provided. Returning to menu.");
      showMenu();
      return;
    }

    // Collect discussion subject
    const discussionSubject = await collectSingleLineInput(
      "Enter discussion subject/question"
    );

    if (!discussionSubject.trim()) {
      console.log("❌ Discussion subject cannot be empty. Returning to menu.");
      showMenu();
      return;
    }

    // Collect panel interactions
    const panelInteractions = await collectNumberInput(
      "Number of panel interactions",
      4,
      2,
      15
    );

    // Collect summary focus (optional)
    const summaryFocus = await collectSingleLineInput(
      "Summary focus (press Enter for default)",
      "Summarize key insights and conclusions from this panel discussion"
    );

    // Calculate estimated API calls and time
    const estimatedApiCalls = 2 * panelInteractions + 1;
    const estimatedMinutes = Math.ceil(estimatedApiCalls * 0.5); // Rough estimate

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `Source text: ${sourceText.substring(0, 100)}${
        sourceText.length > 100 ? "..." : ""
      }`
    );
    console.log(`Discussion subject: ${discussionSubject}`);
    console.log(
      `Panel interactions: ${panelInteractions} (estimated ${estimatedApiCalls} API calls, ~${estimatedMinutes} minutes)`
    );
    console.log(
      `Summary focus: ${summaryFocus.substring(0, 80)}${
        summaryFocus.length > 80 ? "..." : ""
      }`
    );

    console.log("\nPanel Members:");
    console.log(
      "• Panel 1 (Challenger): Questions assumptions, high disagreeableness"
    );
    console.log("• Panel 2 (Analyst): Balanced, evidence-based approach");
    console.log("• Panel 3 (Explorer): Creative, unconventional thinking");
    console.log(
      "• Moderator: Controls conversation flow and speaker selection"
    );

    // Ask for confirmation
    const confirmed = await confirmAction(
      "\nProceed with moderated panel pipeline?"
    );

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to menu.");
      showMenu();
      return;
    }

    // Run the pipeline
    console.log("\n🚀 Starting moderated panel pipeline...");

    const config = {
      sourceText,
      discussionSubject,
      panelInteractions,
      summaryFocus,
    };

    const result = await moderatedPanelPipeline(config);

    // Display results
    displayPipelineResults(result);
  } catch (error) {
    console.error(
      "\n❌ Error running moderated panel pipeline:",
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
 * Displays panel type selection menu
 */
function displayPanelTypeMenu() {
  console.log("\n🎭 === Panel Pipeline Types ===");
  console.log("1. Discussion Panel (tl;dr podcast format)");
  console.log("   • Host, Sarah (Challenger), Mike (Analyst), Lisa (Explorer)");
  console.log("   • Podcast-style conversation format");
  console.log("2. Security Review Panel");
  console.log("   • Security Lead, Red Team, Blue Team, Risk Assessment");
  console.log("   • Security-focused vulnerability analysis");
  console.log("3. Tech Review Panel");
  console.log(
    "   • Tech Lead, System Architect, Performance Engineer, Innovation Engineer"
  );
  console.log(
    "   • Technical architecture review with 70% conservative, 30% innovation balance"
  );
  console.log("0. Back to main menu");
  console.log("===============================");
}

/**
 * Handles panel type menu selection
 */
function handlePanelTypeChoice(choice) {
  switch (choice.trim()) {
    case "1":
      runPanelDiscussion();
      break;
    case "2":
      runSecurityPanel();
      break;
    case "3":
      runTechReviewPanel();
      break;
    case "0":
      showMenu();
      break;
    default:
      console.log("\nInvalid option. Please try again.");
      showPanelTypeMenu();
      break;
  }
}

/**
 * Shows the panel type selection menu
 */
function showPanelTypeMenu() {
  displayPanelTypeMenu();
  rl.question("Please select a panel type: ", handlePanelTypeChoice);
}

/**
 * Runs the discussion panel pipeline with user input collection
 */
async function runPanelDiscussion() {
  try {
    console.log("\n🎭 === Discussion Panel Pipeline ===");
    console.log("tl;dr podcast format with named participants");
    console.log("Panel Members:");
    console.log("• Host: Podcast host and conversation facilitator");
    console.log(
      "• Sarah (The Challenger): Questions assumptions, high disagreeableness"
    );
    console.log("• Mike (The Analyst): Balanced, evidence-based approach");
    console.log("• Lisa (The Explorer): Creative, unconventional thinking");

    // Get panel configuration
    const panelConfig = createPanelConfig("discussion");

    // Collect source text from discussion input directory
    const sourceText = await collectSourceText("discussion");

    if (!sourceText) {
      console.log("❌ No source text provided. Returning to panel menu.");
      showPanelTypeMenu();
      return;
    }

    // Collect discussion subject
    const discussionSubject = await collectSingleLineInput(
      "Enter discussion subject/question"
    );

    if (!discussionSubject.trim()) {
      console.log(
        "❌ Discussion subject cannot be empty. Returning to panel menu."
      );
      showPanelTypeMenu();
      return;
    }

    // Collect panel interactions
    const panelInteractions = await collectNumberInput(
      "Number of panel interactions",
      panelConfig.defaultInteractions,
      2,
      15
    );

    // Collect summary focus (optional)
    const summaryFocus = await collectSingleLineInput(
      "Summary focus (press Enter for default)",
      panelConfig.summaryFocus
    );

    // Calculate estimated API calls and time
    const estimatedApiCalls = 2 * panelInteractions + 1;
    const estimatedMinutes = Math.ceil(estimatedApiCalls * 0.5); // Rough estimate

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `Source text: ${sourceText.substring(0, 100)}${
        sourceText.length > 100 ? "..." : ""
      }`
    );
    console.log(`Discussion subject: ${discussionSubject}`);
    console.log(
      `Panel interactions: ${panelInteractions} (estimated ${estimatedApiCalls} API calls, ~${estimatedMinutes} minutes)`
    );
    console.log(
      `Summary focus: ${summaryFocus.substring(0, 80)}${
        summaryFocus.length > 80 ? "..." : ""
      }`
    );

    console.log("\nPanel Members:");
    console.log("• Host: Podcast host and conversation facilitator");
    console.log(
      "• Sarah (The Challenger): Questions assumptions, high disagreeableness"
    );
    console.log("• Mike (The Analyst): Balanced, evidence-based approach");
    console.log("• Lisa (The Explorer): Creative, unconventional thinking");

    // Ask for confirmation
    const confirmed = await confirmAction(
      "\nProceed with discussion panel pipeline?"
    );

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to panel menu.");
      showPanelTypeMenu();
      return;
    }

    // Run the pipeline
    console.log("\n🚀 Starting discussion panel pipeline...");

    const config = {
      sourceText,
      discussionSubject,
      panelInteractions,
      summaryFocus,
      panelType: "discussion",
    };

    const result = await moderatedPanelPipeline(config);

    // Display results
    displayPipelineResults(result);
  } catch (error) {
    console.error(
      "\n❌ Error running discussion panel pipeline:",
      error.message
    );
    console.log("Returning to panel menu.");
  }

  // Return to panel menu
  console.log("\nPress Enter to return to panel menu...");
  rl.question("", () => {
    showPanelTypeMenu();
  });
}

/**
 * Collects security framework files from input/security directory
 * @returns {Promise<string|null>} - Selected framework content or null if cancelled
 */
async function selectSecurityFramework() {
  try {
    console.log("\n📋 Loading available security frameworks...");

    const fs = await import("fs/promises");

    try {
      const files = await fs.readdir("input/security");
      const frameworkFiles = files
        .filter((file) => file.endsWith(".txt") || file.endsWith(".md"))
        .map((file, index) => ({
          index: index + 1,
          name: file.replace(/\.(txt|md)$/, ""),
          extension: `.${file.split(".").pop()}`,
          path: `input/security/${file}`,
        }));

      if (frameworkFiles.length === 0) {
        console.log(
          "❌ No security framework files found in input/security directory."
        );
        console.log(
          "💡 Tip: Place .txt or .md files in input/security/ to use framework input."
        );
        return null;
      }

      console.log("\n📋 Available security frameworks:");
      frameworkFiles.forEach((file) => {
        console.log(`${file.index}. ${file.name} (${file.extension})`);
      });
      console.log("0. Skip framework selection");

      const choice = await collectNumberInput(
        "Select a security framework",
        1,
        0,
        frameworkFiles.length
      );

      if (choice === 0) {
        console.log("⏭️  Skipping framework selection...");
        return null;
      }

      const selectedFile = frameworkFiles[choice - 1];
      console.log(`\n📖 Reading framework: ${selectedFile.name}`);

      const fileContent = await fs.readFile(selectedFile.path, "utf-8");

      // Show preview of framework content
      const preview =
        fileContent.length > 300
          ? fileContent.substring(0, 300) + "..."
          : fileContent;

      console.log(`\n📄 Framework preview (${fileContent.length} characters):`);
      console.log("-".repeat(50));
      console.log(preview);
      console.log("-".repeat(50));

      const confirmed = await confirmAction("Use this security framework?");

      if (!confirmed) {
        console.log("❌ Framework selection cancelled.");
        return null;
      }

      console.log(`✅ Using framework: ${selectedFile.name}`);
      return fileContent;
    } catch (error) {
      console.log(
        `❌ Error reading input/security directory: ${error.message}`
      );
      return null;
    }
  } catch (error) {
    console.error(`❌ Error selecting security framework: ${error.message}`);
    return null;
  }
}

/**
 * Collects codebase content for security analysis
 * @returns {Promise<string|null>} - Codebase content or null if cancelled
 */
async function collectCodebaseContent() {
  console.log("\n💻 === Codebase Content Input ===");
  console.log("1. Select from available files");
  console.log("2. Input code/content directly");
  console.log("0. Cancel");

  const inputChoice = await collectNumberInput("Choose input method", 1, 0, 2);

  switch (inputChoice) {
    case 0:
      return null; // User cancelled

    case 1:
      // File selection - use security input directory
      const fileContent = await selectSourceFile("security");
      if (fileContent) {
        return fileContent;
      }
      // If file selection failed/cancelled, fall through to manual input
      console.log("\n📝 === Manual Code Input ===");

    case 2:
      // Manual code input
      const codeContent = await collectMultilineInput(
        "Enter your codebase content or system description (end with '###' on a new line):"
      );

      if (!codeContent.trim()) {
        console.log("❌ Codebase content cannot be empty.");
        return null;
      }

      return codeContent;

    default:
      console.log("❌ Invalid choice.");
      return null;
  }
}

/**
 * Runs the security panel pipeline with user input collection
 */
async function runSecurityPanel() {
  try {
    console.log("\n🔒 === Security Review Panel ===");
    console.log(
      "Comprehensive security assessment with attack/defend dynamics"
    );
    console.log("Panel Members:");
    console.log(
      "• Security Lead: Orchestrates attack/defend flow and risk assessment"
    );
    console.log(
      "• Red Team: Offensive security expert - identifies vulnerabilities and attack vectors"
    );
    console.log(
      "• Blue Team: Defensive security expert - provides protection strategies and mitigation"
    );
    console.log(
      "• Risk Assessment: Evaluates business impact and strategic priorities"
    );

    // Get panel configuration
    const panelConfig = createPanelConfig("security");

    // Collect security framework (optional)
    console.log("\n📋 === Security Framework Selection ===");
    console.log(
      "Security frameworks provide assessment criteria and guidelines."
    );
    console.log(
      "Available frameworks include ASD Essential 8, OWASP Top 10, and custom frameworks."
    );

    const frameworkContent = await selectSecurityFramework();

    // Collect codebase content for security analysis
    console.log("\n💻 === Codebase Content for Security Analysis ===");
    console.log(
      "Provide the codebase, system architecture, or application details to analyze."
    );

    const codebaseContent = await collectCodebaseContent();

    if (!codebaseContent) {
      console.log("❌ No codebase content provided. Returning to panel menu.");
      showPanelTypeMenu();
      return;
    }

    // Collect security focus specification
    const securityFocus = await collectSingleLineInput(
      "Enter security focus areas (e.g., 'authentication, data protection, API security') or press Enter for comprehensive analysis",
      "comprehensive security assessment"
    );

    // Collect panel interactions
    const panelInteractions = await collectNumberInput(
      "Number of panel interactions",
      panelConfig.defaultInteractions,
      3,
      20
    );

    // Collect summary focus (optional)
    const summaryFocus = await collectSingleLineInput(
      "Summary focus (press Enter for default)",
      panelConfig.summaryFocus
    );

    // Calculate estimated API calls and time
    const estimatedApiCalls = 2 * panelInteractions + 1;
    const estimatedMinutes = Math.ceil(estimatedApiCalls * 0.7); // Security analysis takes longer

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `Codebase content: ${codebaseContent.substring(0, 100)}${
        codebaseContent.length > 100 ? "..." : ""
      }`
    );
    if (frameworkContent) {
      console.log("Security framework: Selected");
    } else {
      console.log(
        "Security framework: None (using default assessment criteria)"
      );
    }
    console.log(`Security focus: ${securityFocus}`);
    console.log(
      `Panel interactions: ${panelInteractions} (estimated ${estimatedApiCalls} API calls, ~${estimatedMinutes} minutes)`
    );
    console.log(
      `Summary focus: ${summaryFocus.substring(0, 80)}${
        summaryFocus.length > 80 ? "..." : ""
      }`
    );

    console.log("\nSecurity Panel Members:");
    console.log(
      "• Security Lead: Orchestrates attack/defend flow and risk assessment"
    );
    console.log(
      "• Red Team: Offensive security expert - identifies vulnerabilities and attack vectors"
    );
    console.log(
      "• Blue Team: Defensive security expert - provides protection strategies and mitigation"
    );
    console.log(
      "• Risk Assessment: Evaluates business impact and strategic priorities"
    );

    // Ask for confirmation
    const confirmed = await confirmAction(
      "\nProceed with security review panel?"
    );

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to panel menu.");
      showPanelTypeMenu();
      return;
    }

    // Prepare source text combining codebase and framework
    let sourceText = codebaseContent;
    if (frameworkContent) {
      sourceText = `SECURITY FRAMEWORK:\n${frameworkContent}\n\nCODEBASE TO ANALYZE:\n${codebaseContent}`;
    }

    // Run the pipeline
    console.log("\n🚀 Starting security review panel...");

    const config = {
      sourceText,
      discussionSubject: `Security assessment focusing on: ${securityFocus}`,
      panelInteractions,
      summaryFocus,
      panelType: "security",
    };

    const result = await moderatedPanelPipeline(config);

    // Display results
    displayPipelineResults(result);
  } catch (error) {
    console.error("\n❌ Error running security review panel:", error.message);
    console.log("Returning to panel menu.");
  }

  // Return to panel menu
  console.log("\nPress Enter to return to panel menu...");
  rl.question("", () => {
    showPanelTypeMenu();
  });
}

/**
 * Collects multi-file input for tech review panel (PRD + Design Doc + Codebase)
 * @returns {Promise<Object|null>} - Object with all three file contents or null if cancelled
 */
async function collectTechReviewInputs() {
  console.log("\n📋 === Tech Review Multi-File Input ===");
  console.log("Tech Review Panel requires three input files:");
  console.log("1. PRD (Product Requirements Document)");
  console.log("2. Design Document (Technical Design)");
  console.log("3. Codebase (Implementation Code)");
  console.log("");

  const inputs = {};

  // Collect PRD
  console.log("📄 === PRD (Product Requirements Document) ===");
  const prdContent = await selectSourceFile("techreview");
  if (!prdContent) {
    console.log("❌ PRD is required for tech review. Returning to panel menu.");
    return null;
  }
  inputs.prd = prdContent;

  // Collect Design Document
  console.log("\n🏗️  === Design Document ===");
  const designContent = await selectSourceFile("techreview");
  if (!designContent) {
    console.log(
      "❌ Design Document is required for tech review. Returning to panel menu."
    );
    return null;
  }
  inputs.designDoc = designContent;

  // Collect Codebase
  console.log("\n💻 === Codebase Content ===");
  const codebaseContent = await selectSourceFile("techreview");
  if (!codebaseContent) {
    console.log(
      "❌ Codebase is required for tech review. Returning to panel menu."
    );
    return null;
  }
  inputs.codebase = codebaseContent;

  // Show summary of collected inputs
  console.log("\n📋 === Input Summary ===");
  console.log(`PRD: ${inputs.prd.length} characters`);
  console.log(`Design Doc: ${inputs.designDoc.length} characters`);
  console.log(`Codebase: ${inputs.codebase.length} characters`);
  console.log(
    `Total content: ${
      inputs.prd.length + inputs.designDoc.length + inputs.codebase.length
    } characters`
  );

  const confirmed = await confirmAction(
    "Proceed with these inputs for tech review?"
  );
  if (!confirmed) {
    console.log("❌ Input collection cancelled. Returning to panel menu.");
    return null;
  }

  return inputs;
}

/**
 * Runs the tech review panel pipeline with multi-file input collection
 */
async function runTechReviewPanel() {
  try {
    console.log("\n🔧 === Tech Review Panel ===");
    console.log(
      "Comprehensive technical architecture review with balanced expert perspectives"
    );
    console.log("Panel Members:");
    console.log(
      "• Tech Lead: Technical review coordinator (70% conservative, 30% innovation balance)"
    );
    console.log(
      "• System Architect: Design patterns, best practices, maintainability focus"
    );
    console.log(
      "• Performance Engineer: Code quality, performance, reliability focus"
    );
    console.log(
      "• Innovation Engineer: Creative solutions and alternatives (strategic input)"
    );

    // Get panel configuration
    const panelConfig = createPanelConfig("techreview");

    // Collect multi-file inputs (PRD + Design Doc + Codebase)
    const inputs = await collectTechReviewInputs();
    if (!inputs) {
      showPanelTypeMenu();
      return;
    }

    // Collect review focus specification
    const reviewFocus = await collectSingleLineInput(
      "Enter technical review focus areas (e.g., 'architecture, performance, scalability') or press Enter for comprehensive review",
      "comprehensive technical architecture review"
    );

    // Collect panel interactions
    const panelInteractions = await collectNumberInput(
      "Number of panel interactions",
      panelConfig.defaultInteractions,
      3,
      20
    );

    // Collect summary focus (optional)
    const summaryFocus = await collectSingleLineInput(
      "Summary focus (press Enter for default)",
      panelConfig.summaryFocus
    );

    // Calculate estimated API calls and time
    const estimatedApiCalls = 2 * panelInteractions + 1;
    const estimatedMinutes = Math.ceil(estimatedApiCalls * 0.8); // Tech review takes longer

    // Display configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(
      `PRD: ${inputs.prd.substring(0, 100)}${
        inputs.prd.length > 100 ? "..." : ""
      }`
    );
    console.log(
      `Design Doc: ${inputs.designDoc.substring(0, 100)}${
        inputs.designDoc.length > 100 ? "..." : ""
      }`
    );
    console.log(
      `Codebase: ${inputs.codebase.substring(0, 100)}${
        inputs.codebase.length > 100 ? "..." : ""
      }`
    );
    console.log(`Review focus: ${reviewFocus}`);
    console.log(
      `Panel interactions: ${panelInteractions} (estimated ${estimatedApiCalls} API calls, ~${estimatedMinutes} minutes)`
    );
    console.log(
      `Summary focus: ${summaryFocus.substring(0, 80)}${
        summaryFocus.length > 80 ? "..." : ""
      }`
    );

    console.log("\nTech Review Panel Members:");
    console.log(
      "• Tech Lead: Technical review coordinator (70% conservative, 30% innovation balance)"
    );
    console.log(
      "• System Architect: Design patterns, best practices, maintainability focus"
    );
    console.log(
      "• Performance Engineer: Code quality, performance, reliability focus"
    );
    console.log(
      "• Innovation Engineer: Creative solutions and alternatives (strategic input)"
    );

    console.log("\nConversation Balance:");
    console.log(
      "• 70% Conservative Discussion: System Architect ↔ Performance Engineer"
    );
    console.log(
      "• 30% Innovation Input: Innovation Engineer (strategic inclusion by moderator)"
    );

    // Ask for confirmation
    const confirmed = await confirmAction("\nProceed with tech review panel?");

    if (!confirmed) {
      console.log("❌ Pipeline cancelled. Returning to panel menu.");
      showPanelTypeMenu();
      return;
    }

    // Prepare combined source text
    const sourceText = `PRODUCT REQUIREMENTS DOCUMENT (PRD):
${inputs.prd}

TECHNICAL DESIGN DOCUMENT:
${inputs.designDoc}

CODEBASE IMPLEMENTATION:
${inputs.codebase}`;

    // Run the pipeline
    console.log("\n🚀 Starting tech review panel...");

    const config = {
      sourceText,
      discussionSubject: `Technical architecture review focusing on: ${reviewFocus}`,
      panelInteractions,
      summaryFocus,
      panelType: "techreview",
    };

    const result = await moderatedPanelPipeline(config);

    // Display results
    displayPipelineResults(result);
  } catch (error) {
    console.error("\n❌ Error running tech review panel:", error.message);
    console.log("Returning to panel menu.");
  }

  // Return to panel menu
  console.log("\nPress Enter to return to panel menu...");
  rl.question("", () => {
    showPanelTypeMenu();
  });
}

// Add new function for NostrMQ service startup
async function startNostrMQServiceFromCLI() {
  try {
    console.log("\n🌐 Starting NostrMQ Pipeline Service...");

    const service = await startNostrMQService();

    console.log("✅ NostrMQ service started successfully!");
    console.log("📡 Listening for pipeline trigger messages...");
    console.log("🔐 Authorized pubkeys loaded from .env");
    console.log("\nPress Ctrl+C to stop the service");

    // Service is now running - don't return to menu
  } catch (error) {
    console.error("❌ Failed to start NostrMQ service:", error.message);
    console.log("Returning to menu...");
    showMenu();
  }
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
