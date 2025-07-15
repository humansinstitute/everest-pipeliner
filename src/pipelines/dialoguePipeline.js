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
 * Validates and sanitizes dialogue configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result with isValid, errors, and sanitizedConfig
 */
function validateDialogueConfig(config) {
  const errors = [];
  const sanitizedConfig = {};

  // Validate required fields
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

  // Validate iterations (default to 3 if not provided)
  if (config.iterations === undefined || config.iterations === null) {
    sanitizedConfig.iterations = 3;
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
      "Please provide a comprehensive summary of the key points, insights, and conclusions from this dialogue.";
  } else if (typeof config.summaryFocus !== "string") {
    errors.push("summaryFocus must be a string");
  } else {
    sanitizedConfig.summaryFocus = sanitizeMessageContent(
      config.summaryFocus.trim()
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

  // Try different response formats (same as simpleChatPipeline.js)
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
 * Generates a unique timestamped folder name with collision handling
 * @param {string} baseDir - Base directory path
 * @returns {Promise<string>} - Unique folder name in format YY_MM_DD_HH_MM_SS_ID
 */
async function generateTimestampedFolderName(baseDir) {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const hh = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");

  const baseTimestamp = `${yy}_${mm}_${dd}_${hh}_${min}_${ss}`;

  // Handle collisions by incrementing ID
  for (let id = 1; id <= 100; id++) {
    const folderName = `${baseTimestamp}_${id}`;
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
 * Generates conversation markdown file
 * @param {Array} conversationArray - Array of conversation entries
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - Markdown content
 */
function generateConversationMarkdown(
  conversationArray,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const { sourceText, discussionPrompt, iterations } = config;

  let markdown = `# Dialogue Pipeline Conversation

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Iterations**: ${iterations}
- **Discussion Prompt**: ${discussionPrompt}

## Cost Summary
${formatCostSummary(pipelineData)}

## Source Material
${sourceText}

## Conversation

`;

  conversationArray.forEach((entry, index) => {
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
  });

  return markdown;
}

/**
 * Generates summary markdown file
 * @param {Object} summaryData - Summary data object
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - Markdown content
 */
function generateSummaryMarkdown(
  summaryData,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const { sourceText, discussionPrompt, iterations } = config;

  return `# Dialogue Pipeline Summary

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Summary Focus**: ${summaryData.focus}
- **Discussion Prompt**: ${discussionPrompt}

## Cost Summary
${formatCostSummary(pipelineData)}

## Summary

${summaryData.content}

## Context
- **Source Material Length**: ${sourceText.length} characters
- **Dialogue Iterations**: ${iterations}
- **Summary Model**: Generated via Everest API
`;
}

/**
 * Generates JSON output file
 * @param {Object} pipelineData - Pipeline execution data
 * @param {Array} conversationArray - Array of conversation entries
 * @param {Object} summaryData - Summary data object
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - JSON content
 */
function generateJSONOutput(
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
    config,
    costs: pipelineData.costs,
    pipeline: {
      ...pipelineData,
      generatedAt: timestamp,
    },
  };

  return JSON.stringify(jsonData, null, 2);
}

/**
 * Orchestrates all file generation for the dialogue pipeline
 * @param {Object} pipelineData - Pipeline execution data
 * @param {Array} conversationArray - Array of conversation entries
 * @param {Object} summaryData - Summary data object
 * @param {Object} config - Pipeline configuration
 * @returns {Promise<Object>} - Object containing file paths and generation status
 */
async function generateOutputFiles(
  pipelineData,
  conversationArray,
  summaryData,
  config
) {
  const runId = pipelineData.runId;
  const timestamp = new Date().toISOString();
  const baseOutputDir = path.join("output", "dialogue");

  console.log(`[FileGeneration] Starting file generation for run ${runId}`);

  try {
    // Ensure base output directory exists
    await ensureDirectoryExists(baseOutputDir);

    // Generate unique timestamped folder name
    const timestampedFolder = await generateTimestampedFolderName(
      baseOutputDir
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

    // Generate content
    const conversationMarkdown = generateConversationMarkdown(
      conversationArray,
      config,
      runId,
      timestamp,
      pipelineData
    );
    const summaryMarkdown = generateSummaryMarkdown(
      summaryData,
      config,
      runId,
      timestamp,
      pipelineData
    );
    const jsonOutput = generateJSONOutput(
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

    console.log(`[FileGeneration] ✅ All files generated successfully`);
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
    console.error(`[FileGeneration] ❌ File generation failed:`, error);
    return {
      success: false,
      error: error.message,
      timestamp,
    };
  }
}

/**
 * Dialogue pipeline that orchestrates a conversation between two agents and summarizes the result
 * @param {Object} config - Configuration object containing sourceText, discussionPrompt, iterations, summaryFocus
 * @returns {Promise<Object>} - Complete pipeline result with conversation, summary, and metadata
 */
async function dialoguePipeline(config) {
  const pipelineData = createPipelineData();

  console.log(`[DialoguePipeline] Starting pipeline ${pipelineData.runId}`);
  console.log(
    `[DialoguePipeline] Pipeline start time: ${pipelineData.startTime}`
  );

  try {
    // Step 1: Validate configuration
    console.log("[DialoguePipeline] Step 1: Validating configuration...");
    const validation = validateDialogueConfig(config);

    if (!validation.isValid) {
      console.error(
        "[DialoguePipeline] ❌ Configuration validation failed:",
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

    const { sourceText, discussionPrompt, iterations, summaryFocus } =
      validation.sanitizedConfig;
    console.log(
      `[DialoguePipeline] ✅ Configuration validated - ${iterations} iterations planned`
    );

    // Step 2: Load dialogue agents
    console.log("[DialoguePipeline] Step 2: Loading dialogue agents...");
    const dialogueAg1 = await loadAgent("dialogue/DialogueAg1");
    const dialogueAg2 = await loadAgent("dialogue/DialogueAg2");
    const summaryAgent = await loadAgent("dialogue/summariseConversation");
    console.log(
      "[DialoguePipeline] ✅ All dialogue agents loaded successfully"
    );

    // Step 3: Initialize conversation
    let messageHistory = [];
    const conversation = [];

    // Create initial message for Agent 1 with source text and discussion prompt
    const initialMessage = `SOURCE MATERIAL:\n${sourceText}\n\nDISCUSSION PROMPT:\n${discussionPrompt}`;
    const context =
      "You are starting a dialogue about the provided source material. Focus on the discussion prompt and engage thoughtfully with the content.";

    console.log(
      "[DialoguePipeline] Step 3: Starting conversation with Agent 1..."
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
        "[DialoguePipeline] ❌ Agent 1 initial call failed:",
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
        "[DialoguePipeline] ❌ Could not extract content from Agent 1 response"
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

    console.log("[DialoguePipeline] ✅ Agent 1 initial response received");

    // Step 4: Conversation loop
    for (let i = 1; i <= iterations; i++) {
      console.log(
        `[DialoguePipeline] Step 4.${i}: Conversation iteration ${i}/${iterations}`
      );

      // Agent 2 response
      console.log(`[DialoguePipeline] Agent 2 responding to iteration ${i}...`);
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
          `[DialoguePipeline] ❌ Agent 2 iteration ${i} failed:`,
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
          `[DialoguePipeline] ❌ Could not extract content from Agent 2 iteration ${i}`
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
        `[DialoguePipeline] ✅ Agent 2 iteration ${i} response received`
      );

      // Agent 1 follow-up (except for the final iteration)
      if (i < iterations) {
        console.log(
          `[DialoguePipeline] Agent 1 follow-up for iteration ${i}...`
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
            `[DialoguePipeline] ❌ Agent 1 follow-up ${i} failed:`,
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
            `[DialoguePipeline] ❌ Could not extract content from Agent 1 follow-up ${i}`
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
          `[DialoguePipeline] ✅ Agent 1 follow-up ${i} response received`
        );
      }
    }

    // Step 5: Generate summary
    console.log(
      "[DialoguePipeline] Step 5: Generating conversation summary..."
    );

    // Create conversation history string for summary agent
    const conversationText = conversation
      .map(
        (entry) =>
          `${entry.agent} (Iteration ${entry.iteration}): ${entry.content}`
      )
      .join("\n\n");

    const summaryMessage = `CONVERSATION HISTORY:\n${conversationText}`;
    const summaryConfig = await summaryAgent(summaryMessage, summaryFocus, []);
    const summaryResponse = await callEverest(
      summaryConfig,
      pipelineData,
      "conversation_summary"
    );

    if (summaryResponse.error) {
      console.error(
        "[DialoguePipeline] ❌ Summary generation failed:",
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
        "[DialoguePipeline] ❌ Could not extract content from summary response"
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Could not extract content from summary response",
        conversation,
        pipeline: pipelineData,
      };
    }

    console.log("[DialoguePipeline] ✅ Summary generated successfully");

    // Step 6: Generate output files
    console.log("[DialoguePipeline] Step 6: Generating output files...");

    const summaryData = {
      content: summaryContent,
      focus: summaryFocus,
      timestamp: new Date().toISOString(),
      callId: summaryResponse.callID,
    };

    const fileGenerationResult = await generateOutputFiles(
      pipelineData,
      conversation,
      summaryData,
      validation.sanitizedConfig
    );

    if (fileGenerationResult.success) {
      console.log("[DialoguePipeline] ✅ Output files generated successfully");
      addStepResult(pipelineData, "file_generation", {
        status: "success",
        files: fileGenerationResult.files,
        timestamp: fileGenerationResult.timestamp,
      });
    } else {
      console.warn(
        "[DialoguePipeline] ⚠️ File generation failed (non-critical):",
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
    console.log(`\n[DialoguePipeline] 📊 PIPELINE SUMMARY:`);
    console.log(`Pipeline ID: ${pipelineData.runId}`);
    console.log(`Status: ${pipelineData.status}`);
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
      pipeline: pipelineData,
      files: fileGenerationResult.success ? fileGenerationResult.files : null,
      fileGenerationStatus: fileGenerationResult.success ? "success" : "failed",
    };
  } catch (error) {
    console.error(
      `[DialoguePipeline] ❌ Pipeline ${pipelineData.runId} failed with error:`,
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
  console.log("🚀 Running Dialogue Pipeline directly...\n");

  // Example configuration for testing
  const testConfig = {
    sourceText:
      "Artificial Intelligence is rapidly transforming various industries, from healthcare to finance. While AI offers tremendous potential for improving efficiency and solving complex problems, it also raises concerns about job displacement, privacy, and ethical decision-making.",
    discussionPrompt:
      "What are the most significant opportunities and challenges that AI presents for society, and how should we approach AI development responsibly?",
    iterations: 2,
    summaryFocus:
      "Summarize the key opportunities and challenges discussed, along with any recommendations for responsible AI development.",
  };

  dialoguePipeline(testConfig)
    .then((result) => {
      console.log("\n📋 FINAL PIPELINE RESULT:");
      console.log(`Run ID: ${result.runId}`);

      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
        if (result.details) console.log(`Details: ${result.details}`);
      } else {
        console.log(
          `✅ Conversation completed with ${result.conversation.length} exchanges`
        );
        console.log(
          `📝 Summary generated: ${result.summary.content.substring(0, 100)}...`
        );
      }

      process.exit(result.error ? 1 : 0);
    })
    .catch((error) => {
      console.error("❌ Pipeline execution failed:", error);
      process.exit(1);
    });
}

/**
 * Lists available source files from output/dialogue/ip directory
 * @returns {Promise<Array>} - Array of file objects with name, path, and metadata
 */
async function listSourceFiles() {
  const sourceDir = path.join("output", "dialogue", "ip");

  try {
    // Check if directory exists
    await fs.access(sourceDir);
  } catch (error) {
    console.warn(`[FileInput] Source directory does not exist: ${sourceDir}`);
    return [];
  }

  try {
    const files = await fs.readdir(sourceDir);
    const sourceFiles = files
      .filter((file) => file.endsWith(".md") || file.endsWith(".txt"))
      .map((file, index) => ({
        index: index + 1,
        name: file,
        path: path.join(sourceDir, file),
        extension: path.extname(file),
        basename: path.basename(file, path.extname(file)),
      }));

    console.log(
      `[FileInput] Found ${sourceFiles.length} source files in ${sourceDir}`
    );
    return sourceFiles;
  } catch (error) {
    console.error(
      `[FileInput] Error reading source directory: ${error.message}`
    );
    return [];
  }
}

/**
 * Reads content from a source file
 * @param {string} filePath - Path to the source file
 * @returns {Promise<string>} - File content
 */
async function readSourceFile(filePath) {
  try {
    // Validate file exists and is readable
    await fs.access(filePath, fs.constants.R_OK);

    const content = await fs.readFile(filePath, "utf8");
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new Error("File is empty or contains only whitespace");
    }

    console.log(
      `[FileInput] Successfully read file: ${filePath} (${trimmedContent.length} characters)`
    );
    return trimmedContent;
  } catch (error) {
    console.error(`[FileInput] Error reading file ${filePath}:`, error.message);
    throw new Error(`Failed to read source file: ${error.message}`);
  }
}

/**
 * Validates that a source file path is valid and accessible
 * @param {string} filePath - Path to validate
 * @returns {Promise<boolean>} - True if file is valid
 */
async function validateSourceFile(filePath) {
  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      throw new Error("Path is not a file");
    }

    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".md" && extension !== ".txt") {
      throw new Error("File must be .md or .txt format");
    }

    // Check if file is readable
    await fs.access(filePath, fs.constants.R_OK);

    return true;
  } catch (error) {
    console.error(
      `[FileInput] File validation failed for ${filePath}:`,
      error.message
    );
    return false;
  }
}

/**
 * NostrMQ execution interface for dialogue pipeline
 * @param {Object} parameters - Pipeline parameters from NostrMQ request
 * @param {Object} jobLogger - Job-specific logger instance
 * @returns {Promise<Object>} - Pipeline execution result
 */
export async function executeViaNostrMQ(parameters, jobLogger) {
  jobLogger.info("Dialogue pipeline execution started via NostrMQ", {
    parameters,
  });

  try {
    // Validate and prepare configuration
    const config = {
      sourceText: parameters.sourceText,
      discussionPrompt: parameters.discussionPrompt,
      iterations: parameters.iterations || 3,
      summaryFocus:
        parameters.summaryFocus ||
        "Please provide a comprehensive summary of the key points, insights, and conclusions from this dialogue.",
    };

    // Execute the pipeline
    const result = await dialoguePipeline(config);

    jobLogger.info("Dialogue pipeline execution completed via NostrMQ", {
      runId: result.runId,
      status: result.error ? "failed" : "completed",
      conversationLength: result.conversation?.length || 0,
    });

    return result;
  } catch (error) {
    jobLogger.error("Dialogue pipeline execution failed via NostrMQ", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Pipeline metadata for registry discovery
 */
export const pipelineInfo = {
  name: "dialogue",
  description:
    "Multi-agent dialogue pipeline that orchestrates a conversation between two agents and summarizes the result",
  version: "1.0.0",
  parameters: {
    required: ["sourceText", "discussionPrompt"],
    optional: ["iterations", "summaryFocus"],
    schema: {
      sourceText: {
        type: "string",
        description: "Source material for the dialogue",
        minLength: 10,
      },
      discussionPrompt: {
        type: "string",
        description: "Prompt to guide the discussion",
        minLength: 10,
      },
      iterations: {
        type: "integer",
        description: "Number of dialogue iterations",
        minimum: 1,
        maximum: 10,
        default: 3,
      },
      summaryFocus: {
        type: "string",
        description: "Focus for the summary generation",
        default:
          "Please provide a comprehensive summary of the key points, insights, and conclusions from this dialogue.",
      },
    },
  },
  capabilities: [
    "multi-agent-dialogue",
    "conversation-summary",
    "file-generation",
    "cost-tracking",
  ],
  outputs: {
    conversation: "Array of dialogue exchanges",
    summary: "Generated conversation summary",
    files: "Generated output files (markdown, JSON)",
    pipeline: "Execution metadata and statistics",
  },
  estimatedDuration: "60-180s",
  resourceRequirements: {
    memory: "low",
    cpu: "medium",
    network: "high", // Due to Everest API calls
  },
};

export {
  dialoguePipeline,
  validateDialogueConfig,
  generateTimestampedFolderName,
  listSourceFiles,
  readSourceFile,
  validateSourceFile,
};
