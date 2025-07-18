/**
 * Dialogue Agents Migration Tests
 *
 * This test suite validates that migrating dialogue agents to use agentLoader
 * maintains 100% backward compatibility with identical output structures.
 */

import DialogueAg1 from "../../src/agents/dialogue/DialogueAg1.js";
import DialogueAg2 from "../../src/agents/dialogue/DialogueAg2.js";
import facilitator from "../../src/agents/dialogue/facilitator.js";
import summariseConversation from "../../src/agents/dialogue/summariseConversation.js";
import agentLoader from "../../src/utils/agentLoader.js";

describe("Dialogue Agents Migration Tests", () => {
  // Test data
  const testMessage = "Let's discuss the implications of AI in healthcare";
  const testContext = "Healthcare AI Discussion Context";
  const testHistory = [
    { role: "user", content: "Previous message 1" },
    { role: "assistant", content: "Previous response 1" },
  ];

  // Helper function to normalize callDetails for comparison
  const normalizeCallDetails = (callDetails) => {
    const normalized = { ...callDetails };
    // Remove dynamic fields that will always be different
    delete normalized.callID;
    delete normalized.origin.callTS;
    return normalized;
  };

  // Helper function to validate callDetails structure
  const validateCallDetailsStructure = (callDetails, agentName) => {
    expect(callDetails).toBeDefined();
    expect(callDetails.callID).toBeDefined();
    expect(typeof callDetails.callID).toBe("string");

    expect(callDetails.model).toBeDefined();
    expect(callDetails.model.provider).toBeDefined();
    expect(callDetails.model.model).toBeDefined();
    expect(callDetails.model.callType).toBeDefined();
    expect(callDetails.model.type).toBeDefined();
    expect(callDetails.model.temperature).toBeDefined();

    expect(callDetails.chat).toBeDefined();
    expect(callDetails.chat.userPrompt).toBeDefined();
    expect(callDetails.chat.systemPrompt).toBeDefined();
    expect(callDetails.chat.messageContext).toBeDefined();
    expect(callDetails.chat.messageHistory).toBeDefined();

    expect(callDetails.origin).toBeDefined();
    expect(callDetails.origin.callTS).toBeDefined();
  };

  describe("DialogueAg1 Migration", () => {
    let originalCallDetails;
    let migratedCallDetails;

    beforeAll(async () => {
      // Get original implementation output
      originalCallDetails = await DialogueAg1(
        testMessage,
        testContext,
        testHistory
      );
    });

    test("should maintain identical structure after migration", async () => {
      const config = {
        systemPrompt: `You are AGENT 1. Your goal is to explore an INTERESTING TOPIC and SOURCE MATERIAL with AGENT 2. You will be given access to a longer form text input (SOURCE MATERIAL) and a focus for the inquiry of your dialogue (INTERESTING TOPIC). You should: 
  
Start: Introduce the topic to AGENT 2. Share your initial thoughts and any assumptions you have.
- Please state what you like and what you don't like about this point.

Discuss & Deepen:
- If you have a response from AGENT 2 listen closely and consider your response ask probing questions and expore the topic further. 
- Explore the point and improve through iteration refining on the key points and testing ideas.
- If ideas are bad call them out and look for other directions or reset to earlier ideas.

---- YOUR PERSONA ----

You are **Explorer**, a collaborative thought-partner whose job is to move the conversation into new territory.

• Big-Five aspects: Compassion ≈ 60th percentile (warm, people-focused); Politeness ≈ 30th percentile (relaxed about bluntness).  
• Tone: curious, encouraging, playful; speaks in first-person ("Im wondering if…"). 
• Values: novelty, momentum, psychological safety.

BEHAVIOUR RULES
1. **Idea Surfacing** Generate multiple possibilities quickly; phrase contributions as "What if…?" or "Imagine we…".  
2. **Assumption-Testing** When challenged, respond with curiosity, not defensiveness; thank the critic and build on their point.  
3. **Human Lens** Regularly check how proposals might affect end-users feelings or wellbeing.  
4. **Brevity on Tangents* If you start to ramble, self-flag ("Quick recap…") and hand the floor back.  
5. **Hand-off Cues* End each turn with an explicit pass: "Over to you—how does that hold up against our constraints?"

FAIL CONDITIONS  
• Dominating the thread, ignoring time or scope.  
• Dismissing constraints without acknowledging them.`,
        provider: "openrouter",
        model: "x-ai/grok-4",
        callType: "chat",
        type: "completion",
        temperature: 0.8,
        debugPrefix: "[DialogueAg1]",
        includeDateContext: true,
      };

      migratedCallDetails = agentLoader(
        config,
        testMessage,
        testContext,
        testHistory
      );

      // Validate structure
      validateCallDetailsStructure(originalCallDetails, "DialogueAg1");
      validateCallDetailsStructure(
        migratedCallDetails,
        "DialogueAg1 (migrated)"
      );

      // Compare normalized structures
      const normalizedOriginal = normalizeCallDetails(originalCallDetails);
      const normalizedMigrated = normalizeCallDetails(migratedCallDetails);

      expect(normalizedMigrated).toEqual(normalizedOriginal);
    });

    test("should have identical model configuration", () => {
      expect(migratedCallDetails.model.provider).toBe(
        originalCallDetails.model.provider
      );
      expect(migratedCallDetails.model.model).toBe(
        originalCallDetails.model.model
      );
      expect(migratedCallDetails.model.callType).toBe(
        originalCallDetails.model.callType
      );
      expect(migratedCallDetails.model.type).toBe(
        originalCallDetails.model.type
      );
      expect(migratedCallDetails.model.temperature).toBe(
        originalCallDetails.model.temperature
      );
    });

    test("should have identical chat configuration", () => {
      expect(migratedCallDetails.chat.systemPrompt).toBe(
        originalCallDetails.chat.systemPrompt
      );
      expect(migratedCallDetails.chat.userPrompt).toBe(
        originalCallDetails.chat.userPrompt
      );
      expect(migratedCallDetails.chat.messageContext).toBe(
        originalCallDetails.chat.messageContext
      );
      expect(migratedCallDetails.chat.messageHistory).toEqual(
        originalCallDetails.chat.messageHistory
      );
    });
  });

  describe("DialogueAg2 Migration", () => {
    let originalCallDetails;
    let migratedCallDetails;

    beforeAll(async () => {
      originalCallDetails = await DialogueAg2(
        testMessage,
        testContext,
        testHistory
      );
    });

    test("should maintain identical structure after migration", async () => {
      const config = {
        systemPrompt: `You are AGENT 2. Your goal is to explore an INTERESTING TOPIC and SOURCE MATERIAL with AGENT 1. AGENT 1 will setup the discussiona dn you will given access tthe full (SOURCE MATERIAL) and discussion so far in message history. You should:
  
Respond & Share:
- Acknowledge the topic AGENT1 introduces.
- Share your own thoughts and feelings, building on or respectfully challenging Agent 1's points. Consider your own assumptions.

Contribute:
- Don't just take Agent 0's word, aim to steelman and adjust the argument.
- Clearly state where you feel it is weak and what can be done to improve.
- State if you think there is another angle that could be taken.
- If a line of enquiry is a dead end shut it down.

Discuss & Deepen:
- Listen carefully to Agent 1. Ask clarifying questions and questions that challenge their reasoning or explore alternatives.  

Mindset: Be curious, analytical, and open to different perspectives. Aim for a thorough understanding, and exploration of the point.

---- YOUR PERSONA ----

You are **Referee**, a firm but civil analyst whose job is to keep discussion rigorous and on-scope.

• Big-Five aspects: Compassion ≈ 25th percentile (task-centred); Politeness ≈ 65th percentile (courteous but unapologetically direct).  
• Tone: concise, analytical, impartial; speaks in first-person plural for shared ownership ("Lets verify…").

BEHAVIOUR RULES
1. **Scope Guard** Before replying, state the current goal in one sentence; flag anything off-track.  
2. **Critical Questions** Challenge ideas via criteria not identity—e.g., "Which metric shows this works?"  
3. **Structured Summaries** Present findings in numbered lists; tag open issues and assign clear next steps.  
4. **Time-Checks** Every N exchanges (configurable), post a brief progress audit and suggest course-corrections.  
5. **Civility Buffer** Always pair critique with a rationale ("to save rework later") and invite counter-evidence.

FAIL CONDITIONS  
• Personal attacks or sarcasm.  
• Rejecting novel ideas without offering a refinement path.
`,
        provider: "openrouter",
        model: "x-ai/grok-4",
        callType: "chat",
        type: "completion",
        temperature: 0.8,
        debugPrefix: "[DialogueAg2]",
        includeDateContext: true,
      };

      migratedCallDetails = agentLoader(
        config,
        testMessage,
        testContext,
        testHistory
      );

      validateCallDetailsStructure(originalCallDetails, "DialogueAg2");
      validateCallDetailsStructure(
        migratedCallDetails,
        "DialogueAg2 (migrated)"
      );

      const normalizedOriginal = normalizeCallDetails(originalCallDetails);
      const normalizedMigrated = normalizeCallDetails(migratedCallDetails);

      expect(normalizedMigrated).toEqual(normalizedOriginal);
    });
  });

  describe("facilitator Migration", () => {
    let originalCallDetails;
    let migratedCallDetails;

    beforeAll(async () => {
      originalCallDetails = await facilitator(
        testMessage,
        testContext,
        testHistory
      );
    });

    test("should maintain identical structure after migration", async () => {
      const config = {
        systemPrompt: `You are a conversation facilitator.     Your role is to observe and adjust the direction of two agents who are having a discussion. They will be given source material and a discussion topic to kick off then they will conduct a dialogue about the topic. 

They have a habit of agreeing with each other and alway jumping on the newest idea. your job is to keep them on track. Review the conversation history assess the current thrust of the discussion and make a call wether to bring them back to an earlier thread that may have been abandoned. 

For example they may have started with idea 1, moved to 2, then 3. But in your view idea 2 was the most promising. Here you should be direct and respond as a senior facilitator and b clear that the conversation should explore topic 2 (if that is the best option). Interjectas though this is a real conversation. 

If you think the team are going well, provide positive encouragement and let them carry on.`,
        provider: "openrouter",
        model: "anthropic/claude-sonnet-4",
        callType: "chat",
        type: "completion",
        temperature: 0.8,
        debugPrefix: "[Facilitator]",
        includeDateContext: true,
      };

      migratedCallDetails = agentLoader(
        config,
        testMessage,
        testContext,
        testHistory
      );

      validateCallDetailsStructure(originalCallDetails, "facilitator");
      validateCallDetailsStructure(
        migratedCallDetails,
        "facilitator (migrated)"
      );

      const normalizedOriginal = normalizeCallDetails(originalCallDetails);
      const normalizedMigrated = normalizeCallDetails(migratedCallDetails);

      expect(normalizedMigrated).toEqual(normalizedOriginal);
    });
  });

  describe("summariseConversation Migration", () => {
    let originalCallDetails;
    let migratedCallDetails;

    beforeAll(async () => {
      originalCallDetails = await summariseConversation(
        testMessage,
        testContext,
        testHistory
      );
    });

    test("should maintain identical structure after migration", async () => {
      const config = {
        systemPrompt: originalCallDetails.chat.systemPrompt,
        provider: "openrouter",
        model: "anthropic/claude-sonnet-4",
        callType: "chat",
        type: "completion",
        temperature: 0.8,
        debugPrefix: "[SummariseConversation]",
        includeDateContext: true,
      };

      migratedCallDetails = agentLoader(
        config,
        testMessage,
        testContext,
        testHistory
      );

      validateCallDetailsStructure(
        originalCallDetails,
        "summariseConversation"
      );
      validateCallDetailsStructure(
        migratedCallDetails,
        "summariseConversation (migrated)"
      );

      const normalizedOriginal = normalizeCallDetails(originalCallDetails);
      const normalizedMigrated = normalizeCallDetails(migratedCallDetails);

      expect(normalizedMigrated).toEqual(normalizedOriginal);
    });
  });

  describe("Cross-Agent Consistency", () => {
    test("all dialogue agents should use consistent debug prefix", async () => {
      const agents = [
        {
          name: "DialogueAg1",
          fn: DialogueAg1,
          expectedPrefix: "[DialogueAg1]",
        },
        {
          name: "DialogueAg2",
          fn: DialogueAg2,
          expectedPrefix: "[DialogueAg2]",
        },
        {
          name: "facilitator",
          fn: facilitator,
          expectedPrefix: "[Facilitator]",
        },
        {
          name: "summariseConversation",
          fn: summariseConversation,
          expectedPrefix: "[SummariseConversation]",
        },
      ];

      // Capture console.log calls to verify debug prefix
      const originalConsoleLog = console.log;
      const logCalls = [];
      console.log = (...args) => {
        logCalls.push(args);
        originalConsoleLog(...args);
      };

      try {
        for (const agent of agents) {
          logCalls.length = 0; // Clear previous calls
          await agent.fn(testMessage, testContext, testHistory);

          // Check that debug logs use the correct prefix for each agent
          const debugLogs = logCalls.filter(
            (call) =>
              call[0] && call[0].includes(`${agent.expectedPrefix} DEBUG`)
          );
          expect(debugLogs.length).toBeGreaterThan(0);
        }
      } finally {
        console.log = originalConsoleLog;
      }
    });

    test("all dialogue agents should include date context", async () => {
      const agents = [
        DialogueAg1,
        DialogueAg2,
        facilitator,
        summariseConversation,
      ];

      for (const agent of agents) {
        const callDetails = await agent(testMessage, testContext, testHistory);
        expect(callDetails.chat.messageContext).toContain("The date today is:");
      }
    });

    test("all dialogue agents should use openrouter provider", async () => {
      const agents = [
        DialogueAg1,
        DialogueAg2,
        facilitator,
        summariseConversation,
      ];

      for (const agent of agents) {
        const callDetails = await agent(testMessage, testContext, testHistory);
        expect(callDetails.model.provider).toBe("openrouter");
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle special characters in messages", async () => {
      const specialMessage =
        'Test with "quotes", \\backslashes\\, \n newlines, and \t tabs';

      const originalResult = await DialogueAg1(
        specialMessage,
        testContext,
        testHistory
      );

      const config = {
        systemPrompt: originalResult.chat.systemPrompt,
        provider: "openrouter",
        model: "x-ai/grok-4",
        callType: "chat",
        type: "completion",
        temperature: 0.8,
        debugPrefix: "[ConversationAgent]",
        includeDateContext: true,
      };

      const migratedResult = agentLoader(
        config,
        specialMessage,
        testContext,
        testHistory
      );

      expect(migratedResult.chat.userPrompt).toBe(
        originalResult.chat.userPrompt
      );
    });

    test("should handle empty context and history", async () => {
      const emptyContext = "";
      const emptyHistory = [];

      const originalResult = await DialogueAg1(
        testMessage,
        emptyContext,
        emptyHistory
      );

      const config = {
        systemPrompt: originalResult.chat.systemPrompt,
        provider: "openrouter",
        model: "x-ai/grok-4",
        callType: "chat",
        type: "completion",
        temperature: 0.8,
        debugPrefix: "[ConversationAgent]",
        includeDateContext: true,
      };

      const migratedResult = agentLoader(
        config,
        testMessage,
        emptyContext,
        emptyHistory
      );

      const normalizedOriginal = normalizeCallDetails(originalResult);
      const normalizedMigrated = normalizeCallDetails(migratedResult);

      expect(normalizedMigrated).toEqual(normalizedOriginal);
    });
  });
});
