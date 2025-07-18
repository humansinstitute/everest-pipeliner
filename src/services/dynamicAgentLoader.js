/**
 * Dynamic Agent Loading Framework
 *
 * Provides dynamic loading of agents from type-specific directories
 * Supports loading agents from /src/agents/panel/{panelType}/ directories
 * Falls back to default panel agents if type-specific agents don't exist
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { createPanelConfig } from "./panelTypeConfig.js";
import { performanceMonitor } from "./performanceMonitor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dynamic Agent Loader Class
 * Handles loading of panel agents based on panel type
 */
export class DynamicAgentLoader {
  constructor(panelType) {
    this.panelType = panelType;
    this.config = createPanelConfig(panelType);
    this.agentCache = new Map();
  }

  /**
   * Gets the agent directory path for the current panel type
   * @returns {string} Agent directory path
   */
  getAgentDirectory() {
    return join(__dirname, "..", "agents", "panel", this.panelType);
  }

  /**
   * Gets the fallback agent directory path (default panel agents)
   * @returns {string} Fallback agent directory path
   */
  getFallbackAgentDirectory() {
    return join(__dirname, "..", "agents", "panel");
  }

  /**
   * Checks if a type-specific agent exists
   * @param {string} agentName - Name of the agent file (without .js extension)
   * @returns {boolean} True if agent exists, false otherwise
   */
  agentExists(agentName) {
    const agentPath = join(this.getAgentDirectory(), `${agentName}.js`);
    return existsSync(agentPath);
  }

  /**
   * Checks if a fallback agent exists
   * @param {string} agentName - Name of the agent file (without .js extension)
   * @returns {boolean} True if fallback agent exists, false otherwise
   */
  fallbackAgentExists(agentName) {
    const agentPath = join(this.getFallbackAgentDirectory(), `${agentName}.js`);
    return existsSync(agentPath);
  }

  /**
   * Loads an agent dynamically based on panel type
   * @param {string} agentName - Name of the agent to load
   * @returns {Promise<Function>} The loaded agent function
   * @throws {Error} If agent cannot be loaded
   */
  async loadAgent(agentName) {
    const operationId = `${
      this.panelType
    }_agent_load_${agentName}_${Date.now()}`;
    performanceMonitor.startTimer(operationId);

    // Check cache first
    const cacheKey = `${this.panelType}:${agentName}`;
    const cachedAgent = performanceMonitor.getCachedAgent(cacheKey);
    if (cachedAgent) {
      performanceMonitor.endTimer(operationId, {
        source: "cache",
        agentName,
        panelType: this.panelType,
      });
      return cachedAgent;
    }

    // Also check local cache for backward compatibility
    if (this.agentCache.has(cacheKey)) {
      const agent = this.agentCache.get(cacheKey);
      performanceMonitor.endTimer(operationId, {
        source: "local_cache",
        agentName,
        panelType: this.panelType,
      });
      return agent;
    }

    let agentModule;
    let agentPath;
    let agentSource;

    try {
      // Try to load type-specific agent first
      if (this.agentExists(agentName)) {
        agentPath = `../agents/panel/${this.panelType}/${agentName}.js`;
        agentModule = await import(agentPath);
        agentSource = "type-specific";
      }
      // Fall back to default panel agent
      else if (this.fallbackAgentExists(agentName)) {
        agentPath = `../agents/panel/${agentName}.js`;
        agentModule = await import(agentPath);
        agentSource = "fallback";
      }
      // Agent not found
      else {
        throw new Error(
          `Agent '${agentName}' not found in type-specific directory '${this.getAgentDirectory()}' or fallback directory '${this.getFallbackAgentDirectory()}'`
        );
      }

      // Extract the default export
      const agentFunction = agentModule.default;
      if (typeof agentFunction !== "function") {
        throw new Error(
          `Agent '${agentName}' does not export a function as default export`
        );
      }

      // Cache the loaded agent in both caches
      this.agentCache.set(cacheKey, agentFunction);
      performanceMonitor.cacheAgent(cacheKey, agentFunction);

      const loadTime = performanceMonitor.endTimer(operationId, {
        source: agentSource,
        agentName,
        panelType: this.panelType,
        agentPath,
      });

      // Monitor agent loading performance
      performanceMonitor.monitorPanelTypeOperation(
        this.panelType,
        "agent_load",
        loadTime.duration,
        { agentName, source: agentSource }
      );

      return agentFunction;
    } catch (error) {
      performanceMonitor.endTimer(operationId, {
        error: error.message,
        agentName,
        panelType: this.panelType,
      });
      throw new Error(
        `Failed to load agent '${agentName}' for panel type '${this.panelType}': ${error.message}`
      );
    }
  }

  /**
   * Loads the moderator agent for the current panel type
   * @returns {Promise<Function>} The moderator agent function
   */
  async loadModerator() {
    return this.loadAgent("moderator");
  }

  /**
   * Loads panel agent 1 (challenger/first panelist)
   * @returns {Promise<Function>} The panel1 agent function
   */
  async loadPanel1() {
    return this.loadAgent("panel1_challenger");
  }

  /**
   * Loads panel agent 2 (analyst/second panelist)
   * @returns {Promise<Function>} The panel2 agent function
   */
  async loadPanel2() {
    return this.loadAgent("panel2_analyst");
  }

  /**
   * Loads panel agent 3 (explorer/third panelist)
   * @returns {Promise<Function>} The panel3 agent function
   */
  async loadPanel3() {
    return this.loadAgent("panel3_explorer");
  }

  /**
   * Loads the summarizer agent for the current panel type
   * @returns {Promise<Function>} The summarizer agent function
   */
  async loadSummarizer() {
    return this.loadAgent("summarizePanel");
  }

  /**
   * Loads all panel agents for the current panel type
   * @returns {Promise<Object>} Object containing all loaded agents
   */
  async loadAllAgents() {
    const [moderator, panel1, panel2, panel3, summarizer] = await Promise.all([
      this.loadModerator(),
      this.loadPanel1(),
      this.loadPanel2(),
      this.loadPanel3(),
      this.loadSummarizer(),
    ]);

    return {
      moderator,
      panel1,
      panel2,
      panel3,
      summarizer,
    };
  }

  /**
   * Gets information about available agents for the current panel type
   * @returns {Object} Information about agent availability
   */
  getAgentInfo() {
    const agents = [
      "moderator",
      "panel1_challenger",
      "panel2_analyst",
      "panel3_explorer",
      "summarizePanel",
    ];
    const info = {
      panelType: this.panelType,
      agentDirectory: this.getAgentDirectory(),
      fallbackDirectory: this.getFallbackAgentDirectory(),
      agents: {},
    };

    agents.forEach((agentName) => {
      info.agents[agentName] = {
        typeSpecific: this.agentExists(agentName),
        fallbackAvailable: this.fallbackAgentExists(agentName),
        willUse: this.agentExists(agentName) ? "type-specific" : "fallback",
      };
    });

    return info;
  }

  /**
   * Clears the agent cache
   */
  clearCache() {
    this.agentCache.clear();
  }

  /**
   * Gets the panel configuration
   * @returns {Object} Panel configuration object
   */
  getConfig() {
    return this.config.toObject();
  }
}

/**
 * Factory function to create a dynamic agent loader
 * @param {string} panelType - The type of panel ('discussion', 'security', 'techreview')
 * @returns {DynamicAgentLoader} Dynamic agent loader instance
 */
export function createAgentLoader(panelType) {
  return new DynamicAgentLoader(panelType);
}

/**
 * Convenience function to load a specific agent for a panel type
 * @param {string} panelType - The type of panel
 * @param {string} agentName - Name of the agent to load
 * @returns {Promise<Function>} The loaded agent function
 */
export async function loadPanelAgent(panelType, agentName) {
  const loader = createAgentLoader(panelType);
  return loader.loadAgent(agentName);
}

/**
 * Convenience function to load all agents for a panel type
 * @param {string} panelType - The type of panel
 * @returns {Promise<Object>} Object containing all loaded agents
 */
export async function loadAllPanelAgents(panelType) {
  const loader = createAgentLoader(panelType);
  return loader.loadAllAgents();
}
