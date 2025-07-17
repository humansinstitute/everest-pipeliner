import { loadAgent } from "../services/agentLoader.service.js";
import { callEverest } from "../services/everest.service.js";
import {
  createPipelineData,
  completePipeline,
  addStepResult,
} from "../utils/pipelineData.js";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      `🎯 Starting moderated panel with ${panelInteractions} interactions`
    );
    console.log(
      `📊 Expected API calls: ${
        2 * panelInteractions + 1
      } (${panelInteractions} panel + ${panelInteractions} moderator + 1 summary)`
    );

    // Load agents
    const moderator = await loadAgent("panel/moderator");
    const challenger = await loadAgent("panel/panel1_challenger");
    const analyst = await loadAgent("panel/panel2_analyst");
    const explorer = await loadAgent("panel/panel3_explorer");
    const summarizer = await loadAgent("panel/summarizePanel");

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

    // Create final result
    const result = {
      conversation,
      summary: summaryResponse.message,
      moderatorDecisions,
      panelStats,
      metadata: {
        panelInteractions,
        summaryFocus,
        totalMessages: conversation.length,
        apiCalls: 2 * panelInteractions + 1,
        actualApiCalls: pipeline.steps.length,
      },
    };

    // Complete pipeline
    const completed = completePipeline(pipeline, result);

    // Save outputs
    await saveOutputs(completed, result);

    console.log("✅ Moderated panel pipeline completed successfully");
    console.log(`📊 Final stats: ${JSON.stringify(panelStats, null, 2)}`);

    return completed;
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

    // Validate required fields
    if (!parsed.next_speaker || !parsed.speaking_prompt) {
      throw new Error("Missing required fields");
    }

    // Validate speaker
    if (!["challenger", "analyst", "explorer"].includes(parsed.next_speaker)) {
      throw new Error(`Invalid speaker: ${parsed.next_speaker}`);
    }

    return {
      moderator_comment: parsed.moderator_comment || "",
      next_speaker: parsed.next_speaker,
      speaking_prompt: parsed.speaking_prompt || "",
      reasoning: parsed.reasoning || "",
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
    const speakerMatch = content.match(/(?:challenger|analyst|explorer)/i);
    const fallbackSpeaker = speakerMatch
      ? speakerMatch[0].toLowerCase()
      : "analyst";

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

async function saveOutputs(pipeline, result) {
  const outputDir = path.join(process.cwd(), "output", "panel", pipeline.id);

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Save conversation as markdown
  const conversationMd = result.conversation
    .map((msg) => {
      const role =
        msg.role === "moderator"
          ? "Moderator"
          : msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      return `## ${role}${msg.type ? ` (${msg.type})` : ""}\n\n${
        msg.content
      }\n\n---\n`;
    })
    .join("\n");

  fs.writeFileSync(path.join(outputDir, "conversation.md"), conversationMd);

  // Save summary
  fs.writeFileSync(path.join(outputDir, "summary.md"), result.summary);

  // Save moderator decisions
  fs.writeFileSync(
    path.join(outputDir, "moderator_decisions.json"),
    JSON.stringify(result.moderatorDecisions, null, 2)
  );

  // Save complete data as JSON
  fs.writeFileSync(
    path.join(outputDir, "data.json"),
    JSON.stringify(result, null, 2)
  );

  console.log(`📁 Outputs saved to: ${outputDir}`);
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
