import { fileURLToPath } from "url";
import path from "path";

/**
 * Dynamically loads an agent configuration from src/agents directory
 * @param {string} agentName - Name of the agent file (without .js extension)
 * @returns {Promise<Function>} - Agent configuration function
 */
async function loadAgent(agentName) {
  try {
    console.log(`[AgentLoader] Loading agent: ${agentName}`);

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const agentPath = path.resolve(
      currentDir,
      "..",
      "agents",
      `${agentName}.js`
    );

    console.log(`[AgentLoader] Agent path: ${agentPath}`);

    // Use dynamic import with file:// protocol for ES modules
    const agentModule = await import(`file://${agentPath}`);

    if (!agentModule.default || typeof agentModule.default !== "function") {
      throw new Error(`Agent ${agentName} does not export a default function`);
    }

    console.log(`[AgentLoader] Successfully loaded agent: ${agentName}`);
    return agentModule.default;
  } catch (error) {
    console.error(`[AgentLoader] Failed to load agent ${agentName}:`, error);
    throw new Error(`Agent loading failed: ${error.message}`);
  }
}

/**
 * Lists available agents in the src/agents directory
 * @returns {Promise<string[]>} - Array of available agent names
 */
async function listAvailableAgents() {
  try {
    const { readdir } = await import("fs/promises");
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const agentsDir = path.resolve(currentDir, "..", "agents");

    console.log(`[AgentLoader] Scanning agents directory: ${agentsDir}`);

    const files = await readdir(agentsDir);
    const agentNames = files
      .filter((file) => file.endsWith(".js"))
      .map((file) => file.replace(".js", ""));

    console.log(`[AgentLoader] Found ${agentNames.length} agents:`, agentNames);
    return agentNames;
  } catch (error) {
    console.error("[AgentLoader] Failed to list agents:", error);
    return [];
  }
}

/**
 * Validates that an agent exports the correct interface
 * @param {string} agentName - Name of the agent to validate
 * @returns {Promise<boolean>} - True if agent is valid
 */
async function validateAgent(agentName) {
  try {
    const agentFunction = await loadAgent(agentName);

    // Check if it's a function
    if (typeof agentFunction !== "function") {
      console.error(`[AgentLoader] Agent ${agentName} is not a function`);
      return false;
    }

    // Check function signature (should accept at least 3 parameters: message, context, history)
    if (agentFunction.length < 3) {
      console.warn(
        `[AgentLoader] Agent ${agentName} has fewer than 3 parameters, may not follow standard interface`
      );
    }

    console.log(`[AgentLoader] Agent ${agentName} validation passed`);
    return true;
  } catch (error) {
    console.error(`[AgentLoader] Agent ${agentName} validation failed:`, error);
    return false;
  }
}

export { loadAgent, listAvailableAgents, validateAgent };
