import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";
import { callEverest } from "../services/everest.service.js";
import { loadAgent } from "../services/agentLoader.service.js";
import {
  createPipelineData,
  completePipeline,
  addStepResult,
} from "../utils/pipelineData.js";
import { formatCostSummary } from "../utils/pipelineCost.js";

// Load environment variables
dotenv.config();

/**
 * Sanitizes message content to prevent JSON serialization issues
 * @param {string} message - The message content to sanitize
 * @returns {string} - Sanitized message content
 */
function sanitizeMessageContent(message) {
  if (typeof message !== "string") {
    return message;
  }

  // Escape backslashes and other problematic characters for JSON
  return message
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
}

/**
 * Validates and sanitizes facilitated dialogue configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result with isValid, errors, and sanitizedConfig
 */
function validateFacilitatedDialogueConfig(config) {
  const errors = [];
  const sanitizedConfig = {};

  // Validate required fields (inherit from base dialogue pipeline)
  if (!config.sourceText || typeof config.sourceText !== "string") {
    errors.push("sourceText is required and must be a string");
  } else {
    sanitizedConfig.sourceText = sanitizeMessageContent(
      config.sourceText.trim()
    );
  }

  if (!config.discussionPrompt || typeof config.discussionPrompt !== "string") {
    errors.push("discussionPrompt is required and must be a string");
  } else {
    sanitizedConfig.discussionPrompt = sanitizeMessageContent(
      config.discussionPrompt.trim()
    );
  }

  // Validate iterations (default to 4 for facilitated pipeline to ensure even number)
  if (config.iterations === undefined || config.iterations === null) {
    sanitizedConfig.iterations = 4;
  } else if (
    typeof config.iterations !== "number" ||
    !Number.isInteger(config.iterations)
  ) {
    errors.push("iterations must be an integer");
  } else if (config.iterations < 1 || config.iterations > 10) {
    errors.push("iterations must be between 1 and 10");
  } else {
    sanitizedConfig.iterations = config.iterations;
  }

  // Validate summaryFocus (optional, default to generic summary)
  if (config.summaryFocus === undefined || config.summaryFocus === null) {
    sanitizedConfig.summaryFocus =
      "Please provide a comprehensive summary of the key points, insights, and conclusions from this facilitated dialogue.";
  } else if (typeof config.summaryFocus !== "string") {
    errors.push("summaryFocus must be a string");
  } else {
    sanitizedConfig.summaryFocus = sanitizeMessageContent(
      config.summaryFocus.trim()
    );
  }

  // Validate facilitatorEnabled (default to false)
  if (
    config.facilitatorEnabled === undefined ||
    config.facilitatorEnabled === null
  ) {
    sanitizedConfig.facilitatorEnabled = false;
  } else if (typeof config.facilitatorEnabled !== "boolean") {
    errors.push("facilitatorEnabled must be a boolean");
  } else {
    sanitizedConfig.facilitatorEnabled = config.facilitatorEnabled;
  }

  // Special validation: when facilitator is enabled, iterations should be even
  if (
    sanitizedConfig.facilitatorEnabled &&
    sanitizedConfig.iterations % 2 !== 0
  ) {
    errors.push(
      "iterations must be an even number when facilitator is enabled"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedConfig: errors.length === 0 ? sanitizedConfig : null,
  };
}

/**
 * Extracts response content from various API response formats
 * @param {Object} response - API response object
 * @returns {string|null} - Extracted content or null if not found
 */
function extractResponseContent(response) {
  // Check for error first
  if (response.error) {
    return null;
  }

  // Try different response formats (same as dialoguePipeline.js)
  if (response.response && response.response.content) {
    return response.response.content;
  } else if (
    response.choices &&
    response.choices[0] &&
    response.choices[0].message &&
    response.choices[0].message.content
  ) {
    return response.choices[0].message.content;
  } else if (
    response.message &&
    typeof response.message === "string" &&
    response.message.length > 0
  ) {
    return response.message;
  }

  return null;
}

/**
 * Determines if facilitator should be called at this iteration
 * @param {number} iteration - Current iteration number
 * @param {boolean} facilitatorEnabled - Whether facilitator is enabled
 * @returns {boolean} - True if facilitator should be called
 */
function shouldCallFacilitator(iteration, facilitatorEnabled) {
  if (!facilitatorEnabled) return false;
  return iteration > 0 && iteration % 2 === 0;
}

/**
 * Prepares context for facilitator agent
 * @param {Array} conversation - Current conversation history
 * @param {Object} config - Pipeline configuration
 * @param {number} iteration - Current iteration number
 * @returns {Object} - Facilitator context object
 */
function prepareFacilitatorContext(conversation, config, iteration) {
  const conversationText = conversation
    .map(
      (entry) =>
        `${entry.agent} (Iteration ${entry.iteration}): ${entry.content}`
    )
    .join("\n\n");

  return {
    sourceText: config.sourceText,
    discussionPrompt: config.discussionPrompt,
    conversationHistory: conversation,
    currentIteration: iteration,
    facilitatorPrompt: `You are facilitating a dialogue at iteration ${iteration}. Review the conversation and provide guidance to improve the discussion quality, prevent agreement bias, and ensure thorough exploration of ideas.

CONVERSATION HISTORY:
${conversationText}

SOURCE MATERIAL:
${config.sourceText}

DISCUSSION PROMPT:
${config.discussionPrompt}

Please provide facilitator guidance to enhance the ongoing dialogue.`,
  };
}

/**
 * Ensures a directory exists, creating it recursively if needed
 * @param {string} dirPath - Directory path to create
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(
      `[FileGeneration] Error creating directory ${dirPath}:`,
      error
    );
    throw error;
  }
}

/**
 * Generates a unique timestamped folder name with collision handling and facilitator suffix
 * @param {string} baseDir - Base directory path
 * @param {boolean} facilitatorEnabled - Whether facilitator is enabled
 * @returns {Promise<string>} - Unique folder name in format YY_MM_DD_HH_MM_SS_ID[_facilitated]
 */
async function generateFacilitatedFolderName(baseDir, facilitatorEnabled) {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const hh = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");

  const baseTimestamp = `${yy}_${mm}_${dd}_${hh}_${min}_${ss}`;
  const suffix = facilitatorEnabled ? "_facilitated" : "";

  // Handle collisions by incrementing ID
  for (let id = 1; id <= 100; id++) {
    const folderName = `${baseTimestamp}_${id}${suffix}`;
    const fullPath = path.join(baseDir, folderName);

    try {
      await fs.access(fullPath);
      // Folder exists, try next ID
      continue;
    } catch (error) {
      // Folder doesn't exist, we can use this name
      return folderName;
    }
  }

  throw new Error("Unable to generate unique folder name after 100 attempts");
}

/**
 * Generates enhanced conversation markdown file with facilitator sections
 * @param {Array} conversationArray - Array of conversation entries
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @param {Object} pipelineData - Pipeline execution data
 * @returns {string} - Markdown content
 */
function generateEnhancedConversationMarkdown(
  conversationArray,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const { sourceText, discussionPrompt, iterations, facilitatorEnabled } =
    config;

  let markdown = `# ${
    facilitatorEnabled ? "Facilitated " : ""
  }Dialogue Pipeline Conversation

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Iterations**: ${iterations}
- **Facilitator Enabled**: ${facilitatorEnabled ? "Yes" : "No"}
- **Discussion Prompt**: ${discussionPrompt}

## Cost Summary
${formatCostSummary(pipelineData)}

## Source Material
${sourceText}

## Conversation

`;

  conversationArray.forEach((entry, index) => {
    if (entry.isFacilitator) {
      markdown += `### 🎯 Facilitator Intervention (Iteration ${entry.iteration})
*${entry.timestamp}*

${entry.content}

---

`;
    } else {
      const iterationLabel =
        entry.iteration % 1 === 0
          ? entry.iteration === 1 && entry.agent === "DialogueAg1"
            ? "initial"
            : `iteration_${entry.iteration}`
          : `followup_${Math.floor(entry.iteration)}`;

      markdown += `### ${entry.agent} - ${iterationLabel}
*${entry.timestamp}*

${entry.content}

---

`;
    }
  });

  return markdown;
}

/**
 * Generates enhanced summary markdown file
 * @param {Object} summaryData - Summary data object
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @param {Object} pipelineData - Pipeline execution data
 * @returns {string} - Markdown content
 */
function generateEnhancedSummaryMarkdown(
  summaryData,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const { sourceText, discussionPrompt, iterations, facilitatorEnabled } =
    config;

  return `# ${facilitatorEnabled ? "Facilitated " : ""}Dialogue Pipeline Summary

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Summary Focus**: ${summaryData.focus}
- **Facilitator Enabled**: ${facilitatorEnabled ? "Yes" : "No"}
- **Discussion Prompt**: ${discussionPrompt}

## Cost Summary
${formatCostSummary(pipelineData)}

## Summary

${summaryData.content}

## Context
- **Source Material Length**: ${sourceText.length} characters
- **Dialogue Iterations**: ${iterations}
- **Facilitator Interventions**: ${
    pipelineData.facilitatorInterventions?.length || 0
  }
- **Summary Model**: Generated via Everest API
`;
}

/**
 * Generates enhanced JSON output file with facilitator metadata
 * @param {Object} pipelineData - Pipeline execution data
 * @param {Array} conversationArray - Array of conversation entries
 * @param {Object} summaryData - Summary data object
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - JSON content
 */
function generateEnhancedDataJson(
  pipelineData,
  conversationArray,
  summaryData,
  config,
  runId,
  timestamp
) {
  const jsonData = {
    runId,
    conversation: conversationArray,
    summary: summaryData,
    config: {
      ...config,
      facilitatorEnabled: config.facilitatorEnabled,
    },
    facilitator: {
      enabled: config.facilitatorEnabled,
      interventions: pipelineData.facilitatorInterventions || [],
      totalInterventions: pipelineData.facilitatorInterventions?.length || 0,
    },
    costs: pipelineData.costs,
    pipeline: {
      ...pipelineData,
      generatedAt: timestamp,
      facilitatorEnabled: config.facilitatorEnabled,
    },
  };

  return JSON.stringify(jsonData, null, 2);
}

/**
 * Orchestrates all file generation for the facilitated dialogue pipeline
 * @param {Object} pipelineData - Pipeline execution data
 * @param {Array} conversationArray - Array of conversation entries
 * @param {Object} summaryData - Summary data object
 * @param {Object} config - Pipeline configuration
 * @returns {Promise<Object>} - Object containing file paths and generation status
 */
async function generateEnhancedOutputFiles(
  pipelineData,
  conversationArray,
  summaryData,
  config
) {
  const runId = pipelineData.runId;
  const timestamp = new Date().toISOString();
  const baseOutputDir = path.join("output", "dialogue");

  console.log(
    `[FileGeneration] Starting enhanced file generation for run ${runId}`
  );

  try {
    // Ensure base output directory exists
    await ensureDirectoryExists(baseOutputDir);

    // Generate unique timestamped folder name with facilitator suffix
    const timestampedFolder = await generateFacilitatedFolderName(
      baseOutputDir,
      config.facilitatorEnabled
    );
    const outputDir = path.join(baseOutputDir, timestampedFolder);

    // Create the timestamped directory
    await ensureDirectoryExists(outputDir);
    console.log(
      `[FileGeneration] ✅ Timestamped directory created: ${outputDir}`
    );

    // Generate simplified file names (no runId or timestamp)
    const conversationFile = "conversation.md";
    const summaryFile = "summary.md";
    const dataFile = "data.json";

    const conversationPath = path.join(outputDir, conversationFile);
    const summaryPath = path.join(outputDir, summaryFile);
    const dataPath = path.join(outputDir, dataFile);

    // Generate enhanced content
    const conversationMarkdown = generateEnhancedConversationMarkdown(
      conversationArray,
      config,
      runId,
      timestamp,
      pipelineData
    );
    const summaryMarkdown = generateEnhancedSummaryMarkdown(
      summaryData,
      config,
      runId,
      timestamp,
      pipelineData
    );
    const jsonOutput = generateEnhancedDataJson(
      pipelineData,
      conversationArray,
      summaryData,
      config,
      runId,
      timestamp
    );

    // Write files
    await Promise.all([
      fs.writeFile(conversationPath, conversationMarkdown, "utf8"),
      fs.writeFile(summaryPath, summaryMarkdown, "utf8"),
      fs.writeFile(dataPath, jsonOutput, "utf8"),
    ]);

    console.log(
      `[FileGeneration] ✅ All enhanced files generated successfully`
    );
    console.log(`[FileGeneration] - Folder: ${outputDir}`);
    console.log(`[FileGeneration] - Conversation: ${conversationPath}`);
    console.log(`[FileGeneration] - Summary: ${summaryPath}`);
    console.log(`[FileGeneration] - Data: ${dataPath}`);

    return {
      success: true,
      folder: timestampedFolder,
      outputDir,
      files: {
        conversation: conversationPath,
        summary: summaryPath,
        data: dataPath,
      },
      timestamp,
    };
  } catch (error) {
    console.error(
      `[FileGeneration] ❌ Enhanced file generation failed:`,
      error
    );
    return {
      success: false,
      error: error.message,
      timestamp,
    };
  }
}

/**
 * Facilitated dialogue pipeline that orchestrates a conversation between two agents with facilitator intervention
 * @param {Object} config - Configuration object containing sourceText, discussionPrompt, iterations, summaryFocus, facilitatorEnabled
 * @returns {Promise<Object>} - Complete pipeline result with conversation, summary, and metadata
 */
async function facilitatedDialoguePipeline(config) {
  const pipelineData = createPipelineData();
  pipelineData.facilitatorInterventions = [];

  console.log(
    `[FacilitatedDialoguePipeline] Starting pipeline ${pipelineData.runId}`
  );
  console.log(
    `[FacilitatedDialoguePipeline] Pipeline start time: ${pipelineData.startTime}`
  );

  try {
    // Step 1: Validate configuration
    console.log(
      "[FacilitatedDialoguePipeline] Step 1: Validating configuration..."
    );
    const validation = validateFacilitatedDialogueConfig(config);

    if (!validation.isValid) {
      console.error(
        "[FacilitatedDialoguePipeline] ❌ Configuration validation failed:",
        validation.errors
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Configuration validation failed",
        errors: validation.errors,
        pipeline: pipelineData,
      };
    }

    const {
      sourceText,
      discussionPrompt,
      iterations,
      summaryFocus,
      facilitatorEnabled,
    } = validation.sanitizedConfig;

    pipelineData.facilitatorEnabled = facilitatorEnabled;

    console.log(
      `[FacilitatedDialoguePipeline] ✅ Configuration validated - ${iterations} iterations planned, facilitator ${
        facilitatorEnabled ? "enabled" : "disabled"
      }`
    );

    // Step 2: Load dialogue agents
    console.log(
      "[FacilitatedDialoguePipeline] Step 2: Loading dialogue agents..."
    );
    const dialogueAg1 = await loadAgent("dialogue/DialogueAg1");
    const dialogueAg2 = await loadAgent("dialogue/DialogueAg2");
    const summaryAgent = await loadAgent("dialogue/summariseConversation");

    let facilitatorAgent = null;
    if (facilitatorEnabled) {
      try {
        facilitatorAgent = await loadAgent("dialogue/facilitator");
        console.log(
          "[FacilitatedDialoguePipeline] ✅ Facilitator agent loaded successfully"
        );
      } catch (error) {
        console.warn(
          "[FacilitatedDialoguePipeline] ⚠️ Facilitator agent failed to load, continuing as standard dialogue:",
          error.message
        );
        pipelineData.warnings = pipelineData.warnings || [];
        pipelineData.warnings.push(
          "Facilitator agent failed, continuing as standard dialogue"
        );
        validation.sanitizedConfig.facilitatorEnabled = false;
      }
    }

    console.log(
      "[FacilitatedDialoguePipeline] ✅ All dialogue agents loaded successfully"
    );

    // Step 3: Initialize conversation
    let messageHistory = [];
    const conversation = [];

    // Create initial message for Agent 1 with source text and discussion prompt
    const initialMessage = `SOURCE MATERIAL:\n${sourceText}\n\nDISCUSSION PROMPT:\n${discussionPrompt}`;
    const context =
      "You are starting a dialogue about the provided source material. Focus on the discussion prompt and engage thoughtfully with the content.";

    console.log(
      "[FacilitatedDialoguePipeline] Step 3: Starting conversation with Agent 1..."
    );

    // Agent 1 initial call
    const agent1Config = await dialogueAg1(
      initialMessage,
      context,
      messageHistory
    );
    const agent1Response = await callEverest(
      agent1Config,
      pipelineData,
      "agent1_initial"
    );

    if (agent1Response.error) {
      console.error(
        "[FacilitatedDialoguePipeline] ❌ Agent 1 initial call failed:",
        agent1Response.error
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Agent 1 initial call failed",
        details: agent1Response.error,
        pipeline: pipelineData,
      };
    }

    const agent1Content = extractResponseContent(agent1Response);
    if (!agent1Content) {
      console.error(
        "[FacilitatedDialoguePipeline] ❌ Could not extract content from Agent 1 response"
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Could not extract content from Agent 1 response",
        pipeline: pipelineData,
      };
    }

    // Add Agent 1's response to history and conversation
    messageHistory.push({ role: "assistant", content: agent1Content });
    conversation.push({
      agent: "DialogueAg1",
      iteration: 1,
      content: agent1Content,
      timestamp: new Date().toISOString(),
      callId: agent1Response.callID,
    });

    console.log(
      "[FacilitatedDialoguePipeline] ✅ Agent 1 initial response received"
    );

    // Step 4: Conversation loop with facilitator integration
    for (let i = 1; i <= iterations; i++) {
      console.log(
        `[FacilitatedDialoguePipeline] Step 4.${i}: Conversation iteration ${i}/${iterations}`
      );

      // Agent 2 response
      console.log(
        `[FacilitatedDialoguePipeline] Agent 2 responding to iteration ${i}...`
      );
      const agent2Message =
        "Please respond to the ongoing dialogue. Review the conversation history and contribute your perspective.";
      const agent2Config = await dialogueAg2(
        agent2Message,
        context,
        messageHistory
      );
      const agent2Response = await callEverest(
        agent2Config,
        pipelineData,
        `agent2_iteration_${i}`
      );

      if (agent2Response.error) {
        console.error(
          `[FacilitatedDialoguePipeline] ❌ Agent 2 iteration ${i} failed:`,
          agent2Response.error
        );
        completePipeline(pipelineData, "failed");
        return {
          runId: pipelineData.runId,
          error: `Agent 2 iteration ${i} failed`,
          details: agent2Response.error,
          pipeline: pipelineData,
        };
      }

      const agent2Content = extractResponseContent(agent2Response);
      if (!agent2Content) {
        console.error(
          `[FacilitatedDialoguePipeline] ❌ Could not extract content from Agent 2 iteration ${i}`
        );
        completePipeline(pipelineData, "failed");
        return {
          runId: pipelineData.runId,
          error: `Could not extract content from Agent 2 iteration ${i}`,
          pipeline: pipelineData,
        };
      }

      // Add Agent 2's response to history and conversation
      messageHistory.push({ role: "assistant", content: agent2Content });
      conversation.push({
        agent: "DialogueAg2",
        iteration: i,
        content: agent2Content,
        timestamp: new Date().toISOString(),
        callId: agent2Response.callID,
      });

      console.log(
        `[FacilitatedDialoguePipeline] ✅ Agent 2 iteration ${i} response received`
      );

      // Facilitator intervention check
      if (shouldCallFacilitator(i, facilitatorEnabled && facilitatorAgent)) {
        console.log(
          `[FacilitatedDialoguePipeline] 🎯 Facilitator intervention at iteration ${i}...`
        );

        try {
          const facilitatorContext = prepareFacilitatorContext(
            conversation,
            validation.sanitizedConfig,
            i
          );

          const facilitatorConfig = await facilitatorAgent(
            facilitatorContext.facilitatorPrompt,
            "You are a dialogue facilitator. Provide guidance to improve discussion quality.",
            []
          );

          const facilitatorResponse = await callEverest(
            facilitatorConfig,
            pipelineData,
            `facilitator_iteration_${i}`
          );

          if (facilitatorResponse.error) {
            console.warn(
              `[FacilitatedDialoguePipeline] ⚠️ Facilitator intervention ${i} failed:`,
              facilitatorResponse.error
            );
            pipelineData.warnings = pipelineData.warnings || [];
            pipelineData.warnings.push(
              `Facilitator intervention ${i} failed: ${facilitatorResponse.error}`
            );
          } else {
            const facilitatorContent =
              extractResponseContent(facilitatorResponse);
            if (facilitatorContent) {
              // Add facilitator intervention to conversation
              conversation.push({
                agent: "facilitator",
                iteration: i,
                content: facilitatorContent,
                timestamp: new Date().toISOString(),
                callId: facilitatorResponse.callID,
                isFacilitator: true,
              });

              // Track facilitator intervention
              pipelineData.facilitatorInterventions.push({
                iteration: i,
                callId: facilitatorResponse.callID,
                timestamp: new Date().toISOString(),
                content: facilitatorContent,
              });

              console.log(
                `[FacilitatedDialoguePipeline] ✅ Facilitator intervention ${i} completed`
              );
            }
          }
        } catch (error) {
          console.warn(
            `[FacilitatedDialoguePipeline] ⚠️ Facilitator intervention ${i} error:`,
            error.message
          );
          pipelineData.warnings = pipelineData.warnings || [];
          pipelineData.warnings.push(
            `Facilitator intervention ${i} error: ${error.message}`
          );
        }
      }

      // Agent 1 follow-up (except for the final iteration)
      if (i < iterations) {
        console.log(
          `[FacilitatedDialoguePipeline] Agent 1 follow-up for iteration ${i}...`
        );
        const agent1FollowupMessage =
          "Please continue the dialogue. Build on the previous responses and explore the topic further.";
        const agent1FollowupConfig = await dialogueAg1(
          agent1FollowupMessage,
          context,
          messageHistory
        );
        const agent1FollowupResponse = await callEverest(
          agent1FollowupConfig,
          pipelineData,
          `agent1_followup_${i}`
        );

        if (agent1FollowupResponse.error) {
          console.error(
            `[FacilitatedDialoguePipeline] ❌ Agent 1 follow-up ${i} failed:`,
            agent1FollowupResponse.error
          );
          completePipeline(pipelineData, "failed");
          return {
            runId: pipelineData.runId,
            error: `Agent 1 follow-up ${i} failed`,
            details: agent1FollowupResponse.error,
            pipeline: pipelineData,
          };
        }

        const agent1FollowupContent = extractResponseContent(
          agent1FollowupResponse
        );
        if (!agent1FollowupContent) {
          console.error(
            `[FacilitatedDialoguePipeline] ❌ Could not extract content from Agent 1 follow-up ${i}`
          );
          completePipeline(pipelineData, "failed");
          return {
            runId: pipelineData.runId,
            error: `Could not extract content from Agent 1 follow-up ${i}`,
            pipeline: pipelineData,
          };
        }

        // Add Agent 1's follow-up to history and conversation
        messageHistory.push({
          role: "assistant",
          content: agent1FollowupContent,
        });
        conversation.push({
          agent: "DialogueAg1",
          iteration: i + 0.5, // Use .5 to indicate follow-up
          content: agent1FollowupContent,
          timestamp: new Date().toISOString(),
          callId: agent1FollowupResponse.callID,
        });

        console.log(
          `[FacilitatedDialoguePipeline] ✅ Agent 1 follow-up ${i} response received`
        );
      }
    }

    // Step 5: Generate summary
    console.log(
      "[FacilitatedDialoguePipeline] Step 5: Generating conversation summary..."
    );

    // Create conversation history string for summary agent
    const conversationText = conversation
      .map((entry) => {
        if (entry.isFacilitator) {
          return `Facilitator (Iteration ${entry.iteration}): ${entry.content}`;
        }
        return `${entry.agent} (Iteration ${entry.iteration}): ${entry.content}`;
      })
      .join("\n\n");

    const summaryMessage = `FACILITATED CONVERSATION HISTORY:\n${conversationText}`;
    const summaryConfig = await summaryAgent(summaryMessage, summaryFocus, []);
    const summaryResponse = await callEverest(
      summaryConfig,
      pipelineData,
      "conversation_summary"
    );

    if (summaryResponse.error) {
      console.error(
        "[FacilitatedDialoguePipeline] ❌ Summary generation failed:",
        summaryResponse.error
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Summary generation failed",
        details: summaryResponse.error,
        conversation,
        pipeline: pipelineData,
      };
    }

    const summaryContent = extractResponseContent(summaryResponse);
    if (!summaryContent) {
      console.error(
        "[FacilitatedDialoguePipeline] ❌ Could not extract content from summary response"
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Could not extract content from summary response",
        conversation,
        pipeline: pipelineData,
      };
    }

    console.log(
      "[FacilitatedDialoguePipeline] ✅ Summary generated successfully"
    );

    // Step 6: Generate enhanced output files
    console.log(
      "[FacilitatedDialoguePipeline] Step 6: Generating enhanced output files..."
    );

    const summaryData = {
      content: summaryContent,
      focus: summaryFocus,
      timestamp: new Date().toISOString(),
      callId: summaryResponse.callID,
    };

    const fileGenerationResult = await generateEnhancedOutputFiles(
      pipelineData,
      conversation,
      summaryData,
      validation.sanitizedConfig
    );

    if (fileGenerationResult.success) {
      console.log(
        "[FacilitatedDialoguePipeline] ✅ Enhanced output files generated successfully"
      );
      addStepResult(pipelineData, "file_generation", {
        status: "success",
        files: fileGenerationResult.files,
        timestamp: fileGenerationResult.timestamp,
      });
    } else {
      console.warn(
        "[FacilitatedDialoguePipeline] ⚠️ File generation failed (non-critical):",
        fileGenerationResult.error
      );
      addStepResult(pipelineData, "file_generation", {
        status: "failed",
        error: fileGenerationResult.error,
        timestamp: fileGenerationResult.timestamp,
      });
    }

    // Step 7: Complete pipeline
    completePipeline(pipelineData, "completed");

    // Display pipeline summary
    console.log(`\n[FacilitatedDialoguePipeline] 📊 PIPELINE SUMMARY:`);
    console.log(`Pipeline ID: ${pipelineData.runId}`);
    console.log(`Status: ${pipelineData.status}`);
    console.log(`Facilitator Enabled: ${facilitatorEnabled ? "Yes" : "No"}`);
    console.log(
      `Facilitator Interventions: ${pipelineData.facilitatorInterventions.length}`
    );
    console.log(
      `Duration: ${
        pipelineData.statistics?.durationSeconds || "calculating..."
      }s`
    );
    console.log(
      `Steps completed: ${pipelineData.statistics?.completedSteps || 0}/${
        pipelineData.statistics?.totalSteps || 0
      }`
    );
    console.log(`Success rate: ${pipelineData.statistics?.successRate || 0}%`);
    console.log(`Conversation exchanges: ${conversation.length}`);

    // Return structured result
    return {
      runId: pipelineData.runId,
      conversation,
      summary: {
        content: summaryContent,
        focus: summaryFocus,
        timestamp: new Date().toISOString(),
        callId: summaryResponse.callID,
      },
      config: validation.sanitizedConfig,
      pipeline: {
        ...pipelineData,
        facilitatorEnabled,
      },
      files: fileGenerationResult.success ? fileGenerationResult.files : null,
      fileGenerationStatus: fileGenerationResult.success ? "success" : "failed",
      warnings: pipelineData.warnings || [],
    };
  } catch (error) {
    console.error(
      `[FacilitatedDialoguePipeline] ❌ Pipeline ${pipelineData.runId} failed with error:`,
      error
    );
    completePipeline(pipelineData, "failed");

    // Add error details to pipeline for debugging
    pipelineData.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    return {
      runId: pipelineData.runId,
      error: "Pipeline execution failed",
      details: error.message,
      pipeline: pipelineData,
    };
  }
}

// ES Module main detection for direct execution
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log("🚀 Running Facilitated Dialogue Pipeline directly...\n");

  // Example configuration for testing
  const testConfig = {
    sourceText:
      "Artificial Intelligence is rapidly transforming various industries, from healthcare to finance. While AI offers tremendous potential for improving efficiency and solving complex problems, it also raises concerns about job displacement, privacy, and ethical decision-making.",
    discussionPrompt:
      "What are the most significant opportunities and challenges that AI presents for society, and how should we approach AI development responsibly?",
    iterations: 4,
    summaryFocus:
      "Summarize the key opportunities and challenges discussed, along with any recommendations for responsible AI development.",
    facilitatorEnabled: true,
  };

  facilitatedDialoguePipeline(testConfig)
    .then((result) => {
      console.log("\n📋 FINAL PIPELINE RESULT:");
      console.log(`Run ID: ${result.runId}`);

      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
        if (result.details) console.log(`Details: ${result.details}`);
      } else {
        console.log(
          `✅ Facilitated conversation completed with ${result.conversation.length} exchanges`
        );
        console.log(
          `🎯 Facilitator interventions: ${
            result.pipeline.facilitatorInterventions?.length || 0
          }`
        );
        console.log(
          `📝 Summary generated: ${result.summary.content.substring(0, 100)}...`
        );
        if (result.warnings?.length > 0) {
          console.log(`⚠️ Warnings: ${result.warnings.length}`);
          result.warnings.forEach((warning) => console.log(`  - ${warning}`));
        }
      }

      process.exit(result.error ? 1 : 0);
    })
    .catch((error) => {
      console.error("❌ Pipeline execution failed:", error);
      process.exit(1);
    });
}

// Universal Pipeline Interface Implementation
export const pipelineInfo = {
  name: "facilitatedDialogue",
  description:
    "Multi-agent facilitated dialogue pipeline with optional facilitator interventions for enhanced conversation quality and thorough exploration of ideas",
  parameters: {
    type: "object",
    properties: {
      sourceText: {
        type: "string",
        description: "Source text or content for dialogue analysis",
        minLength: 1,
      },
      discussionPrompt: {
        type: "string",
        description: "Discussion prompt or question to guide the conversation",
        minLength: 1,
      },
      iterations: {
        type: "integer",
        description:
          "Number of dialogue iterations (should be even when facilitator is enabled)",
        minimum: 1,
        maximum: 10,
        default: 4,
      },
      summaryFocus: {
        type: "string",
        description: "Focus or perspective for the final summary",
        default:
          "Please provide a comprehensive summary of the key points, insights, and conclusions from this facilitated dialogue.",
      },
      facilitatorEnabled: {
        type: "boolean",
        description:
          "Enable facilitator interventions during dialogue to improve discussion quality",
        default: false,
      },
    },
    required: ["sourceText", "discussionPrompt"],
  },
  interfaces: ["mcp", "nostrmq", "cli"],
};

/**
 * Executes facilitated dialogue pipeline via MCP interface
 * @param {Object} parameters - Pipeline parameters
 * @param {Object} logger - MCP logger instance
 * @returns {Promise<Object>} Formatted result for MCP consumption
 */
export async function executeViaMCP(parameters, logger) {
  logger.info("MCP facilitated dialogue execution started", { parameters });

  try {
    const result = await facilitatedDialoguePipeline({
      sourceText: parameters.sourceText,
      discussionPrompt: parameters.discussionPrompt,
      iterations: parameters.iterations || 4,
      summaryFocus:
        parameters.summaryFocus ||
        "Please provide a comprehensive summary of the key points, insights, and conclusions from this facilitated dialogue.",
      facilitatorEnabled: parameters.facilitatorEnabled || false,
    });

    logger.info("MCP facilitated dialogue execution completed", {
      success: !result.error,
      runId: result.runId,
    });

    // Format for MCP consumption
    return {
      success: !result.error,
      result: {
        runId: result.runId,
        status: result.error ? "failed" : "completed",
        summary: result.summary?.content || "No summary available",
        conversation: result.conversation?.slice(0, 3) || [], // Preview for Claude
        facilitatorInterventions:
          result.pipeline?.facilitatorInterventions?.length || 0,
        files: result.files ? Object.values(result.files).flat() : [],
        executionTime: result.pipeline?.statistics?.durationSeconds,
        facilitatorEnabled: result.config?.facilitatorEnabled || false,
        warnings: result.warnings || [],
      },
      error: result.error,
    };
  } catch (error) {
    logger.error("MCP facilitated dialogue execution failed", error);
    return {
      success: false,
      error: {
        message: error.message,
        type: "execution_error",
      },
    };
  }
}

/**
 * Executes facilitated dialogue pipeline via NostrMQ interface (stub for future implementation)
 * @param {Object} parameters - Pipeline parameters
 * @param {Object} jobLogger - NostrMQ job logger instance
 * @returns {Promise<Object>} Result for NostrMQ consumption
 */
export async function executeViaNostrMQ(parameters, jobLogger) {
  jobLogger.info("NostrMQ facilitated dialogue execution started", {
    parameters,
  });

  // For now, delegate to the main pipeline function
  // Future implementation will add NostrMQ-specific handling
  const result = await facilitatedDialoguePipeline({
    sourceText: parameters.sourceText,
    discussionPrompt: parameters.discussionPrompt,
    iterations: parameters.iterations || 4,
    summaryFocus:
      parameters.summaryFocus ||
      "Please provide a comprehensive summary of the key points, insights, and conclusions from this facilitated dialogue.",
    facilitatorEnabled: parameters.facilitatorEnabled || false,
  });

  jobLogger.info("NostrMQ facilitated dialogue execution completed", {
    success: !result.error,
    runId: result.runId,
  });
  return result;
}

export {
  facilitatedDialoguePipeline,
  validateFacilitatedDialogueConfig,
  generateFacilitatedFolderName,
  shouldCallFacilitator,
  prepareFacilitatorContext,
};
