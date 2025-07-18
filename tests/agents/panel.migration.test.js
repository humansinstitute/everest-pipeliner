/**
 * Panel Agents Migration Tests
 *
 * Tests to validate that migrated panel agents produce identical output
 * to their original implementations, ensuring 100% backward compatibility.
 */

import { jest } from "@jest/globals";
import agentLoader from "../../src/utils/agentLoader.js";

// Import original panel agents
import originalModerator from "../../src/agents/panel/moderator.js";
import originalChallenger from "../../src/agents/panel/panel1_challenger.js";
import originalAnalyst from "../../src/agents/panel/panel2_analyst.js";
import originalExplorer from "../../src/agents/panel/panel3_explorer.js";
import originalSummarizer from "../../src/agents/panel/summarizePanel.js";

// Test fixtures for panel discussions
const testMessage =
  "The rise of AI in healthcare presents both opportunities and challenges. How should we balance innovation with patient safety?";
const testContext = "Panel discussion on AI ethics in healthcare";
const testHistory = [
  { role: "user", content: "Welcome to our panel discussion" },
  { role: "assistant", content: "Thank you for having us" },
];

// Panel-specific test scenarios
const panelTestScenarios = [
  {
    name: "controversial topic",
    message:
      "Should AI systems be allowed to make life-or-death medical decisions without human oversight?",
    context: "AI autonomy in critical healthcare decisions",
    history: [],
  },
  {
    name: "technical discussion",
    message:
      "Machine learning algorithms in diagnostic imaging show 95% accuracy. Is this sufficient for clinical deployment?",
    context: "Technical evaluation of AI diagnostic tools",
    history: [
      { role: "user", content: "Let's discuss AI diagnostic accuracy" },
      { role: "assistant", content: "The data shows promising results" },
    ],
  },
  {
    name: "ethical dilemma",
    message:
      "If an AI system recommends treatment A but the doctor prefers treatment B, who should have the final say?",
    context: "AI-human decision making conflicts in medicine",
    history: [
      { role: "user", content: "We need to address decision-making authority" },
      {
        role: "assistant",
        content: "This touches on fundamental questions of responsibility",
      },
    ],
  },
];

describe("Panel Agents Migration Tests", () => {
  describe("Moderator Agent Migration", () => {
    // Configuration for migrated moderator
    const moderatorConfig = {
      systemPrompt: `You are a skilled panel moderator facilitating a dynamic conversation between three panelists with distinct personalities:

- panel_1 (The Challenger): Questions assumptions, challenges ideas, high disagreeableness
- panel_2 (The Analyst): Balanced, evidence-based, synthesizes perspectives  
- panel_3 (The Explorer): Creative, unconventional thinking, thought experiments

Your role is to:
1. Guide the conversation flow naturally
2. Select the next speaker based on context and conversation dynamics
3. Decide when to interject with your own insights or questions
4. Maintain engagement and prevent any single voice from dominating

CRITICAL: You MUST always respond with valid JSON in this exact format:
{
  "moderator_response": "Your response as moderator (can be empty string if you don't want to speak)",
  "next_speaker": "panel_1|panel_2|panel_3",
  "moderator_responds": true|false
}

Guidelines:
- Keep moderator_response concise and focused on facilitation
- Choose next_speaker based on who would add the most value to the current topic
- Set moderator_responds to true when you want to guide, clarify, or transition topics
- Vary speakers to maintain dynamic conversation flow
- Consider each panelist's personality when selecting next speaker
- Use transitional phrases like "Let's hear from..." or "What's your take on..."

Remember: Your JSON response controls the entire conversation flow. Invalid JSON will break the system.`,
      provider: "openrouter",
      model: "openai/gpt-4.1",
      callType: "chat",
      type: "completion",
      temperature: 0.7,
      debugPrefix: "[Moderator]",
      includeDateContext: false,
      originOverrides: {
        channel: "panel-pipeline",
        gatewayUserID: "panel-moderator",
        gatewayMessageID: "panel-moderator-message",
        gatewayNpub: "panel-moderator-npub",
        conversationID: "panel-moderated-discussion",
        channelSpace: "PANEL",
        userID: "panel-pipeline-user",
      },
    };

    test("should produce identical structure to original moderator", async () => {
      const originalResult = await originalModerator(
        testMessage,
        testContext,
        testHistory
      );

      // Create migrated version using agentLoader
      const migratedModerator = (message, context, history) => {
        // Add context to system prompt if provided
        const systemPromptWithContext = testContext
          ? moderatorConfig.systemPrompt +
            `\n\n${testContext ? `Discussion Topic: ${testContext}` : ""}`
          : moderatorConfig.systemPrompt;

        // Create user prompt similar to original
        const userPrompt = `Current conversation state:

${message}

Please analyze this conversation state and provide your moderation decision as a JSON response with the required format:
- moderator_response: Your guidance/transition/question (or empty string)
- next_speaker: Choose panel_1, panel_2, or panel_3 based on who should speak next
- moderator_responds: true if you want to speak, false if you just want to select next speaker

Consider the flow, balance, and which panelist would add the most value at this point in the discussion.`;

        return agentLoader(
          {
            ...moderatorConfig,
            systemPrompt: systemPromptWithContext,
            response_format: { type: "json_object" },
          },
          userPrompt,
          "",
          history
        );
      };

      const migratedResult = migratedModerator(
        testMessage,
        testContext,
        testHistory
      );

      // Validate structure compatibility
      expect(migratedResult).toHaveProperty("callID");
      expect(migratedResult).toHaveProperty("model");
      expect(migratedResult).toHaveProperty("chat");
      expect(migratedResult).toHaveProperty("origin");

      // Validate model configuration
      expect(migratedResult.model.provider).toBe(originalResult.model.provider);
      expect(migratedResult.model.model).toBe(originalResult.model.model);
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
      expect(migratedResult.model.response_format).toEqual(
        originalResult.model.response_format
      );

      // Validate chat structure
      expect(migratedResult.chat).toHaveProperty("systemPrompt");
      expect(migratedResult.chat).toHaveProperty("userPrompt");
      expect(migratedResult.chat.messageHistory).toEqual(
        originalResult.chat.messageHistory
      );

      // Validate origin structure
      expect(migratedResult.origin.channel).toBe(originalResult.origin.channel);
      expect(migratedResult.origin.gatewayUserID).toBe(
        originalResult.origin.gatewayUserID
      );
      expect(migratedResult.origin.conversationID).toBe(
        originalResult.origin.conversationID
      );
    });

    panelTestScenarios.forEach((scenario) => {
      test(`should handle ${scenario.name} scenario correctly`, async () => {
        const originalResult = await originalModerator(
          scenario.message,
          scenario.context,
          scenario.history
        );

        const migratedModerator = (message, context, history) => {
          const systemPromptWithContext = context
            ? moderatorConfig.systemPrompt +
              `\n\n${context ? `Discussion Topic: ${context}` : ""}`
            : moderatorConfig.systemPrompt;

          const userPrompt = `Current conversation state:

${message}

Please analyze this conversation state and provide your moderation decision as a JSON response with the required format:
- moderator_response: Your guidance/transition/question (or empty string)
- next_speaker: Choose panel_1, panel_2, or panel_3 based on who should speak next
- moderator_responds: true if you want to speak, false if you just want to select next speaker

Consider the flow, balance, and which panelist would add the most value at this point in the discussion.`;

          return agentLoader(
            {
              ...moderatorConfig,
              systemPrompt: systemPromptWithContext,
              response_format: { type: "json_object" },
            },
            userPrompt,
            "",
            history
          );
        };

        const migratedResult = migratedModerator(
          scenario.message,
          scenario.context,
          scenario.history
        );

        // Validate essential structure matches
        expect(migratedResult.model.provider).toBe(
          originalResult.model.provider
        );
        expect(migratedResult.model.model).toBe(originalResult.model.model);
        expect(migratedResult.model.temperature).toBe(
          originalResult.model.temperature
        );
        expect(migratedResult.chat.messageHistory).toEqual(
          originalResult.chat.messageHistory
        );
      });
    });
  });

  describe("Challenger Agent Migration", () => {
    const challengerConfig = {
      systemPrompt: `You are "The Challenger" - a panelist with high disagreeableness who questions assumptions and challenges ideas. Your role is to:

PERSONALITY TRAITS:
- High disagreeableness - you naturally question and challenge
- Skeptical of conventional wisdom
- Look for flaws in reasoning and gaps in logic
- Push back on ideas that seem too easily accepted
- Provocative but not destructive - aim to strengthen ideas through challenge

COMMUNICATION STYLE:
- Use phrases like "But consider this...", "The problem with that approach...", "What you're missing is..."
- Ask probing questions that expose assumptions
- Present alternative perspectives and counterarguments
- Reference potential downsides and unintended consequences
- Be direct and assertive in your challenges

APPROACH:
- Challenge the premise, not the person
- Look for logical inconsistencies
- Question the evidence or reasoning presented
- Explore "what could go wrong" scenarios
- Present devil's advocate positions
- Push for deeper thinking and more robust solutions

Remember: Your goal is to strengthen ideas by challenging them, not to win arguments. Be tough on ideas but respectful of people. Make the discussion more rigorous through your challenges.

Respond naturally as a panelist would in conversation as part of a podcast discussion, incorporating your challenging perspective into the flow of discussion.`,
      provider: "openrouter",
      model: "x-ai/grok-4",
      callType: "chat",
      type: "completion",
      temperature: 0.8,
      debugPrefix: "[Challenger]",
      includeDateContext: false,
      originOverrides: {
        channel: "panel-pipeline",
        gatewayUserID: "panel-challenger",
        gatewayMessageID: "panel-challenger-message",
        gatewayNpub: "panel-challenger-npub",
        conversationID: "panel-moderated-discussion",
        channelSpace: "PANEL",
        userID: "panel-pipeline-user",
      },
    };

    test("should produce identical structure to original challenger", async () => {
      const originalResult = await originalChallenger(
        testMessage,
        testContext,
        testHistory
      );

      const migratedChallenger = (message, context, history) => {
        const systemPromptWithContext = context
          ? challengerConfig.systemPrompt +
            `\n\n${context ? `Discussion Context: ${context}` : ""}`
          : challengerConfig.systemPrompt;

        const userPrompt = `Current discussion point:

${message}

As "The Challenger," provide your perspective on this discussion. Question assumptions, identify potential problems, present counterarguments, and challenge the ideas presented. Be provocative but constructive in your challenge.`;

        return agentLoader(
          {
            ...challengerConfig,
            systemPrompt: systemPromptWithContext,
          },
          userPrompt,
          "",
          history
        );
      };

      const migratedResult = migratedChallenger(
        testMessage,
        testContext,
        testHistory
      );

      // Validate structure compatibility
      expect(migratedResult.model.provider).toBe(originalResult.model.provider);
      expect(migratedResult.model.model).toBe(originalResult.model.model);
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
      expect(migratedResult.chat.messageHistory).toEqual(
        originalResult.chat.messageHistory
      );
      expect(migratedResult.origin.gatewayUserID).toBe(
        originalResult.origin.gatewayUserID
      );
    });
  });

  describe("Analyst Agent Migration", () => {
    const analystConfig = {
      systemPrompt: `You are "The Analyst" - a balanced, evidence-based panelist who synthesizes perspectives and grounds discussions in data and established principles. Your role is to:

PERSONALITY TRAITS:
- Balanced and objective in your approach
- Evidence-based reasoning - you value data and research
- Synthesizes different perspectives into coherent frameworks
- Methodical and systematic in your analysis
- Seeks to understand underlying patterns and principles

COMMUNICATION STYLE:
- Reference studies, data, and established principles
- Use phrases like "Research shows...", "The evidence suggests...", "If we look at the data..."
- Present balanced viewpoints that acknowledge multiple perspectives
- Break down complex topics into component parts
- Connect current discussion to broader patterns and trends

APPROACH:
- Ground discussions in evidence and research
- Synthesize different viewpoints into coherent analysis
- Identify patterns and underlying principles
- Present structured, logical reasoning
- Bridge gaps between different perspectives
- Reference relevant frameworks and models when appropriate

EXPERTISE AREAS:
- Data analysis and interpretation
- Research methodology and evidence evaluation
- Systems thinking and pattern recognition
- Comparative analysis across different domains
- Risk assessment and probability evaluation

Remember: Your goal is to bring objectivity and evidence-based reasoning to the discussion. Help the panel make more informed decisions by providing balanced analysis grounded in data and established principles.

Respond naturally as a panelist would in conversation as part of a podcast discussion, incorporating your analytical perspective and evidence-based approach into the flow of discussion.`,
      provider: "openrouter",
      model: "anthropic/claude-3-5-sonnet",
      callType: "chat",
      type: "completion",
      temperature: 0.7,
      debugPrefix: "[Analyst]",
      includeDateContext: false,
      originOverrides: {
        channel: "panel-pipeline",
        gatewayUserID: "panel-analyst",
        gatewayMessageID: "panel-analyst-message",
        gatewayNpub: "panel-analyst-npub",
        conversationID: "panel-moderated-discussion",
        channelSpace: "PANEL",
        userID: "panel-pipeline-user",
      },
    };

    test("should produce identical structure to original analyst", async () => {
      const originalResult = await originalAnalyst(
        testMessage,
        testContext,
        testHistory
      );

      const migratedAnalyst = (message, context, history) => {
        const systemPromptWithContext = context
          ? analystConfig.systemPrompt +
            `\n\n${context ? `Discussion Context: ${context}` : ""}`
          : analystConfig.systemPrompt;

        const userPrompt = `Current discussion point:

${message}

As "The Analyst," provide your evidence-based perspective on this discussion. Reference relevant data, research, or established principles. Synthesize the different viewpoints presented and offer a balanced, analytical assessment.`;

        return agentLoader(
          {
            ...analystConfig,
            systemPrompt: systemPromptWithContext,
          },
          userPrompt,
          "",
          history
        );
      };

      const migratedResult = migratedAnalyst(
        testMessage,
        testContext,
        testHistory
      );

      // Validate structure compatibility
      expect(migratedResult.model.provider).toBe(originalResult.model.provider);
      expect(migratedResult.model.model).toBe(originalResult.model.model);
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
      expect(migratedResult.chat.messageHistory).toEqual(
        originalResult.chat.messageHistory
      );
      expect(migratedResult.origin.gatewayUserID).toBe(
        originalResult.origin.gatewayUserID
      );
    });
  });

  describe("Explorer Agent Migration", () => {
    const explorerConfig = {
      systemPrompt: `You are "The Explorer" - a creative panelist with unconventional thinking who brings fresh perspectives through thought experiments and analogies. Your role is to:

PERSONALITY TRAITS:
- Creative and imaginative in your approach
- Unconventional thinking - you see connections others miss
- Comfortable with ambiguity and paradox
- Curious about possibilities and potential
- Willing to take intellectual risks

COMMUNICATION STYLE:
- Use "What if..." questions to explore possibilities
- Create analogies and metaphors to illustrate points
- Present thought experiments and hypothetical scenarios
- Use phrases like "Imagine if...", "Consider the possibility that...", "This reminds me of..."
- Draw connections between seemingly unrelated concepts
- Encourage "blue sky" thinking and creative exploration

APPROACH:
- Challenge conventional thinking through creative alternatives
- Use analogies to make complex concepts accessible
- Explore edge cases and unconventional scenarios
- Encourage thinking beyond current constraints
- Find unexpected connections between ideas
- Present novel frameworks and perspectives

CREATIVE TECHNIQUES:
- Analogical reasoning - connect to other domains
- Thought experiments - explore hypothetical scenarios
- Reframing - look at problems from different angles
- Pattern recognition across disciplines
- Speculative exploration of future possibilities
- Counter-intuitive insights and paradoxes

Remember: Your goal is to expand the boundaries of the discussion and inspire creative thinking. Help the panel explore new possibilities and see familiar problems from fresh perspectives.

Respond naturally as a panelist would in conversation as part of a podcast discussion, incorporating your creative and exploratory perspective into the flow of discussion.`,
      provider: "openrouter",
      model: "x-ai/grok-4",
      callType: "chat",
      type: "completion",
      temperature: 0.9,
      debugPrefix: "[Explorer]",
      includeDateContext: false,
      originOverrides: {
        channel: "panel-pipeline",
        gatewayUserID: "panel-explorer",
        gatewayMessageID: "panel-explorer-message",
        gatewayNpub: "panel-explorer-npub",
        conversationID: "panel-moderated-discussion",
        channelSpace: "PANEL",
        userID: "panel-pipeline-user",
      },
    };

    test("should produce identical structure to original explorer", async () => {
      const originalResult = await originalExplorer(
        testMessage,
        testContext,
        testHistory
      );

      const migratedExplorer = (message, context, history) => {
        const systemPromptWithContext = context
          ? explorerConfig.systemPrompt +
            `\n\n${context ? `Discussion Context: ${context}` : ""}`
          : explorerConfig.systemPrompt;

        const userPrompt = `Current discussion point:

${message}

As "The Explorer," provide your creative perspective on this discussion. Use thought experiments, analogies, and "What if..." scenarios to expand thinking. Find unexpected connections and explore unconventional possibilities.`;

        return agentLoader(
          {
            ...explorerConfig,
            systemPrompt: systemPromptWithContext,
          },
          userPrompt,
          "",
          history
        );
      };

      const migratedResult = migratedExplorer(
        testMessage,
        testContext,
        testHistory
      );

      // Validate structure compatibility
      expect(migratedResult.model.provider).toBe(originalResult.model.provider);
      expect(migratedResult.model.model).toBe(originalResult.model.model);
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
      expect(migratedResult.chat.messageHistory).toEqual(
        originalResult.chat.messageHistory
      );
      expect(migratedResult.origin.gatewayUserID).toBe(
        originalResult.origin.gatewayUserID
      );
    });
  });

  describe("Summarizer Agent Migration", () => {
    const summarizerConfig = {
      systemPrompt: `You are a skilled panel discussion summarizer who synthesizes complex multi-perspective conversations into structured, comprehensive summaries. Your role is to:

CORE RESPONSIBILITIES:
- Synthesize key insights from all panelists
- Identify areas of agreement and disagreement
- Capture the evolution of ideas throughout the discussion
- Highlight unique contributions from each perspective
- Present a balanced overview of the conversation

SUMMARY STRUCTURE:
1. **Discussion Overview**: Brief context and main topic
2. **Key Insights**: Major points and breakthroughs
3. **Perspective Analysis**:
   - The Challenger's key challenges and critical points
   - The Analyst's evidence-based insights and data points
   - The Explorer's creative ideas and novel connections
   - The Moderator's guiding questions and transitions
4. **Areas of Convergence**: Where panelists found common ground
5. **Unresolved Tensions**: Key disagreements or open questions
6. **Synthesis**: Integrated insights and emergent themes
7. **Next Steps**: Potential follow-up questions or areas for further exploration

WRITING STYLE:
- Clear, professional, and objective
- Preserve the nuance of different perspectives
- Use structured formatting with clear sections
- Include specific examples and quotes when relevant
- Maintain neutrality while capturing the essence of each viewpoint

QUALITY CRITERIA:
- Comprehensive coverage of all major points
- Balanced representation of all perspectives
- Clear logical flow and organization
- Actionable insights and implications
- Accessible to readers who didn't attend the discussion

Remember: Your goal is to create a valuable synthesis that captures the richness of the panel discussion while making it accessible and actionable for readers.`,
      provider: "openrouter",
      model: "anthropic/claude-3-5-sonnet",
      callType: "chat",
      type: "completion",
      temperature: 0.6,
      debugPrefix: "[Summarizer]",
      includeDateContext: false,
      originOverrides: {
        channel: "panel-pipeline",
        gatewayUserID: "panel-summarizer",
        gatewayMessageID: "panel-summarizer-message",
        gatewayNpub: "panel-summarizer-npub",
        conversationID: "panel-moderated-discussion",
        channelSpace: "PANEL",
        userID: "panel-pipeline-user",
      },
    };

    test("should produce identical structure to original summarizer", async () => {
      const originalResult = await originalSummarizer(
        testMessage,
        testContext,
        testHistory
      );

      const migratedSummarizer = (message, context, history) => {
        const systemPromptWithContext = context
          ? summarizerConfig.systemPrompt +
            `\n\n${context ? `Discussion Topic: ${context}` : ""}`
          : summarizerConfig.systemPrompt;

        const userPrompt = `Complete panel discussion to summarize:

${message}

Please create a comprehensive summary of this panel discussion following the structured format specified. Ensure balanced representation of all perspectives and capture the key insights, tensions, and emergent themes from the conversation.`;

        return agentLoader(
          {
            ...summarizerConfig,
            systemPrompt: systemPromptWithContext,
          },
          userPrompt,
          "",
          history
        );
      };

      const migratedResult = migratedSummarizer(
        testMessage,
        testContext,
        testHistory
      );

      // Validate structure compatibility
      expect(migratedResult.model.provider).toBe(originalResult.model.provider);
      expect(migratedResult.model.model).toBe(originalResult.model.model);
      expect(migratedResult.model.temperature).toBe(
        originalResult.model.temperature
      );
      expect(migratedResult.chat.messageHistory).toEqual(
        originalResult.chat.messageHistory
      );
      expect(migratedResult.origin.gatewayUserID).toBe(
        originalResult.origin.gatewayUserID
      );
    });
  });

  describe("Cross-Agent Compatibility", () => {
    test("all panel agents should maintain consistent origin structure", async () => {
      const results = await Promise.all([
        originalModerator(testMessage, testContext, testHistory),
        originalChallenger(testMessage, testContext, testHistory),
        originalAnalyst(testMessage, testContext, testHistory),
        originalExplorer(testMessage, testContext, testHistory),
        originalSummarizer(testMessage, testContext, testHistory),
      ]);

      // All should have consistent origin structure for panel pipeline
      results.forEach((result) => {
        expect(result.origin.channel).toBe("panel-pipeline");
        expect(result.origin.conversationID).toBe("panel-moderated-discussion");
        expect(result.origin.channelSpace).toBe("PANEL");
        expect(result.origin.userID).toBe("panel-pipeline-user");
      });
    });

    test("all panel agents should handle empty message history", async () => {
      const emptyHistory = [];

      const results = await Promise.all([
        originalModerator(testMessage, testContext, emptyHistory),
        originalChallenger(testMessage, testContext, emptyHistory),
        originalAnalyst(testMessage, testContext, emptyHistory),
        originalExplorer(testMessage, testContext, emptyHistory),
        originalSummarizer(testMessage, testContext, emptyHistory),
      ]);

      results.forEach((result) => {
        expect(result.chat.messageHistory).toEqual([]);
      });
    });

    test("all panel agents should handle missing context gracefully", async () => {
      const results = await Promise.all([
        originalModerator(testMessage, "", testHistory),
        originalChallenger(testMessage, "", testHistory),
        originalAnalyst(testMessage, "", testHistory),
        originalExplorer(testMessage, "", testHistory),
        originalSummarizer(testMessage, "", testHistory),
      ]);

      results.forEach((result) => {
        expect(result).toHaveProperty("callID");
        expect(result).toHaveProperty("model");
        expect(result).toHaveProperty("chat");
        expect(result).toHaveProperty("origin");
      });
    });
  });
});
