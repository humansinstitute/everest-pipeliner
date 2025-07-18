import { loadAgent } from "../services/agentLoader.service.js";
import { callEverest } from "../services/everest.service.js";
import {
  createPipelineData,
  completePipeline,
  addStepResult,
} from "../utils/pipelineData.js";
import { formatCostSummary } from "../utils/pipelineCost.js";
import { createAgentLoader } from "../services/dynamicAgentLoader.js";
import { performanceMonitor } from "../services/performanceMonitor.js";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Generates a unique timestamped folder name with panel type and collision handling
 * @param {string} baseDir - Base directory path
 * @param {string} panelType - Panel type (discussion, security, techreview)
 * @returns {Promise<string>} - Unique folder name in format YY_MM_DD_HH_MM_SS_panelType_ID
 */
async function generateTimestampedFolderNameWithType(baseDir, panelType) {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const hh = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");

  const baseTimestamp = `${yy}_${mm}_${dd}_${hh}_${min}_${ss}_${panelType}`;

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

export const pipelineInfo = {
  name: "Moderated Panel Pipeline",
  slug: "moderatedPanel",
  description:
    "A pipeline that orchestrates a moderated panel discussion with 4 agents (moderator + 3 panel members) around a given topic.",
  version: "1.0.0",
  author: "Pipeline Team",
  inputSchema: {
    sourceText: {
      type: "string",
      required: true,
      description: "The source text to be discussed by the panel",
    },
    discussionSubject: {
      type: "string",
      required: true,
      description: "The subject of the panel discussion",
    },
    panelInteractions: {
      type: "number",
      required: false,
      default: 4,
      min: 2,
      max: 15,
      description:
        "Number of panel member interactions (moderator responses never count toward this limit)",
    },
    summaryFocus: {
      type: "string",
      required: false,
      default:
        "Key insights, diverse perspectives, points of agreement/disagreement, and actionable recommendations from the panel discussion",
      description: "What the summary should focus on",
    },
  },
  outputSchema: {
    conversation: {
      type: "array",
      description: "The full moderated panel conversation",
    },
    summary: {
      type: "string",
      description: "Summary of the panel discussion",
    },
    moderatorDecisions: {
      type: "array",
      description: "Record of moderator decisions and speaker selections",
    },
    panelStats: {
      type: "object",
      description: "Statistics about panel participation and interactions",
    },
  },
  tags: ["panel", "moderated", "conversation", "multi-agent", "discussion"],
};

export async function runPipeline(config) {
  const pipeline = createPipelineData();
  const panelType = config.panelType || "discussion"; // Default to discussion for backward compatibility

  // Start performance monitoring
  const pipelineOperationId = `${panelType}_pipeline_execution_${Date.now()}`;
  performanceMonitor.startTimer(pipelineOperationId);

  try {
    // Validate input
    if (!config.sourceText || !config.discussionSubject) {
      throw new Error("sourceText and discussionSubject are required");
    }

    const panelInteractions = config.panelInteractions || 4;
    const summaryFocus =
      config.summaryFocus ||
      "Key insights, diverse perspectives, points of agreement/disagreement, and actionable recommendations from the panel discussion";

    // Validate panelInteractions range
    if (panelInteractions < 2 || panelInteractions > 15) {
      throw new Error("panelInteractions must be between 2 and 15");
    }

    console.log(
      `🎯 Starting ${panelType} panel with ${panelInteractions} interactions`
    );
    console.log(
      `📊 Expected API calls: ${
        2 * panelInteractions + 1
      } (${panelInteractions} panel + ${panelInteractions} moderator + 1 summary)`
    );

    // Load agents using dynamic agent loader with performance monitoring
    const agentLoadOperationId = `${panelType}_agent_loading_${Date.now()}`;
    performanceMonitor.startTimer(agentLoadOperationId);

    const agentLoader = createAgentLoader(panelType);

    console.log(`🤖 Loading ${panelType} panel agents...`);
    const moderator = await agentLoader.loadModerator();
    const challenger = await agentLoader.loadPanel1();
    const analyst = await agentLoader.loadPanel2();
    const explorer = await agentLoader.loadPanel3();
    const summarizer = await agentLoader.loadSummarizer();

    const agentLoadTime = performanceMonitor.endTimer(agentLoadOperationId, {
      panelType,
      agentCount: 5,
    });

    performanceMonitor.monitorPanelTypeOperation(
      panelType,
      "agent_loading",
      agentLoadTime.duration,
      { agentCount: 5 }
    );

    // Agent mapping for easy lookup
    const panelAgents = {
      challenger,
      analyst,
      explorer,
    };

    // Initialize conversation tracking
    const conversation = [];
    const moderatorDecisions = [];
    const panelStats = {
      challenger: 0,
      analyst: 0,
      explorer: 0,
    };

    // Step 1: Moderator Setup - Select first speaker
    console.log("🎭 Moderator setting up panel discussion...");
    const setupPrompt = `Source Text: ${config.sourceText}

Discussion Subject: ${config.discussionSubject}

This is the beginning of a panel discussion. Please:
1. Provide a brief opening comment to set the stage
2. Select the first speaker from the panel
3. Give them a specific prompt to start the discussion

The panel members available are:
- Challenger: Questions assumptions, plays devil's advocate, challenges ideas
- Analyst: Provides data-driven insights, breaks down complex topics systematically  
- Explorer: Offers creative solutions, thinks outside the box, explores possibilities

Please select strategically based on what would make for the most engaging opening.`;

    const moderatorConfig = await moderator(setupPrompt, "", []);
    const setupResponse = await callEverest(
      moderatorConfig,
      pipeline,
      "moderator_setup"
    );

    // Parse initial moderator decision
    const initialDecision = parseModeratorResponse(
      setupResponse.message,
      "setup"
    );
    moderatorDecisions.push(initialDecision);

    // Add moderator setup to conversation
    conversation.push({
      role: "moderator",
      type: "setup",
      content: initialDecision.moderator_comment,
      timestamp: new Date().toISOString(),
    });

    let currentSpeaker = initialDecision.next_speaker;
    let currentPrompt = initialDecision.speaking_prompt;

    // Step 2: Panel Discussion Loop
    for (let interaction = 1; interaction <= panelInteractions; interaction++) {
      console.log(
        `💬 Panel Interaction ${interaction}/${panelInteractions} - ${currentSpeaker} speaking...`
      );

      // Panel member responds (COUNTS toward limit)
      const panelAgent = panelAgents[currentSpeaker];
      if (!panelAgent) {
        throw new Error(`Unknown panel member: ${currentSpeaker}`);
      }

      // Build context for panel member
      const contextMessages = conversation
        .map((msg) => {
          if (msg.role === "moderator") {
            return `Moderator: ${msg.content}`;
          } else {
            return `${msg.role}: ${msg.content}`;
          }
        })
        .join("\n\n");

      const panelPrompt = `Discussion Context:
${contextMessages}

Source Text: ${config.sourceText}
Discussion Subject: ${config.discussionSubject}

Current Prompt: ${currentPrompt}

Please provide your response as the ${currentSpeaker} panel member.`;

      const panelConfig = await panelAgent(panelPrompt, "", []);
      const panelResponse = await callEverest(
        panelConfig,
        pipeline,
        `${currentSpeaker}_interaction_${interaction}`
      );

      // Update stats
      panelStats[currentSpeaker]++;

      // Add panel response to conversation
      conversation.push({
        role: currentSpeaker,
        type: "panel_response",
        content: panelResponse.message,
        timestamp: new Date().toISOString(),
      });

      // If this is the last interaction, skip moderator decision
      if (interaction === panelInteractions) {
        break;
      }

      // Moderator decision (NEVER counts toward limit)
      console.log(`🎭 Moderator selecting next speaker...`);

      const moderatorPrompt = `Current Discussion:
${conversation
  .map((msg) => {
    if (msg.role === "moderator") {
      return `Moderator: ${msg.content}`;
    } else {
      return `${msg.role}: ${msg.content}`;
    }
  })
  .join("\n\n")}

Source Text: ${config.sourceText}
Discussion Subject: ${config.discussionSubject}

We are ${interaction} interactions into a ${panelInteractions}-interaction panel discussion.

Current speaker statistics:
- Challenger: ${panelStats.challenger} times
- Analyst: ${panelStats.analyst} times  
- Explorer: ${panelStats.explorer} times

Please select the next speaker and provide them with a specific prompt. Consider:
1. Who would provide the most valuable next perspective?
2. Ensuring balanced participation
3. Building on what was just said
4. Maintaining conversation flow`;

      const moderatorDecisionConfig = await moderator(moderatorPrompt, "", []);
      const moderatorResponse = await callEverest(
        moderatorDecisionConfig,
        pipeline,
        `moderator_decision_${interaction}`
      );

      // Parse moderator decision
      const decision = parseModeratorResponse(
        moderatorResponse.message,
        `decision_${interaction}`
      );
      moderatorDecisions.push(decision);

      // Update for next iteration
      currentSpeaker = decision.next_speaker;
      currentPrompt = decision.speaking_prompt;

      // Add moderator transition if visible
      if (decision.moderator_comment && decision.moderator_comment.trim()) {
        conversation.push({
          role: "moderator",
          type: "transition",
          content: decision.moderator_comment,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Step 3: Summary Generation
    console.log("📋 Generating panel summary...");
    const conversationText = conversation
      .map((msg) => {
        if (msg.role === "moderator") {
          return `Moderator: ${msg.content}`;
        } else {
          return `${msg.role}: ${msg.content}`;
        }
      })
      .join("\n\n");

    const summaryPrompt = `Full Panel Discussion:
${conversationText}

Source Text: ${config.sourceText}
Discussion Subject: ${config.discussionSubject}

Panel Statistics:
- Challenger participated ${panelStats.challenger} times
- Analyst participated ${panelStats.analyst} times
- Explorer participated ${panelStats.explorer} times

Summary Focus: ${summaryFocus}

Please provide a comprehensive summary of this moderated panel discussion that captures the diverse perspectives and key insights.`;

    const summaryConfig = await summarizer(summaryPrompt, "", []);
    const summaryResponse = await callEverest(
      summaryConfig,
      pipeline,
      "panel_summary"
    );

    // Create final result with enhanced metadata
    const result = {
      conversation,
      summary: summaryResponse.message,
      moderatorDecisions,
      panelStats,
      metadata: {
        panelType,
        panelInteractions,
        summaryFocus,
        totalMessages: conversation.length,
        apiCalls: 2 * panelInteractions + 1,
        actualApiCalls: pipeline.steps.length,
        configuration: {
          panelType,
          sourceTextLength: config.sourceText.length,
          discussionSubject: config.discussionSubject,
          summaryFocus,
          panelInteractions,
        },
        performance: {
          expectedDuration: `${panelInteractions * 45}s`, // Rough estimate: 45s per interaction
          actualDuration: pipeline.endTime
            ? new Date(pipeline.endTime).getTime() -
              new Date(pipeline.startTime).getTime()
            : null,
        },
      },
    };

    // Complete pipeline
    completePipeline(pipeline, "completed");

    // Add result to pipeline
    pipeline.result = result;

    // End performance monitoring for pipeline execution
    const pipelineTime = performanceMonitor.endTimer(pipelineOperationId, {
      panelType,
      panelInteractions,
      totalMessages: conversation.length,
      apiCalls: pipeline.steps.length
    });

    // Monitor overall pipeline performance
    performanceMonitor.monitorPanelTypeOperation(
      panelType,
      'pipeline_execution',
      pipelineTime.duration,
      {
        panelInteractions,
        totalMessages: conversation.length,
        apiCalls: pipeline.steps.length
      }
    );

    // Validate performance is within expected bounds
    const performanceValidation = performanceMonitor.validatePerformance(panelType);
    if (!performanceValidation.valid) {
      console.warn(`⚠️ Performance warning: ${performanceValidation.message}`);
    }

    // Save outputs
    const fileGenerationResult = await saveOutputs(pipeline, result, {
      sourceText: config.sourceText,
      discussionSubject: config.discussionSubject,
      panelInteractions,
      summaryFocus,
      panelType,
    });

    if (fileGenerationResult.success) {
      console.log("✅ Moderated panel pipeline completed successfully");
      console.log(`📊 Final stats: ${JSON.stringify(panelStats, null, 2)}`);
      console.log(`📁 Outputs saved to: ${fileGenerationResult.outputDir}`);
      console.log(`⚡ Performance: ${(pipelineTime.duration/1000).toFixed(1)}s (${performanceValidation.message})`);

      // Add file generation result to pipeline
      addStepResult(pipeline, "file_generation", {
        status: "success",
        files: fileGenerationResult.files,
        timestamp: fileGenerationResult.timestamp,
      });
    } else {
      console.warn(
        "⚠️ File generation failed (non-critical):",
        fileGenerationResult.error
      );
      addStepResult(pipeline, "file_generation", {
        status: "failed",
        error: fileGenerationResult.error,
        timestamp: fileGenerationResult.timestamp,
      });
    }

    // Add performance metrics to pipeline result
    result.metadata.performance.actualDuration = pipelineTime.duration;
    result.metadata.performance.performanceValidation = performanceValidation;
    result.metadata.performance.cacheStats = performanceMonitor.getCacheStats();

    return pipeline;
  } catch (error) {
    console.error("❌ Pipeline failed:", error);
    pipeline.status = "failed";
    pipeline.error = error.message;
    pipeline.endTime = new Date().toISOString();
    throw error;
  }
}

export function parseModeratorResponse(content, context) {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content);

    // Handle both old and new JSON formats
    let next_speaker, moderator_comment, speaking_prompt;

    // New format: {moderator_response, next_speaker: "panel_1|panel_2|panel_3", moderator_responds}
    if (parsed.next_speaker && parsed.next_speaker.startsWith("panel_")) {
      const speakerMapping = {
        panel_1: "challenger",
        panel_2: "analyst",
        panel_3: "explorer",
      };

      next_speaker = speakerMapping[parsed.next_speaker];
      if (!next_speaker) {
        throw new Error(
          `Invalid speaker: ${parsed.next_speaker}. Expected panel_1, panel_2, or panel_3`
        );
      }

      moderator_comment = parsed.moderator_response || "";
      speaking_prompt = `Please continue the discussion based on the context provided.`;
    }
    // Old format: {moderator_comment, next_speaker: "challenger|analyst|explorer", speaking_prompt}
    else if (
      parsed.next_speaker &&
      ["challenger", "analyst", "explorer"].includes(parsed.next_speaker)
    ) {
      next_speaker = parsed.next_speaker;
      moderator_comment = parsed.moderator_comment || "";
      speaking_prompt =
        parsed.speaking_prompt ||
        `Please continue the discussion based on the context provided.`;
    }
    // Invalid or missing next_speaker
    else {
      throw new Error("Missing or invalid next_speaker field");
    }

    return {
      moderator_comment,
      next_speaker,
      speaking_prompt,
      reasoning: parsed.reasoning || "",
      moderator_responds: parsed.moderator_responds || false,
      context,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(
      `⚠️ Failed to parse moderator JSON in ${context}:`,
      error.message
    );
    console.warn("Raw content:", content);

    // Fallback logic - try to extract speaker from content
    const panelMatch = content.match(/panel_([123])/i);
    const speakerMatch = content.match(/(?:challenger|analyst|explorer)/i);

    let fallbackSpeaker = "analyst"; // default

    if (panelMatch) {
      const speakerMapping = { 1: "challenger", 2: "analyst", 3: "explorer" };
      fallbackSpeaker = speakerMapping[panelMatch[1]] || "analyst";
    } else if (speakerMatch) {
      fallbackSpeaker = speakerMatch[0].toLowerCase();
    }

    return {
      moderator_comment: `Continuing discussion... (fallback mode)`,
      next_speaker: fallbackSpeaker,
      speaking_prompt: `Please continue the discussion based on the context provided.`,
      reasoning: `Fallback selection due to parsing error: ${error.message}`,
      context: `${context}_fallback`,
      timestamp: new Date().toISOString(),
      parsing_error: error.message,
    };
  }
}

/**
 * Generates conversation markdown file with metadata
 * @param {Array} conversation - Array of conversation entries
 * @param {Array} moderatorDecisions - Array of moderator decisions
 * @param {Object} panelStats - Panel participation statistics
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @param {Object} pipelineData - Pipeline execution data
 * @returns {string} - Markdown content
 */
function generateConversationMarkdown(
  conversation,
  moderatorDecisions,
  panelStats,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const {
    sourceText,
    discussionSubject,
    panelInteractions,
    summaryFocus,
    panelType,
  } = config;

  // Panel type specific context
  const panelTypeInfo = {
    discussion: {
      title: "Discussion Panel Conversation",
      description: "tl;dr podcast format with named participants",
      participants: "Sarah (Challenger), Mike (Analyst), Lisa (Explorer)",
    },
    security: {
      title: "Security Review Panel Conversation",
      description: "Security-focused analysis with offensive/defensive experts",
      participants:
        "Red Team (Offensive), Blue Team (Defensive), Risk Assessment (Compliance)",
    },
    techreview: {
      title: "Technical Review Panel Conversation",
      description: "Technical architecture review with specialized experts",
      participants:
        "Systems Architect, Performance Engineer, Innovation Specialist",
    },
  };

  const typeInfo = panelTypeInfo[panelType] || panelTypeInfo.discussion;

  let markdown = `# ${typeInfo.title}

## Panel Type Information
- **Panel Type**: ${panelType || "discussion"}
- **Format**: ${typeInfo.description}
- **Participants**: ${typeInfo.participants}

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Discussion Subject**: ${discussionSubject}
- **Panel Interactions**: ${panelInteractions}
- **Summary Focus**: ${summaryFocus}

## Cost Summary
${formatCostSummary(pipelineData)}

## Panel Statistics
- **Challenger**: ${panelStats.challenger} contributions
- **Analyst**: ${panelStats.analyst} contributions
- **Explorer**: ${panelStats.explorer} contributions
- **Total Messages**: ${conversation.length}
- **Moderator Decisions**: ${moderatorDecisions.length}

## Source Material
${sourceText}

## Conversation

`;

  conversation.forEach((msg) => {
    const role =
      msg.role === "moderator"
        ? "Moderator"
        : msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    markdown += `## ${role}${msg.type ? ` (${msg.type})` : ""}

${msg.content}

---

`;
  });

  return markdown;
}

/**
 * Generates summary markdown file with metadata
 * @param {string} summary - Summary content
 * @param {Object} panelStats - Panel participation statistics
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @param {Object} pipelineData - Pipeline execution data
 * @returns {string} - Markdown content
 */
function generateSummaryMarkdown(
  summary,
  panelStats,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const {
    sourceText,
    discussionSubject,
    panelInteractions,
    summaryFocus,
    panelType,
  } = config;

  // Panel type specific context
  const panelTypeInfo = {
    discussion: {
      title: "Discussion Panel Summary",
      focus:
        "Key insights, diverse perspectives, and actionable recommendations",
    },
    security: {
      title: "Security Review Panel Summary",
      focus:
        "Security vulnerabilities, risk assessment, and remediation strategies",
    },
    techreview: {
      title: "Technical Review Panel Summary",
      focus:
        "Architectural improvements, performance optimizations, and innovation opportunities",
    },
  };

  const typeInfo = panelTypeInfo[panelType] || panelTypeInfo.discussion;

  return `# ${typeInfo.title}

## Panel Type Information
- **Panel Type**: ${panelType || "discussion"}
- **Focus**: ${typeInfo.focus}

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Discussion Subject**: ${discussionSubject}
- **Panel Interactions**: ${panelInteractions}
- **Summary Focus**: ${summaryFocus}

## Cost Summary
${formatCostSummary(pipelineData)}

## Panel Statistics
- **Challenger**: ${panelStats.challenger} contributions
- **Analyst**: ${panelStats.analyst} contributions
- **Explorer**: ${panelStats.explorer} contributions
- **Total Moderator Decisions**: ${Object.values(panelStats).reduce(
    (a, b) => a + b,
    0
  )}

## Summary

${summary}

## Context
- **Source Material Length**: ${sourceText.length} characters
- **Panel Interactions**: ${panelInteractions}
- **Panel Type**: ${panelType || "discussion"}
- **Summary Model**: Generated via Everest API
`;
}

async function saveOutputs(pipeline, result, config) {
  const runId = pipeline.runId;
  const timestamp = new Date().toISOString();
  const panelType = config.panelType || "discussion";

  // Type-specific output directory naming: output/panel/{timestamp}_{panelType}/
  const baseOutputDir = path.join(process.cwd(), "output", "panel");

  console.log(
    `[FileGeneration] Starting file generation for ${panelType} panel run ${runId}`
  );

  try {
    // Ensure base output directory exists
    await fs.mkdir(baseOutputDir, { recursive: true });

    // Generate unique timestamped folder name with panel type
    const timestampedFolder = await generateTimestampedFolderNameWithType(
      baseOutputDir,
      panelType
    );
    const outputDir = path.join(baseOutputDir, timestampedFolder);

    // Create the timestamped directory
    await fs.mkdir(outputDir, { recursive: true });
    console.log(
      `[FileGeneration] ✅ Timestamped directory created: ${outputDir}`
    );

    // Generate conversation markdown with metadata
    const conversationMd = generateConversationMarkdown(
      result.conversation,
      result.moderatorDecisions,
      result.panelStats,
      config,
      runId,
      timestamp,
      pipeline
    );

    // Generate summary markdown with metadata
    const summaryMd = generateSummaryMarkdown(
      result.summary,
      result.panelStats,
      config,
      runId,
      timestamp,
      pipeline
    );

    // Define file paths
    const conversationPath = path.join(outputDir, "conversation.md");
    const summaryPath = path.join(outputDir, "summary.md");
    const moderatorDecisionsPath = path.join(
      outputDir,
      "moderator_decisions.json"
    );
    const dataPath = path.join(outputDir, "data.json");

    // Write all files
    await Promise.all([
      fs.writeFile(conversationPath, conversationMd, "utf8"),
      fs.writeFile(summaryPath, summaryMd, "utf8"),
      fs.writeFile(
        moderatorDecisionsPath,
        JSON.stringify(result.moderatorDecisions, null, 2),
        "utf8"
      ),
      fs.writeFile(dataPath, JSON.stringify(result, null, 2), "utf8"),
    ]);

    console.log(`[FileGeneration] ✅ All files generated successfully`);
    console.log(`[FileGeneration] - Folder: ${outputDir}`);
    console.log(`[FileGeneration] - Conversation: ${conversationPath}`);
    console.log(`[FileGeneration] - Summary: ${summaryPath}`);
    console.log(
      `[FileGeneration] - Moderator Decisions: ${moderatorDecisionsPath}`
    );
    console.log(`[FileGeneration] - Data: ${dataPath}`);

    return {
      success: true,
      folder: timestampedFolder,
      outputDir,
      files: {
        conversation: conversationPath,
        summary: summaryPath,
        moderatorDecisions: moderatorDecisionsPath,
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

// Main execution when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = {
    sourceText:
      "The future of work is rapidly changing with AI and automation reshaping industries, job roles, and required skills.",
    discussionSubject:
      "AI's Impact on Future Employment and Workforce Transformation",
    panelInteractions: 4,
    summaryFocus:
      "Key insights about AI's impact on jobs, workforce adaptation strategies, and future employment landscape",
  };

  runPipeline(config)
    .then((result) => {
      console.log("Pipeline completed successfully");
      console.log("Result summary:", {
        conversations: result.result.conversation.length,
        panelStats: result.result.panelStats,
        apiCalls: result.result.metadata.actualApiCalls,
      });
    })
    .catch((error) => {
      console.error("Pipeline failed:", error);
      process.exit(1);
    });
}

// Export main function with expected name for registry discovery
export const moderatedPanelPipeline = runPipeline;

// NostrMQ execution interface
export async function executeForNostrMQ(jobData) {
  try {
    const result = await runPipeline(jobData);
    return {
      success: true,
      data: result,
      message: "Moderated panel pipeline completed successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Moderated panel pipeline failed",
    };
  }
}

// Also export with the executeViaNostrMQ name that registry expects
export const executeViaNostrMQ = executeForNostrMQ;
