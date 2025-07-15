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
 * Validates and sanitizes waterfall configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result with isValid, errors, and sanitizedConfig
 */
function validateWaterfallConfig(config) {
  const errors = [];
  const sanitizedConfig = {};

  // Validate required fields
  if (!config.sourceText || typeof config.sourceText !== "string") {
    errors.push("sourceText is required and must be a string");
  } else {
    const trimmedText = config.sourceText.trim();
    if (trimmedText.length === 0) {
      errors.push("sourceText cannot be empty");
    } else {
      sanitizedConfig.sourceText = sanitizeMessageContent(trimmedText);
    }
  }

  // Validate optional customFocus
  if (config.customFocus !== undefined && config.customFocus !== null) {
    if (typeof config.customFocus !== "string") {
      errors.push("customFocus must be a string");
    } else {
      const trimmedFocus = config.customFocus.trim();
      if (trimmedFocus.length > 0) {
        sanitizedConfig.customFocus = sanitizeMessageContent(trimmedFocus);
      }
    }
  }

  // Validate optional outputFormat (for future use)
  if (config.outputFormat !== undefined && config.outputFormat !== null) {
    if (typeof config.outputFormat !== "string") {
      errors.push("outputFormat must be a string");
    } else {
      sanitizedConfig.outputFormat = config.outputFormat.trim();
    }
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
 * Generates topic extractions markdown file
 * @param {Object} topicsData - Topics data from Content Analyzer
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @param {Object} pipelineData - Pipeline execution data
 * @returns {string} - Markdown content
 */
function generateTopicExtractionsMarkdown(
  topicsData,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const { sourceText, customFocus } = config;

  let markdown = `# Content Waterfall Pipeline - Topic Extractions

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Source Material Length**: ${sourceText.length} characters
${customFocus ? `- **Custom Focus**: ${customFocus}` : ""}

## Cost Summary
${formatCostSummary(pipelineData)}

## Extracted Topics

`;

  if (topicsData.topics && Array.isArray(topicsData.topics)) {
    topicsData.topics.forEach((topic, index) => {
      markdown += `### Topic ${index + 1}: ${
        topic.title || `Topic ${index + 1}`
      }

**Category**: ${topic.category || "Not specified"}
**Recommended Angle**: ${topic.recommendedAngle || "Not specified"}

**Key Insights**:
${
  Array.isArray(topic.keyInsights)
    ? topic.keyInsights.map((insight) => `- ${insight}`).join("\n")
    : topic.keyInsights || "No insights provided"
}

**Supporting Quotes**:
${
  Array.isArray(topic.supportingQuotes)
    ? topic.supportingQuotes.map((quote) => `> "${quote}"`).join("\n")
    : topic.supportingQuotes || "No quotes provided"
}

**Context**:
${topic.context || "No context provided"}

---

`;
    });
  }

  if (topicsData.extractionSummary) {
    markdown += `## Extraction Summary

${topicsData.extractionSummary}
`;
  }

  return markdown;
}

/**
 * Generates individual LinkedIn post markdown file
 * @param {Object} post - LinkedIn post data
 * @param {number} index - Post index
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - Markdown content
 */
function generateLinkedInPostMarkdown(post, index, runId, timestamp) {
  return `# LinkedIn Post ${index + 1}: ${post.title || `Post ${index + 1}`}

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Source Topic ID**: ${post.sourceTopicId || index + 1}
- **Approach**: ${post.approach || "Not specified"}
- **Estimated Engagement**: ${post.estimatedEngagement || "Not specified"}

## Post Content

${post.content || "No content generated"}

## Post Details

**Hashtags**: ${
    Array.isArray(post.hashtags)
      ? post.hashtags.join(", ")
      : post.hashtags || "None"
  }

**Key Elements**:
- **Hook**: ${post.keyElements?.hook || "Not specified"}
- **Value Proposition**: ${
    post.keyElements?.valueProposition || "Not specified"
  }
- **Call to Action**: ${post.keyElements?.cta || "Not specified"}

## Performance Optimization
- **Target Audience**: ${post.targetAudience || "General professional audience"}
- **Best Posting Time**: ${post.bestPostingTime || "Business hours"}
- **Engagement Strategy**: ${
    post.engagementStrategy || "Standard LinkedIn engagement"
  }
`;
}

/**
 * Generates individual Reels concept markdown file
 * @param {Object} reel - Reels concept data
 * @param {number} index - Reel index
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - Markdown content
 */
function generateReelsConceptMarkdown(reel, index, runId, timestamp) {
  return `# Reels Concept ${index + 1}: ${reel.title || `Concept ${index + 1}`}

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Source Post ID**: ${reel.sourcePostId || "Not specified"}
- **Type**: ${reel.type || "Not specified"}
- **Duration**: ${reel.duration || "30-60 seconds"}

## Concept Overview

**Hook (First 3 seconds)**:
${reel.hook || "No hook provided"}

## Script & Timing

${reel.script?.content || reel.script || "No script provided"}

**Timing Breakdown**:
${reel.script?.timing || "No timing provided"}

## Visual Suggestions

**Text Overlays**:
${
  Array.isArray(reel.visualSuggestions?.textOverlays)
    ? reel.visualSuggestions.textOverlays.map((text) => `- ${text}`).join("\n")
    : "No text overlays specified"
}

**Visual Elements**:
${
  Array.isArray(reel.visualSuggestions?.visualElements)
    ? reel.visualSuggestions.visualElements
        .map((element) => `- ${element}`)
        .join("\n")
    : "No visual elements specified"
}

**Transitions**: ${reel.visualSuggestions?.transitions || "Standard cuts"}

## Production Notes

${reel.productionNotes || "No production notes provided"}

## Engagement Optimization

**Target Audience**: ${reel.targetAudience || "General audience"}
**Optimal Length**: ${reel.optimalLength || "30-45 seconds"}
**Call to Action**: ${reel.callToAction || "Like and follow for more"}
`;
}

/**
 * Generates comprehensive summary markdown file
 * @param {Object} results - All pipeline results
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @param {Object} pipelineData - Pipeline execution data
 * @returns {string} - Markdown content
 */
function generateSummaryMarkdown(
  results,
  config,
  runId,
  timestamp,
  pipelineData
) {
  const { sourceText, customFocus } = config;
  const { topics, linkedinPosts, reelsConcepts } = results;

  return `# Content Waterfall Pipeline - Complete Summary

## Metadata
- **Run ID**: ${runId}
- **Generated**: ${timestamp}
- **Source Material Length**: ${sourceText.length} characters
${customFocus ? `- **Custom Focus**: ${customFocus}` : ""}

## Cost Summary
${formatCostSummary(pipelineData)}

## Pipeline Results Overview

### Content Analysis
- **Topics Extracted**: ${topics?.topics?.length || 0}
- **Analysis Status**: ${topics ? "✅ Completed" : "❌ Failed"}

### LinkedIn Posts
- **Posts Generated**: ${linkedinPosts?.linkedinPosts?.length || 0}
- **Generation Status**: ${linkedinPosts ? "✅ Completed" : "❌ Failed"}

### Reels Concepts
- **Concepts Generated**: ${reelsConcepts?.reelsConcepts?.length || 0}
- **Generation Status**: ${reelsConcepts ? "✅ Completed" : "❌ Failed"}

## Deliverables Summary

### LinkedIn Posts Overview
${
  linkedinPosts?.linkedinPosts
    ?.map(
      (post, index) =>
        `**Post ${index + 1}**: ${post.title || `Post ${index + 1}`} (${
          post.approach || "Standard"
        } approach)`
    )
    .join("\n") || "No posts generated"
}

### Reels Concepts Overview
${
  reelsConcepts?.reelsConcepts
    ?.map(
      (reel, index) =>
        `**Concept ${index + 1}**: ${reel.title || `Concept ${index + 1}`} (${
          reel.type || "Standard"
        } type)`
    )
    .join("\n") || "No concepts generated"
}

## Next Steps

1. **Review Generated Content**: Check individual files for detailed content
2. **Customize as Needed**: Adapt posts and concepts to your specific brand voice
3. **Schedule Publishing**: Plan your content calendar with the generated materials
4. **Track Performance**: Monitor engagement to refine future content strategies

## File Structure

\`\`\`
${runId}/
├── topic_extractions.md          # Detailed topic analysis
├── linkedin_posts/               # Individual LinkedIn posts
${
  linkedinPosts?.linkedinPosts
    ?.map((_, index) => `│   ├── post_${index + 1}_[topic].md`)
    .join("\n") || "│   └── (no posts generated)"
}
├── reels_concepts/               # Individual Reels concepts
${
  reelsConcepts?.reelsConcepts
    ?.map((_, index) => `│   ├── concept_${index + 1}_[type].md`)
    .join("\n") || "│   └── (no concepts generated)"
}
├── summary.md                    # This comprehensive summary
└── data.json                     # Technical metadata and raw outputs
\`\`\`

---

*Generated by Content Waterfall Pipeline v1.0*
`;
}

/**
 * Generates JSON output file with all pipeline data
 * @param {Object} pipelineData - Pipeline execution data
 * @param {Object} results - All pipeline results
 * @param {Object} config - Pipeline configuration
 * @param {string} runId - Pipeline run ID
 * @param {string} timestamp - Formatted timestamp
 * @returns {string} - JSON content
 */
function generateJSONOutput(pipelineData, results, config, runId, timestamp) {
  const jsonData = {
    runId,
    results,
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
 * Orchestrates all file generation for the waterfall pipeline
 * @param {Object} pipelineData - Pipeline execution data
 * @param {Object} results - All pipeline results (topics, linkedinPosts, reelsConcepts)
 * @param {Object} config - Pipeline configuration
 * @returns {Promise<Object>} - Object containing file paths and generation status
 */
async function generateWaterfallOutputFiles(pipelineData, results, config) {
  const runId = pipelineData.runId;
  const timestamp = new Date().toISOString();
  const baseOutputDir = path.join("output", "waterfall");

  console.log(
    `[FileGeneration] Starting waterfall file generation for run ${runId}`
  );

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

    // Create subdirectories
    const linkedinPostsDir = path.join(outputDir, "linkedin_posts");
    const reelsConceptsDir = path.join(outputDir, "reels_concepts");
    await ensureDirectoryExists(linkedinPostsDir);
    await ensureDirectoryExists(reelsConceptsDir);

    // Generate main files
    const topicExtractionsFile = "topic_extractions.md";
    const summaryFile = "summary.md";
    const dataFile = "data.json";

    const topicExtractionsPath = path.join(outputDir, topicExtractionsFile);
    const summaryPath = path.join(outputDir, summaryFile);
    const dataPath = path.join(outputDir, dataFile);

    // Generate content for main files
    const topicExtractionsMarkdown = generateTopicExtractionsMarkdown(
      results.topics,
      config,
      runId,
      timestamp,
      pipelineData
    );
    const summaryMarkdown = generateSummaryMarkdown(
      results,
      config,
      runId,
      timestamp,
      pipelineData
    );
    const jsonOutput = generateJSONOutput(
      pipelineData,
      results,
      config,
      runId,
      timestamp
    );

    // Write main files
    await Promise.all([
      fs.writeFile(topicExtractionsPath, topicExtractionsMarkdown, "utf8"),
      fs.writeFile(summaryPath, summaryMarkdown, "utf8"),
      fs.writeFile(dataPath, jsonOutput, "utf8"),
    ]);

    // Generate individual LinkedIn post files
    const linkedinPostFiles = [];
    if (results.linkedinPosts?.linkedinPosts) {
      for (let i = 0; i < results.linkedinPosts.linkedinPosts.length; i++) {
        const post = results.linkedinPosts.linkedinPosts[i];
        const postFileName = `post_${i + 1}_${(post.title || `post_${i + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")}.md`;
        const postPath = path.join(linkedinPostsDir, postFileName);
        const postMarkdown = generateLinkedInPostMarkdown(
          post,
          i,
          runId,
          timestamp
        );

        await fs.writeFile(postPath, postMarkdown, "utf8");
        linkedinPostFiles.push(postPath);
      }
    }

    // Generate individual Reels concept files
    const reelsConceptFiles = [];
    if (results.reelsConcepts?.reelsConcepts) {
      for (let i = 0; i < results.reelsConcepts.reelsConcepts.length; i++) {
        const reel = results.reelsConcepts.reelsConcepts[i];
        const reelFileName = `concept_${i + 1}_${(
          reel.title || `concept_${i + 1}`
        )
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")}.md`;
        const reelPath = path.join(reelsConceptsDir, reelFileName);
        const reelMarkdown = generateReelsConceptMarkdown(
          reel,
          i,
          runId,
          timestamp
        );

        await fs.writeFile(reelPath, reelMarkdown, "utf8");
        reelsConceptFiles.push(reelPath);
      }
    }

    console.log(
      `[FileGeneration] ✅ All waterfall files generated successfully`
    );
    console.log(`[FileGeneration] - Folder: ${outputDir}`);
    console.log(
      `[FileGeneration] - Topic Extractions: ${topicExtractionsPath}`
    );
    console.log(
      `[FileGeneration] - LinkedIn Posts: ${linkedinPostFiles.length} files`
    );
    console.log(
      `[FileGeneration] - Reels Concepts: ${reelsConceptFiles.length} files`
    );
    console.log(`[FileGeneration] - Summary: ${summaryPath}`);
    console.log(`[FileGeneration] - Data: ${dataPath}`);

    return {
      success: true,
      folder: timestampedFolder,
      outputDir,
      files: {
        topicExtractions: topicExtractionsPath,
        linkedinPosts: linkedinPostFiles,
        reelsConcepts: reelsConceptFiles,
        summary: summaryPath,
        data: dataPath,
      },
      timestamp,
    };
  } catch (error) {
    console.error(
      `[FileGeneration] ❌ Waterfall file generation failed:`,
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
 * Content Waterfall Pipeline that transforms long-form content into structured social media outputs
 * @param {Object} config - Configuration object containing sourceText and optional customFocus
 * @returns {Promise<Object>} - Complete pipeline result with topics, LinkedIn posts, Reels concepts, and metadata
 */
async function contentWaterfallPipeline(config) {
  const pipelineData = createPipelineData();

  console.log(
    `[ContentWaterfallPipeline] Starting pipeline ${pipelineData.runId}`
  );
  console.log(
    `[ContentWaterfallPipeline] Pipeline start time: ${pipelineData.startTime}`
  );

  try {
    // Step 1: Validate configuration
    console.log(
      "[ContentWaterfallPipeline] Step 1: Validating configuration..."
    );
    const validation = validateWaterfallConfig(config);

    if (!validation.isValid) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Configuration validation failed:",
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

    const { sourceText, customFocus } = validation.sanitizedConfig;
    console.log(
      `[ContentWaterfallPipeline] ✅ Configuration validated - Source text: ${sourceText.length} characters`
    );

    // Step 2: Load waterfall agents
    console.log(
      "[ContentWaterfallPipeline] Step 2: Loading waterfall agents..."
    );
    const contentAnalyzer = await loadAgent("waterfall/contentAnalyzer");
    const linkedinCreator = await loadAgent("waterfall/linkedinCreator");
    const reelsGenerator = await loadAgent("waterfall/reelsGenerator");
    console.log(
      "[ContentWaterfallPipeline] ✅ All waterfall agents loaded successfully"
    );

    // Step 3: Execute Content Analyzer (Agent 1)
    console.log(
      "[ContentWaterfallPipeline] Step 3: Analyzing content and extracting topics..."
    );

    const analyzerMessage = sourceText;
    const analyzerContext = customFocus
      ? `Focus on extracting topics related to: ${customFocus}`
      : "Extract 4 distinct, compelling topics from the source material for social media repurposing.";

    const analyzerConfig = await contentAnalyzer(
      analyzerMessage,
      analyzerContext,
      []
    );
    const analyzerResponse = await callEverest(
      analyzerConfig,
      pipelineData,
      "content_analysis"
    );

    if (analyzerResponse.error) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Content analysis failed:",
        analyzerResponse.error
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Content analysis failed",
        details: analyzerResponse.error,
        pipeline: pipelineData,
      };
    }

    const analyzerContent = extractResponseContent(analyzerResponse);
    if (!analyzerContent) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Could not extract content from analyzer response"
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Could not extract content from analyzer response",
        pipeline: pipelineData,
      };
    }

    // Parse analyzer response (expecting JSON)
    let topicsData;
    try {
      topicsData = JSON.parse(analyzerContent);
    } catch (parseError) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Could not parse analyzer response as JSON:",
        parseError
      );
      // Fallback: treat as plain text
      topicsData = {
        topics: [
          {
            title: "Extracted Content",
            content: analyzerContent,
            category: "general",
            keyInsights: ["Content analysis completed"],
            supportingQuotes: [],
            context: "Fallback parsing due to JSON parse error",
          },
        ],
        extractionSummary: "Content analyzed with fallback parsing",
      };
    }

    console.log(
      `[ContentWaterfallPipeline] ✅ Content analysis completed - ${
        topicsData.topics?.length || 0
      } topics extracted`
    );

    // Step 4: Execute LinkedIn Creator (Agent 2)
    console.log(
      "[ContentWaterfallPipeline] Step 4: Creating LinkedIn posts..."
    );

    const linkedinMessage = JSON.stringify(topicsData.topics || []);
    const linkedinContext =
      "Transform each topic into an optimized LinkedIn post following the embedded style guide.";

    const linkedinConfig = await linkedinCreator(
      linkedinMessage,
      linkedinContext,
      []
    );
    const linkedinResponse = await callEverest(
      linkedinConfig,
      pipelineData,
      "linkedin_creation"
    );

    if (linkedinResponse.error) {
      console.error(
        "[ContentWaterfallPipeline] ❌ LinkedIn post creation failed:",
        linkedinResponse.error
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "LinkedIn post creation failed",
        details: linkedinResponse.error,
        topics: topicsData,
        pipeline: pipelineData,
      };
    }

    const linkedinContent = extractResponseContent(linkedinResponse);
    if (!linkedinContent) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Could not extract content from LinkedIn creator response"
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Could not extract content from LinkedIn creator response",
        topics: topicsData,
        pipeline: pipelineData,
      };
    }

    // Parse LinkedIn response (expecting JSON)
    let linkedinPostsData;
    try {
      linkedinPostsData = JSON.parse(linkedinContent);
    } catch (parseError) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Could not parse LinkedIn creator response as JSON:",
        parseError
      );
      // Fallback: treat as plain text
      linkedinPostsData = {
        linkedinPosts: [
          {
            title: "Generated LinkedIn Content",
            content: linkedinContent,
            approach: "fallback",
            hashtags: ["#content", "#linkedin"],
            keyElements: {
              hook: "Generated content",
              valueProposition: "Social media content",
              cta: "Engage with this post",
            },
          },
        ],
        creationSummary: "LinkedIn posts created with fallback parsing",
      };
    }

    console.log(
      `[ContentWaterfallPipeline] ✅ LinkedIn posts created - ${
        linkedinPostsData.linkedinPosts?.length || 0
      } posts generated`
    );

    // Step 5: Execute Reels Generator (Agent 3)
    console.log(
      "[ContentWaterfallPipeline] Step 5: Generating Reels concepts..."
    );

    const reelsMessage = JSON.stringify(linkedinPostsData.linkedinPosts || []);
    const reelsContext =
      "Create 2 YouTube Reels concepts per LinkedIn post with production guidance.";

    const reelsConfig = await reelsGenerator(reelsMessage, reelsContext, []);
    const reelsResponse = await callEverest(
      reelsConfig,
      pipelineData,
      "reels_generation"
    );

    if (reelsResponse.error) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Reels concept generation failed:",
        reelsResponse.error
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Reels concept generation failed",
        details: reelsResponse.error,
        topics: topicsData,
        linkedinPosts: linkedinPostsData,
        pipeline: pipelineData,
      };
    }

    const reelsContent = extractResponseContent(reelsResponse);
    if (!reelsContent) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Could not extract content from Reels generator response"
      );
      completePipeline(pipelineData, "failed");
      return {
        runId: pipelineData.runId,
        error: "Could not extract content from Reels generator response",
        topics: topicsData,
        linkedinPosts: linkedinPostsData,
        pipeline: pipelineData,
      };
    }

    // Parse Reels response (expecting JSON)
    let reelsConceptsData;
    try {
      reelsConceptsData = JSON.parse(reelsContent);
    } catch (parseError) {
      console.error(
        "[ContentWaterfallPipeline] ❌ Could not parse Reels generator response as JSON:",
        parseError
      );
      // Fallback: treat as plain text
      reelsConceptsData = {
        reelsConcepts: [
          {
            title: "Generated Reels Content",
            content: reelsContent,
            type: "fallback",
            hook: "Engaging hook",
            script: {
              timing: "0-30s: Content delivery",
              content: reelsContent,
            },
            visualSuggestions: {
              textOverlays: ["Generated Content"],
              visualElements: ["Standard video elements"],
              transitions: "Standard cuts",
            },
            productionNotes: "Fallback parsing applied",
          },
        ],
        generationSummary: "Reels concepts created with fallback parsing",
      };
    }

    console.log(
      `[ContentWaterfallPipeline] ✅ Reels concepts generated - ${
        reelsConceptsData.reelsConcepts?.length || 0
      } concepts created`
    );

    // Step 6: Generate output files
    console.log(
      "[ContentWaterfallPipeline] Step 6: Generating output files..."
    );

    const results = {
      topics: topicsData,
      linkedinPosts: linkedinPostsData,
      reelsConcepts: reelsConceptsData,
    };

    const fileGenerationResult = await generateWaterfallOutputFiles(
      pipelineData,
      results,
      validation.sanitizedConfig
    );

    if (fileGenerationResult.success) {
      console.log(
        "[ContentWaterfallPipeline] ✅ Output files generated successfully"
      );
      addStepResult(pipelineData, "file_generation", {
        status: "success",
        files: fileGenerationResult.files,
        timestamp: fileGenerationResult.timestamp,
      });
    } else {
      console.warn(
        "[ContentWaterfallPipeline] ⚠️ File generation failed (non-critical):",
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
    console.log(`\n[ContentWaterfallPipeline] 📊 PIPELINE SUMMARY:`);
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
    console.log(`Topics extracted: ${topicsData.topics?.length || 0}`);
    console.log(
      `LinkedIn posts: ${linkedinPostsData.linkedinPosts?.length || 0}`
    );
    console.log(
      `Reels concepts: ${reelsConceptsData.reelsConcepts?.length || 0}`
    );

    // Return structured result
    return {
      runId: pipelineData.runId,
      topics: topicsData,
      linkedinPosts: linkedinPostsData,
      reelsConcepts: reelsConceptsData,
      config: validation.sanitizedConfig,
      pipeline: pipelineData,
      files: fileGenerationResult.success ? fileGenerationResult.files : null,
      fileGenerationStatus: fileGenerationResult.success ? "success" : "failed",
    };
  } catch (error) {
    console.error(
      `[ContentWaterfallPipeline] ❌ Pipeline ${pipelineData.runId} failed with error:`,
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

/**
 * Lists available source files from output/waterfall/ip directory
 * @returns {Promise<Array>} - Array of file objects with name, path, and metadata
 */
async function listWaterfallSourceFiles() {
  const sourceDir = path.join("output", "waterfall", "ip");

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
 * Reads content from a waterfall source file
 * @param {string} filePath - Path to the source file
 * @returns {Promise<string>} - File content
 */
async function readWaterfallSourceFile(filePath) {
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
 * Validates that a waterfall source file path is valid and accessible
 * @param {string} filePath - Path to validate
 * @returns {Promise<boolean>} - True if file is valid
 */
async function validateWaterfallSourceFile(filePath) {
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

// ES Module main detection for direct execution
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log("🚀 Running Content Waterfall Pipeline directly...\n");

  // Example configuration for testing
  const testConfig = {
    sourceText: `
# The Future of Remote Work

Remote work has fundamentally transformed how we approach professional collaboration. What started as an emergency response to global circumstances has evolved into a permanent shift in workplace culture.

## Key Benefits

**Flexibility and Work-Life Balance**: Employees report higher satisfaction when they can manage their schedules around personal commitments. This flexibility leads to reduced stress and improved mental health.

**Access to Global Talent**: Companies are no longer limited by geographic boundaries when hiring. This has opened up opportunities for both employers and employees to find better matches.

**Reduced Overhead Costs**: Organizations save significantly on office space, utilities, and other facility-related expenses. These savings can be reinvested in employee development and technology.

## Challenges to Address

**Communication and Collaboration**: Virtual meetings can't fully replicate the spontaneous interactions that happen in physical offices. Teams must be more intentional about communication.

**Company Culture**: Building and maintaining culture remotely requires new strategies and tools. Leaders must work harder to create connection and shared purpose.

**Technology Infrastructure**: Reliable internet, proper equipment, and cybersecurity become critical business requirements rather than nice-to-haves.

## The Path Forward

The future likely involves hybrid models that combine the best of both worlds. Companies that master this balance will have significant competitive advantages in talent acquisition and retention.

Success in remote work requires investment in people, processes, and technology. Organizations must evolve their management practices and create new frameworks for measuring productivity and engagement.
    `.trim(),
    customFocus:
      "Focus on practical insights for business leaders implementing remote work strategies",
  };

  contentWaterfallPipeline(testConfig)
    .then((result) => {
      console.log("\n📋 FINAL PIPELINE RESULT:");
      console.log(`Run ID: ${result.runId}`);

      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
        if (result.details) console.log(`Details: ${result.details}`);
      } else {
        console.log(`✅ Content waterfall completed successfully`);
        console.log(
          `📊 Topics: ${result.topics?.topics?.length || 0}, LinkedIn Posts: ${
            result.linkedinPosts?.linkedinPosts?.length || 0
          }, Reels: ${result.reelsConcepts?.reelsConcepts?.length || 0}`
        );
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
  name: "contentWaterfall",
  description:
    "Content waterfall pipeline that transforms long-form content into structured social media outputs including LinkedIn posts and Reels concepts",
  parameters: {
    type: "object",
    properties: {
      sourceText: {
        type: "string",
        description:
          "Source content for waterfall processing and social media transformation",
        minLength: 1,
      },
      customFocus: {
        type: "string",
        description: "Custom focus for content analysis and topic extraction",
      },
      outputFormat: {
        type: "string",
        description: "Desired output format for generated content",
      },
    },
    required: ["sourceText"],
  },
  interfaces: ["mcp", "nostrmq", "cli"],
};

/**
 * Executes content waterfall pipeline via MCP interface
 * @param {Object} parameters - Pipeline parameters
 * @param {Object} logger - MCP logger instance
 * @returns {Promise<Object>} Formatted result for MCP consumption
 */
export async function executeViaMCP(parameters, logger) {
  logger.info("MCP content waterfall execution started", { parameters });

  try {
    const result = await contentWaterfallPipeline({
      sourceText: parameters.sourceText,
      customFocus: parameters.customFocus,
      outputFormat: parameters.outputFormat,
    });

    logger.info("MCP content waterfall execution completed", {
      success: !result.error,
      runId: result.runId,
    });

    // Format for MCP consumption
    return {
      success: !result.error,
      result: {
        runId: result.runId,
        status: result.error ? "failed" : "completed",
        summary: `Content waterfall completed: ${
          result.topics?.topics?.length || 0
        } topics, ${
          result.linkedinPosts?.linkedinPosts?.length || 0
        } LinkedIn posts, ${
          result.reelsConcepts?.reelsConcepts?.length || 0
        } Reels concepts`,
        topics: result.topics?.topics?.slice(0, 3) || [], // Preview for Claude
        linkedinPosts: result.linkedinPosts?.linkedinPosts?.slice(0, 2) || [], // Preview for Claude
        reelsConcepts: result.reelsConcepts?.reelsConcepts?.slice(0, 2) || [], // Preview for Claude
        files: result.files ? Object.values(result.files).flat() : [],
        executionTime: result.pipeline?.statistics?.durationSeconds,
        contentStats: {
          topicsExtracted: result.topics?.topics?.length || 0,
          linkedinPostsGenerated:
            result.linkedinPosts?.linkedinPosts?.length || 0,
          reelsConceptsGenerated:
            result.reelsConcepts?.reelsConcepts?.length || 0,
        },
      },
      error: result.error,
    };
  } catch (error) {
    logger.error("MCP content waterfall execution failed", error);
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
 * Executes content waterfall pipeline via NostrMQ interface (stub for future implementation)
 * @param {Object} parameters - Pipeline parameters
 * @param {Object} jobLogger - NostrMQ job logger instance
 * @returns {Promise<Object>} Result for NostrMQ consumption
 */
export async function executeViaNostrMQ(parameters, jobLogger) {
  jobLogger.info("NostrMQ content waterfall execution started", { parameters });

  // For now, delegate to the main pipeline function
  // Future implementation will add NostrMQ-specific handling
  const result = await contentWaterfallPipeline({
    sourceText: parameters.sourceText,
    customFocus: parameters.customFocus,
    outputFormat: parameters.outputFormat,
  });

  jobLogger.info("NostrMQ content waterfall execution completed", {
    success: !result.error,
    runId: result.runId,
  });

  return result;
}

export {
  contentWaterfallPipeline,
  validateWaterfallConfig,
  generateTimestampedFolderName,
  listWaterfallSourceFiles,
  readWaterfallSourceFile,
  validateWaterfallSourceFile,
  generateWaterfallOutputFiles,
};
