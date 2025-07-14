/**
 * Test Utilities and Helper Functions for Content Waterfall Pipeline Tests
 *
 * This module provides reusable utilities for testing the waterfall pipeline,
 * including mock data generators, file helpers, and validation utilities.
 */

import { promises as fs } from "fs";
import path from "path";

/**
 * Reads a test fixture file from the waterfall fixtures directory
 * @param {string} filename - Name of the fixture file
 * @returns {Promise<string>} - File content
 */
export async function readTestFile(filename) {
  const filePath = path.join("tests/fixtures/waterfall", filename);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read test file ${filename}: ${error.message}`);
  }
}

/**
 * Creates a test file with specified content
 * @param {string} filepath - Path where to create the file
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 */
export async function createTestFile(filepath, content) {
  try {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content, "utf8");
  } catch (error) {
    throw new Error(`Failed to create test file ${filepath}: ${error.message}`);
  }
}

/**
 * Cleans up test files matching the given patterns
 * @param {string[]} patterns - Array of file/directory patterns to clean up
 * @returns {Promise<void>}
 */
export async function cleanupTestFiles(patterns) {
  for (const pattern of patterns) {
    try {
      await fs.rm(pattern, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors - files might not exist
    }
  }
}

/**
 * Checks if a file exists
 * @param {string} filepath - Path to check
 * @returns {Promise<boolean>} - True if file exists
 */
export async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates mock topics response for testing
 * @param {number} count - Number of topics to generate (default: 4)
 * @returns {Object} - Mock topics response
 */
export function generateMockTopics(count = 4) {
  const categories = ["framework", "story", "data", "insight"];
  const topics = [];

  for (let i = 1; i <= count; i++) {
    topics.push({
      id: i,
      title: `Test Topic ${i}`,
      category: categories[(i - 1) % categories.length],
      keyInsights: [
        `Key insight ${i}.1`,
        `Key insight ${i}.2`,
        `Key insight ${i}.3`,
      ],
      relevantQuotes: [`Relevant quote ${i}.1`, `Relevant quote ${i}.2`],
      recommendedAngle: `Recommended angle for topic ${i}`,
      context: `Context for topic ${i}`,
      sourceReferences: `Section ${i} of source material`,
    });
  }

  return {
    topics,
    extractionSummary: `Extracted ${count} distinct topics for testing purposes`,
  };
}

/**
 * Generates mock LinkedIn posts response for testing
 * @param {number} count - Number of posts to generate (default: 4)
 * @returns {Object} - Mock LinkedIn posts response
 */
export function generateMockLinkedInPosts(count = 4) {
  const approaches = ["story-driven", "framework", "question", "insight"];
  const posts = [];

  for (let i = 1; i <= count; i++) {
    posts.push({
      id: i,
      sourceTopicId: i,
      title: `Test LinkedIn Post ${i}`,
      content: `This is test LinkedIn post content ${i}.\n\nKey points:\n• Point 1\n• Point 2\n• Point 3\n\nWhat do you think?\n\n#Test #LinkedIn #Post${i}`,
      approach: approaches[(i - 1) % approaches.length],
      hashtags: [`#Test`, `#LinkedIn`, `#Post${i}`, `#Content`, `#Social`],
      estimatedEngagement: i % 2 === 0 ? "high" : "medium",
      keyElements: {
        hook: `Hook for post ${i}`,
        insight: `Main insight for post ${i}`,
        cta: `Call to action for post ${i}`,
      },
    });
  }

  return {
    linkedinPosts: posts,
    creationSummary: `Created ${count} LinkedIn posts with varied approaches for testing`,
  };
}

/**
 * Generates mock Reels concepts response for testing
 * @param {number} postsCount - Number of source posts (default: 4)
 * @param {number} reelsPerPost - Number of reels per post (default: 2)
 * @returns {Object} - Mock Reels concepts response
 */
export function generateMockReelsConcepts(postsCount = 4, reelsPerPost = 2) {
  const types = ["tip", "story", "tutorial", "insight", "question", "data"];
  const concepts = [];
  let conceptId = 1;

  for (let postId = 1; postId <= postsCount; postId++) {
    for (let reelIndex = 1; reelIndex <= reelsPerPost; reelIndex++) {
      concepts.push({
        id: conceptId,
        sourcePostId: postId,
        title: `Test Reel Concept ${conceptId}`,
        type: types[(conceptId - 1) % types.length],
        hook: `Hook for reel concept ${conceptId}`,
        script: {
          timing: `0-3s: Hook, 3-${15 + reelIndex * 5}s: Content, ${
            15 + reelIndex * 5
          }-30s: CTA`,
          content: `Script content for reel concept ${conceptId} with timing markers and engagement elements`,
        },
        visualSuggestions: {
          textOverlays: [
            `Text overlay ${conceptId}.1`,
            `Text overlay ${conceptId}.2`,
            `Text overlay ${conceptId}.3`,
          ],
          visualElements: [
            `Visual element ${conceptId}.1`,
            `Visual element ${conceptId}.2`,
          ],
          transitions: `Transition style for concept ${conceptId}`,
        },
        productionNotes: `Production notes for reel concept ${conceptId} including filming and editing guidance`,
        estimatedEngagement: conceptId % 3 === 0 ? "high" : "medium",
      });
      conceptId++;
    }
  }

  return {
    reelsConcepts: concepts,
    generationSummary: `Generated ${concepts.length} reels concepts (${reelsPerPost} per post) for testing`,
  };
}

/**
 * Creates a complete mock pipeline response
 * @param {Object} options - Configuration options
 * @returns {Object} - Complete mock response
 */
export function generateMockPipelineResponse(options = {}) {
  const { topicsCount = 4, postsCount = 4, reelsPerPost = 2 } = options;

  return {
    topics: generateMockTopics(topicsCount),
    linkedinPosts: generateMockLinkedInPosts(postsCount),
    reelsConcepts: generateMockReelsConcepts(postsCount, reelsPerPost),
  };
}

/**
 * Validates the structure of topics response
 * @param {Object} topics - Topics response to validate
 * @returns {Object} - Validation result
 */
export function validateTopicsStructure(topics) {
  const errors = [];

  if (!topics || typeof topics !== "object") {
    errors.push("Topics must be an object");
    return { isValid: false, errors };
  }

  if (!Array.isArray(topics.topics)) {
    errors.push("Topics must contain a topics array");
  } else {
    topics.topics.forEach((topic, index) => {
      if (!topic.id) errors.push(`Topic ${index} missing id`);
      if (!topic.title) errors.push(`Topic ${index} missing title`);
      if (!topic.category) errors.push(`Topic ${index} missing category`);
      if (!Array.isArray(topic.keyInsights))
        errors.push(`Topic ${index} keyInsights must be array`);
      if (!topic.recommendedAngle)
        errors.push(`Topic ${index} missing recommendedAngle`);
    });
  }

  if (!topics.extractionSummary) {
    errors.push("Topics missing extractionSummary");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the structure of LinkedIn posts response
 * @param {Object} posts - Posts response to validate
 * @returns {Object} - Validation result
 */
export function validateLinkedInPostsStructure(posts) {
  const errors = [];

  if (!posts || typeof posts !== "object") {
    errors.push("Posts must be an object");
    return { isValid: false, errors };
  }

  if (!Array.isArray(posts.linkedinPosts)) {
    errors.push("Posts must contain a linkedinPosts array");
  } else {
    posts.linkedinPosts.forEach((post, index) => {
      if (!post.id) errors.push(`Post ${index} missing id`);
      if (!post.title) errors.push(`Post ${index} missing title`);
      if (!post.content) errors.push(`Post ${index} missing content`);
      if (!post.approach) errors.push(`Post ${index} missing approach`);
      if (!Array.isArray(post.hashtags))
        errors.push(`Post ${index} hashtags must be array`);
      if (!post.keyElements) errors.push(`Post ${index} missing keyElements`);
      if (post.keyElements && !post.keyElements.hook)
        errors.push(`Post ${index} missing hook`);
      if (post.keyElements && !post.keyElements.cta)
        errors.push(`Post ${index} missing cta`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the structure of Reels concepts response
 * @param {Object} reels - Reels response to validate
 * @returns {Object} - Validation result
 */
export function validateReelsStructure(reels) {
  const errors = [];

  if (!reels || typeof reels !== "object") {
    errors.push("Reels must be an object");
    return { isValid: false, errors };
  }

  if (!Array.isArray(reels.reelsConcepts)) {
    errors.push("Reels must contain a reelsConcepts array");
  } else {
    reels.reelsConcepts.forEach((reel, index) => {
      if (!reel.id) errors.push(`Reel ${index} missing id`);
      if (!reel.sourcePostId) errors.push(`Reel ${index} missing sourcePostId`);
      if (!reel.title) errors.push(`Reel ${index} missing title`);
      if (!reel.type) errors.push(`Reel ${index} missing type`);
      if (!reel.hook) errors.push(`Reel ${index} missing hook`);
      if (!reel.script) errors.push(`Reel ${index} missing script`);
      if (!reel.visualSuggestions)
        errors.push(`Reel ${index} missing visualSuggestions`);
      if (!reel.productionNotes)
        errors.push(`Reel ${index} missing productionNotes`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Measures execution time of an async function
 * @param {Function} fn - Async function to measure
 * @returns {Promise<Object>} - Result with duration and return value
 */
export async function measureExecutionTime(fn) {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  return {
    result,
    duration,
    durationSeconds: duration / 1000,
  };
}

/**
 * Measures memory usage before and after function execution
 * @param {Function} fn - Async function to measure
 * @returns {Promise<Object>} - Result with memory usage data
 */
export async function measureMemoryUsage(fn) {
  const initialMemory = process.memoryUsage();
  const result = await fn();
  const finalMemory = process.memoryUsage();

  return {
    result,
    memoryUsage: {
      initial: initialMemory,
      final: finalMemory,
      heapUsedDelta: finalMemory.heapUsed - initialMemory.heapUsed,
      heapUsedDeltaMB:
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
    },
  };
}

/**
 * Creates a temporary directory for test files
 * @param {string} prefix - Prefix for the directory name
 * @returns {Promise<string>} - Path to the created directory
 */
export async function createTempDirectory(prefix = "test") {
  const timestamp = Date.now();
  const dirPath = path.join("temp", `${prefix}_${timestamp}`);
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Waits for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>} - Result of the function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;

      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * Generates test content of specified length
 * @param {number} targetLength - Target length in characters
 * @param {string} baseContent - Base content to repeat/extend
 * @returns {string} - Generated content
 */
export function generateTestContent(
  targetLength,
  baseContent = "This is test content. "
) {
  let content = baseContent;
  while (content.length < targetLength) {
    content += baseContent;
  }
  return content.substring(0, targetLength);
}

/**
 * Validates that a string contains no unescaped special characters
 * @param {string} content - Content to validate
 * @returns {boolean} - True if content is properly sanitized
 */
export function validateSanitization(content) {
  // Check for unescaped quotes, scripts, and other potentially dangerous content
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /[^\\]"/g, // Unescaped quotes
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
}

/**
 * Creates a mock Jest spy for the everest service
 * @param {Object} responses - Mock responses for different calls
 * @returns {Object} - Jest spy object
 */
export function createMockEverestService(responses) {
  const mockImplementation = jest.fn();

  if (Array.isArray(responses)) {
    // Sequential responses
    responses.forEach((response) => {
      mockImplementation.mockResolvedValueOnce(response);
    });
  } else {
    // Single response for all calls
    mockImplementation.mockResolvedValue(responses);
  }

  return mockImplementation;
}

export default {
  readTestFile,
  createTestFile,
  cleanupTestFiles,
  fileExists,
  generateMockTopics,
  generateMockLinkedInPosts,
  generateMockReelsConcepts,
  generateMockPipelineResponse,
  validateTopicsStructure,
  validateLinkedInPostsStructure,
  validateReelsStructure,
  measureExecutionTime,
  measureMemoryUsage,
  createTempDirectory,
  delay,
  retryWithBackoff,
  generateTestContent,
  validateSanitization,
  createMockEverestService,
};
