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
  timestamp
) {
  const { sourceText, discussionPrompt, iterations } = config;

  let markdown = `# Dialogue Pipeline Conversation

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Iterations**: ${iterations}
- **Discussion Prompt**: ${discussionPrompt}

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
function generateSummaryMarkdown(summaryData, config, runId, timestamp) {
  const { sourceText, discussionPrompt, iterations } = config;

  return `# Dialogue Pipeline Summary

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Summary Focus**: ${summaryData.focus}
- **Discussion Prompt**: ${discussionPrompt}

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
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join("output", "dialogue");

  console.log(`[FileGeneration] Starting file generation for run ${runId}`);

  try {
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);
    console.log(`[FileGeneration] ✅ Output directory created: ${outputDir}`);

    // Generate file names
    const conversationFile = `conversation_${runId}_${timestamp}.md`;
    const summaryFile = `summary_${runId}_${timestamp}.md`;
    const dataFile = `data_${runId}_${timestamp}.json`;

    const conversationPath = path.join(outputDir, conversationFile);
    const summaryPath = path.join(outputDir, summaryFile);
    const dataPath = path.join(outputDir, dataFile);

    // Generate content
    const conversationMarkdown = generateConversationMarkdown(
      conversationArray,
      config,
      runId,
      timestamp
    );
    const summaryMarkdown = generateSummaryMarkdown(
      summaryData,
      config,
      runId,
      timestamp
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
    console.log(`[FileGeneration] - Conversation: ${conversationPath}`);
    console.log(`[FileGeneration] - Summary: ${summaryPath}`);
    console.log(`[FileGeneration] - Data: ${dataPath}`);

    return {
      success: true,
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

export { dialoguePipeline, validateDialogueConfig };
