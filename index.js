import readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { dialoguePipeline } from "./src/pipelines/dialoguePipeline.js";

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
  console.log("3. Manage Agents");
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
      console.log("\n🤖 Manage Agents - Coming soon!");
      showMenu();
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
    console.log(
      `💬 Conversation exchanges: ${result.conversation?.length || 0}`
    );

    // Display file generation results
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
        console.log(`${entry.agent} (${entry.iteration}): ${preview}`);
      });

      if (result.conversation.length > 2) {
        console.log(`... and ${result.conversation.length - 2} more exchanges`);
      }
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

    // Collect source text
    const sourceText = await collectMultilineInput(
      "Enter your source material (end with '###' on a new line):"
    );

    if (!sourceText.trim()) {
      console.log("❌ Source text cannot be empty. Returning to menu.");
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
