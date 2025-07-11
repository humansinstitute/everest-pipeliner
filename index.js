import readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
  console.log("1. Run pipeline");
  console.log("2. Manage Agents");
  console.log("0. Exit");
  console.log("======================");
}

function handleMenuChoice(choice) {
  switch (choice.trim()) {
    case "1":
      console.log("\n🚀 Run pipeline - Coming soon!");
      showMenu();
      break;
    case "2":
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
