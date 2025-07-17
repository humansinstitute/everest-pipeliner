# Moderated Panel Pipeline - Feature Documentation

## 1. Feature Overview

### 1.1 Description

The Moderated Panel Pipeline is an advanced AI-powered conversation orchestration system that simulates a structured panel discussion with four distinct agents. It features a sophisticated moderator that controls conversation flow and three specialized panel members with unique personalities, creating dynamic and engaging discussions around any given topic.

### 1.2 Purpose and Use Cases

**Primary Purpose**: Generate rich, multi-perspective discussions on complex topics through intelligent agent orchestration and flow control.

**Key Use Cases**:

- **Content Analysis**: Deep exploration of articles, research papers, or thought leadership pieces
- **Strategic Planning**: Multi-angle analysis of business decisions and strategic initiatives
- **Educational Content**: Creating diverse perspectives on educational topics for training materials
- **Research Validation**: Testing ideas against different analytical approaches and viewpoints
- **Content Creation**: Generating rich discussion content for podcasts, articles, or presentations
- **Decision Support**: Exploring complex decisions from multiple expert perspectives

### 1.3 Key Benefits and Capabilities

- **Intelligent Flow Control**: AI moderator dynamically selects speakers based on conversation context
- **Distinct Agent Personalities**: Three specialized panel members with unique analytical approaches
- **Balanced Participation**: Automatic tracking and balancing of speaker contributions
- **Flexible Configuration**: Adjustable interaction counts (2-15) and customizable summary focus
- **Robust JSON Parsing**: Fallback mechanisms ensure conversation continuity even with parsing errors
- **Comprehensive Output**: Full conversation transcripts, moderator decisions, and participation statistics
- **Cost Tracking**: Detailed API call monitoring and cost analysis
- **File Organization**: Structured output with conversation, summary, and metadata files

### 1.4 Integration with Existing Pipeliner System

The Moderated Panel Pipeline seamlessly integrates with the existing pipeliner architecture:

- **CLI Integration**: Accessible via main menu option 7 in the pipeliner interface
- **MCP Server Integration**: Available as a tool through the MCP server for external applications
- **File System Integration**: Uses standardized `output/panel/` directory structure
- **Agent Framework**: Built on the same agent loading and execution system as other pipelines
- **Cost Tracking**: Integrated with existing pipeline cost monitoring and reporting
- **Error Handling**: Follows established error handling patterns and logging standards
- **Testing Framework**: Comprehensive test suite using the same Jest framework as other pipelines

## 2. Technical Architecture

### 2.1 Pipeline Flow Diagram (Text-based)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODERATED PANEL PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘

INPUT STAGE
┌─────────────────┐    ┌─────────────────┐
│   Source Text   │    │ Discussion      │
│   (Required)    │ +  │ Subject         │
│                 │    │ (Required)      │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   Configuration │
            │   Validation    │
            └─────────┬───────┘
                      │
                      ▼

AGENT ORCHESTRATION STAGE
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   MODERATOR     │    │   PANEL MEMBER  │    │   MODERATOR     │        │
│  │   Setup & Flow  │───▶│   Response      │───▶│   Next Speaker  │        │
│  │   Control       │    │                 │    │   Selection     │        │
│  │                 │    │                 │    │                 │        │
│  │ • Select first  │    │ • Challenger    │    │ • Analyze flow  │        │
│  │   speaker       │    │ • Analyst       │    │ • Balance       │        │
│  │ • Set prompt    │    │ • Explorer      │    │   participation │        │
│  │ • Guide flow    │    │                 │    │ • Select next   │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│           │                       │                       │                │
│           └───────────────────────┼───────────────────────┘                │
│                                   │                                        │
│                    ┌──────────────▼──────────────┐                        │
│                    │     CONVERSATION LOOP       │                        │
│                    │   (Configurable 2-15 times) │                        │
│                    └─────────────────────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

PANEL MEMBER PERSONALITIES
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   CHALLENGER    │    │    ANALYST      │    │    EXPLORER     │        │
│  │                 │    │                 │    │                 │        │
│  │ • Questions     │    │ • Evidence-     │    │ • Creative      │        │
│  │   assumptions   │    │   based         │    │   solutions     │        │
│  │ • High          │    │ • Balanced      │    │ • Unconventional│        │
│  │   disagreeableness│   │   perspective   │    │   thinking      │        │
│  │ • Devil's       │    │ • Synthesizes   │    │ • Thought       │        │
│  │   advocate      │    │   viewpoints    │    │   experiments   │        │
│  │ • Critical      │    │ • Data-driven   │    │ • Possibility   │        │
│  │   analysis      │    │   insights      │    │   exploration   │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

OUTPUT STAGE
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUMMARY & FILE GENERATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │ Panel Summary   │    │ Conversation    │    │ Moderator       │        │
│  │ Generation      │    │ Transcript      │    │ Decisions       │        │
│  │                 │    │ (Markdown)      │    │ (JSON)          │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                               │
│  │ Participation   │    │ Complete Data   │                               │
│  │ Statistics      │    │ (JSON)          │                               │
│  │                 │    │                 │                               │
│  └─────────────────┘    └─────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

FINAL OUTPUT STRUCTURE
output/panel/YY_MM_DD_HH_MM_SS_ID/
├── conversation.md              # Full panel discussion transcript
├── summary.md                   # Comprehensive discussion summary
├── moderator_decisions.json     # Record of all moderator decisions
└── data.json                    # Complete metadata and raw outputs
```

### 2.2 Agent Specifications and Responsibilities

#### Moderator Agent (`src/agents/panel/moderator.js`)

**Model**: `openai/gpt-4.1` (primary), `anthropic/claude-3-5-sonnet` (fallback)  
**Temperature**: `0.7`  
**Response Format**: `json_object`

**Responsibilities**:

- **Flow Control**: Guides conversation flow and maintains discussion quality
- **Speaker Selection**: Intelligently selects next speaker based on context and balance
- **Conversation Setup**: Provides opening comments and initial speaker selection
- **Transition Management**: Facilitates smooth transitions between speakers
- **Balance Monitoring**: Ensures equitable participation across panel members

**Critical JSON Schema**:

```json
{
  "moderator_comment": "Optional transition or guidance comment",
  "next_speaker": "challenger|analyst|explorer",
  "speaking_prompt": "Specific prompt for the selected speaker",
  "reasoning": "Optional reasoning for speaker selection"
}
```

**Quality Assurance**:

- Robust JSON parsing with fallback mechanisms
- Speaker validation against allowed panel members
- Context-aware speaker selection based on conversation flow
- Automatic error recovery with graceful degradation

#### Panel Member 1: Challenger (`src/agents/panel/panel1_challenger.js`)

**Model**: `x-ai/grok-beta` (primary), `openai/gpt-4.1` (fallback)  
**Temperature**: `0.8`  
**Personality**: High disagreeableness, critical analysis

**Responsibilities**:

- **Assumption Challenging**: Questions underlying assumptions and conventional wisdom
- **Critical Analysis**: Provides rigorous examination of ideas and proposals
- **Devil's Advocate**: Takes contrarian positions to test argument strength
- **Weakness Identification**: Highlights potential flaws and limitations
- **Intellectual Rigor**: Demands evidence and logical consistency

**Approach Characteristics**:

- Direct and confrontational communication style
- Focus on potential problems and risks
- Emphasis on logical consistency and evidence
- Willingness to challenge popular or accepted views

#### Panel Member 2: Analyst (`src/agents/panel/panel2_analyst.js`)

**Model**: `anthropic/claude-3-5-sonnet` (primary), `openai/gpt-4.1` (fallback)  
**Temperature**: `0.6`  
**Personality**: Balanced, evidence-based, systematic

**Responsibilities**:

- **Data Analysis**: Provides evidence-based insights and interpretations
- **Perspective Synthesis**: Integrates different viewpoints into coherent analysis
- **Systematic Breakdown**: Organizes complex topics into manageable components
- **Balanced Assessment**: Offers measured, objective evaluation of ideas
- **Research Integration**: Incorporates relevant data and research findings

**Approach Characteristics**:

- Methodical and structured thinking
- Emphasis on data and evidence
- Balanced consideration of multiple perspectives
- Clear, logical presentation of ideas

#### Panel Member 3: Explorer (`src/agents/panel/panel3_explorer.js`)

**Model**: `openai/gpt-4.1` (primary), `anthropic/claude-3-5-sonnet` (fallback)  
**Temperature**: `0.9`  
**Personality**: Creative, unconventional, possibility-focused

**Responsibilities**:

- **Creative Solutions**: Generates innovative approaches and alternatives
- **Possibility Exploration**: Investigates unconventional ideas and scenarios
- **Thought Experiments**: Proposes hypothetical situations and "what if" scenarios
- **Boundary Pushing**: Challenges conventional limits and explores new territories
- **Future Thinking**: Considers long-term implications and emerging possibilities

**Approach Characteristics**:

- High creativity and openness to new ideas
- Willingness to explore unconventional solutions
- Focus on possibilities rather than limitations
- Imaginative and forward-thinking perspective

#### Summary Agent (`src/agents/panel/summarizePanel.js`)

**Model**: `anthropic/claude-3-5-sonnet` (primary), `openai/gpt-4.1` (fallback)  
**Temperature**: `0.5`  
**Purpose**: Comprehensive discussion synthesis

**Responsibilities**:

- **Key Insight Extraction**: Identifies and highlights main discussion points
- **Perspective Integration**: Synthesizes diverse viewpoints into coherent summary
- **Agreement/Disagreement Analysis**: Maps areas of consensus and conflict
- **Actionable Recommendations**: Extracts practical next steps and recommendations
- **Discussion Quality Assessment**: Evaluates the depth and value of the conversation

### 2.3 File Structure and Organization

```
src/
├── pipelines/
│   └── moderatedPanelPipeline.js           # Main pipeline orchestrator (484 lines)
├── agents/
│   └── panel/
│       ├── moderator.js                    # Flow control agent (114 lines)
│       ├── panel1_challenger.js            # Challenger personality agent
│       ├── panel2_analyst.js               # Analyst personality agent
│       ├── panel3_explorer.js              # Explorer personality agent
│       └── summarizePanel.js               # Discussion summary agent
├── services/
│   ├── everest.service.js                  # API communication service
│   └── agentLoader.service.js              # Agent loading and configuration
└── utils/
    ├── pipelineData.js                     # Pipeline execution tracking
    └── pipelineCost.js                     # Cost monitoring and reporting

output/
└── panel/
    └── YY_MM_DD_HH_MM_SS_ID/              # Timestamped outputs
        ├── conversation.md                 # Full discussion transcript
        ├── summary.md                      # Comprehensive summary
        ├── moderator_decisions.json        # Moderator decision log
        └── data.json                       # Complete metadata

tests/
├── pipelines/
│   ├── moderatedPanelPipeline.test.js      # 25 comprehensive tests
│   └── moderatedPanelPipeline.integration.test.js # 12 integration tests
├── agents/
│   └── panel.test.js                       # 5 agent-specific tests
└── fixtures/
    └── panel/                              # Test content files
        ├── short_content.txt
        ├── medium_content.txt
        ├── technical_content.txt
        └── controversial_topic.txt
```

### 2.4 Integration Points with Existing Systems

#### CLI Integration

- **Menu Option 7**: "Run Moderated Panel Pipeline"
- **Input Collection**: Source text and discussion subject collection
- **Configuration Options**: Panel interactions (2-15), summary focus customization
- **Progress Feedback**: Real-time status updates during execution
- **Result Display**: Comprehensive result summary with file locations

#### MCP Server Integration

- **Tool Registration**: Available as `run_moderated_panel_pipeline` tool
- **Schema Validation**: Automatic input validation and error handling
- **External Access**: Enables integration with external applications and workflows
- **Standardized Interface**: Consistent API for programmatic access

#### File System Integration

- **Output Directory**: `output/panel/` with timestamped subdirectories
- **File Validation**: Automatic validation of file types and accessibility
- **Directory Creation**: Automatic creation of required directory structure
- **Organized Output**: Separate files for conversation, summary, and metadata

#### Agent Framework Integration

- **Agent Loading**: Uses existing `loadAgent()` service for consistent agent management
- **Configuration**: Follows established agent configuration patterns
- **Error Handling**: Integrated with pipeline error handling and logging systems
- **Model Fallbacks**: Automatic fallback to secondary models when primary models fail

#### Cost Tracking Integration

- **Pipeline Costs**: Integrated with existing cost tracking utilities
- **Step-by-step Tracking**: Individual agent costs tracked and reported
- **Summary Reporting**: Cost summaries included in output files and CLI display
- **API Call Monitoring**: Detailed tracking of API usage and efficiency

## 3. API Reference

### 3.1 `moderatedPanelPipeline(config)` Function Documentation

#### Function Signature

```javascript
async function runPipeline(config)
```

#### Parameters

**config** (Object): Configuration object containing pipeline parameters

**Required Properties**:

- `sourceText` (string): Source material text for panel discussion

  - **Validation**: Must be non-empty string after trimming
  - **Usage**: Provides context and content for panel analysis
  - **Recommended Length**: 500-5,000 words for optimal discussion depth

- `discussionSubject` (string): Subject or question for panel discussion
  - **Validation**: Must be non-empty string after trimming
  - **Usage**: Guides panel focus and moderator decisions
  - **Format**: Can be a question, topic, or specific focus area

**Optional Properties**:

- `panelInteractions` (number): Number of panel member responses

  - **Default**: 4
  - **Range**: 2-15 interactions
  - **Usage**: Controls discussion length and depth
  - **Note**: Moderator responses never count toward this limit

- `summaryFocus` (string): Custom focus for summary generation
  - **Default**: "Key insights, diverse perspectives, points of agreement/disagreement, and actionable recommendations from the panel discussion"
  - **Usage**: Guides summary agent on what to emphasize
  - **Examples**: "Focus on practical implementation strategies" or "Emphasize areas of disagreement and debate"

#### Return Value

**Promise<Object>**: Complete pipeline result object

**Success Response Structure**:

```javascript
{
  runId: "pipeline-run-12345",           // Unique pipeline execution ID
  conversation: [                       // Full conversation array
    {
      role: "moderator|challenger|analyst|explorer",
      type: "setup|panel_response|transition",
      content: "Message content",
      timestamp: "2025-01-17T04:08:31Z"
    }
  ],
  summary: "Comprehensive discussion summary...", // Generated summary
  moderatorDecisions: [                 // Array of moderator decisions
    {
      moderator_comment: "Transition comment",
      next_speaker: "challenger",
      speaking_prompt: "Specific prompt",
      reasoning: "Selection reasoning",
      context: "decision_1",
      timestamp: "2025-01-17T04:08:31Z"
    }
  ],
  panelStats: {                         // Participation statistics
    challenger: 2,
    analyst: 1,
    explorer: 1
  },
  metadata: {                           // Execution metadata
    panelInteractions: 4,
    summaryFocus: "Custom focus...",
    totalMessages: 9,
    apiCalls: 9,
    actualApiCalls: 9
  },
  pipeline: {                           // Pipeline execution data
    runId: "...",
    status: "completed",
    startTime: "2025-01-17T04:08:31Z",
    endTime: "2025-01-17T04:10:45Z",
    statistics: {
      durationSeconds: 134.2,
      completedSteps: 9,
      totalSteps: 9,
      successRate: 100
    },
    costs: {                            // Cost breakdown by step
      moderator_setup: { total: 0.0045 },
      challenger_interaction_1: { total: 0.0032 },
      // ... additional step costs
    }
  }
}
```

**Error Response Structure**:

```javascript
{
  runId: "pipeline-run-12345",
  error: "Configuration validation failed",
  details: "sourceText is required",
  pipeline: {
    runId: "...",
    status: "failed",
    error: {
      message: "Error details",
      stack: "Error stack trace",
      timestamp: "2025-01-17T04:08:31Z"
    }
  }
}
```

### 3.2 Configuration Object Structure

#### Complete Configuration Schema

```javascript
{
  // Required fields
  sourceText: string,                   // Source material (required, non-empty)
  discussionSubject: string,            // Discussion topic (required, non-empty)

  // Optional fields
  panelInteractions?: number,           // Number of interactions (2-15, default: 4)
  summaryFocus?: string                 // Summary focus (default provided)
}
```

#### Configuration Validation Rules

1. **sourceText**: Required, must be string, cannot be empty after trimming
2. **discussionSubject**: Required, must be string, cannot be empty after trimming
3. **panelInteractions**: Optional, must be number between 2 and 15, defaults to 4
4. **summaryFocus**: Optional, must be string if provided, has comprehensive default

### 3.3 Return Value Specifications

#### Success Indicators

- `error` property is undefined or null
- `pipeline.status` equals "completed"
- `conversation` array contains expected number of messages
- `panelStats` shows balanced participation across panel members

#### Error Indicators

- `error` property contains error message
- `pipeline.status` equals "failed"
- `details` property may contain additional error context
- Partial results may be available depending on failure point

#### Conversation Structure

Each conversation entry contains:

- `role`: Speaker identifier (moderator, challenger, analyst, explorer)
- `type`: Message type (setup, panel_response, transition)
- `content`: Actual message content
- `timestamp`: ISO timestamp of message creation

#### Moderator Decision Structure

Each moderator decision contains:

- `moderator_comment`: Optional transition or guidance comment
- `next_speaker`: Selected panel member (challenger, analyst, explorer)
- `speaking_prompt`: Specific prompt for selected speaker
- `reasoning`: Optional reasoning for selection
- `context`: Decision context identifier
- `timestamp`: ISO timestamp of decision

### 3.4 Error Handling and Status Codes

#### Configuration Errors

- **Error Type**: Validation failure
- **Status**: Pipeline not started
- **Response**: Error object with validation details
- **Recovery**: Fix configuration and retry

#### Agent Execution Errors

- **Error Type**: API call failure or agent error
- **Status**: Pipeline partially completed
- **Response**: Partial results with error details
- **Recovery**: Review agent configuration and retry

#### JSON Parsing Errors

- **Error Type**: Moderator JSON parsing failure
- **Status**: Pipeline continues with fallback
- **Response**: Warning logged, fallback speaker selection used
- **Recovery**: Automatic fallback ensures conversation continuity

#### Network/API Errors

- **Error Type**: Everest API communication failure
- **Status**: Pipeline failed at specific agent
- **Response**: Error with details about failed step
- **Recovery**: Check network connectivity and API credentials

## 4. Agent Documentation

### 4.1 Moderator Agent Specifications

#### Technical Configuration

```javascript
{
  model: {
    provider: "openrouter",
    model: "openai/gpt-4.1",
    callType: "chat",
    type: "completion",
    temperature: 0.7,
    response_format: { type: "json_object" }
  }
}
```

#### System Prompt Structure

The Moderator uses a comprehensive system prompt that includes:

- **Role Definition**: Skilled panel moderator facilitating dynamic conversation
- **Panel Member Descriptions**: Clear understanding of each panel member's personality
- **Flow Control Guidelines**: Instructions for speaker selection and conversation guidance
- **JSON Schema Requirements**: Exact format specification for responses
- **Quality Criteria**: Guidelines for maintaining engagement and balance

#### Expected Output Format

```javascript
{
  "moderator_comment": "Optional guidance or transition comment",
  "next_speaker": "challenger|analyst|explorer",
  "speaking_prompt": "Specific prompt for selected speaker",
  "reasoning": "Optional reasoning for speaker selection"
}
```

#### Fallback Mechanisms

- **JSON Parsing Errors**: Automatic fallback to default speaker selection
- **Invalid Speaker**: Validation and correction of speaker names
- **Missing Fields**: Default values provided for required fields
- **Error Recovery**: Graceful degradation maintains conversation flow

### 4.2 Panel Member Agent Specifications

#### Challenger Agent (Panel 1)

**Technical Configuration**:

```javascript
{
  model: {
    provider: "openrouter",
    model: "x-ai/grok-beta",
    fallback: "openai/gpt-4.1",
    temperature: 0.8
  }
}
```

**Personality Traits**:

- High disagreeableness and critical thinking
- Questions assumptions and conventional wisdom
- Plays devil's advocate role effectively
- Focuses on potential problems and limitations
- Direct and confrontational communication style

**System Prompt Focus**:

- Emphasis on critical analysis and assumption challenging
- Instructions to identify weaknesses and potential issues
- Guidance on maintaining intellectual rigor
- Encouragement to take contrarian positions when appropriate

#### Analyst Agent (Panel 2)

**Technical Configuration**:

```javascript
{
  model: {
    provider: "openrouter",
    model: "anthropic/claude-3-5-sonnet",
    fallback: "openai/gpt-4.1",
    temperature: 0.6
  }
}
```

**Personality Traits**:

- Balanced and evidence-based approach
- Systematic breakdown of complex topics
- Integration of multiple perspectives
- Data-driven insights and analysis
- Measured and objective evaluation

**System Prompt Focus**:

- Emphasis on evidence-based reasoning
- Instructions for systematic analysis
- Guidance on perspective synthesis
- Encouragement to provide balanced assessments

#### Explorer Agent (Panel 3)

**Technical Configuration**:

```javascript
{
  model: {
    provider: "openrouter",
    model: "openai/gpt-4.1",
    fallback: "anthropic/claude-3-5-sonnet",
    temperature: 0.9
  }
}
```

**Personality Traits**:

- Creative and unconventional thinking
- Exploration of possibilities and alternatives
- Thought experiments and hypothetical scenarios
- Future-focused and imaginative perspective
- Willingness to challenge conventional boundaries

**System Prompt Focus**:

- Emphasis on creative solution generation
- Instructions for possibility exploration
- Guidance on thought experiment development
- Encouragement to think beyond conventional limits

### 4.3 Summary Agent Specifications

#### Technical Configuration

```javascript
{
  model: {
    provider: "openrouter",
    model: "anthropic/claude-3-5-sonnet",
    fallback: "openai/gpt-4.1",
    temperature: 0.5
  }
}
```

#### Responsibilities

- **Comprehensive Synthesis**: Integrates all panel perspectives into coherent summary
- **Key Insight Extraction**: Identifies and highlights main discussion points
- **Agreement/Disagreement Mapping**: Analyzes areas of consensus and conflict
- **Actionable Recommendations**: Extracts practical next steps and recommendations
- **Quality Assessment**: Evaluates discussion depth and value

#### Summary Structure

- **Executive Summary**: High-level overview of discussion
- **Key Insights**: Main points and discoveries from the panel
- **Perspective Analysis**: How each panel member contributed
- **Areas of Agreement**: Points of consensus among panel members
- **Areas of Disagreement**: Points of debate and differing views
- **Actionable Recommendations**: Practical next steps and suggestions
- **Discussion Quality**: Assessment of conversation depth and value

### 4.4 Model Configurations and Parameters

#### Model Selection Rationale

- **OpenAI GPT-4.1**: Primary model for moderator and explorer due to superior reasoning and creativity
- **Anthropic Claude-3.5-Sonnet**: Primary for analyst and summary due to balanced, analytical approach
- **X-AI Grok-Beta**: Primary for challenger due to contrarian and critical thinking capabilities
- **OpenRouter**: Unified provider for reliable API access and cost optimization

#### Temperature Settings

- **Moderator (0.7)**: Balanced creativity and consistency for flow control decisions
- **Challenger (0.8)**: Higher creativity for contrarian and critical perspectives
- **Analyst (0.6)**: Lower temperature for measured, evidence-based responses
- **Explorer (0.9)**: Highest creativity for unconventional thinking and possibilities
- **Summary (0.5)**: Lowest temperature for objective, comprehensive synthesis

#### Performance Characteristics

- **Response Time**: Typically 10-30 seconds per agent call
- **Token Usage**: Varies by interaction, typically 800-2,500 tokens per call
- **Cost Efficiency**: Optimized model selection balances quality and cost
- **Reliability**: High success rate with comprehensive fallback mechanisms

#### Quality Assurance

- **Model Fallbacks**: Automatic fallback to secondary models when primary fails
- **JSON Validation**: Moderator responses validated for proper structure
- **Content Validation**: Panel responses checked for quality and relevance
- **Error Recovery**: Comprehensive error handling with detailed logging
- **Conversation Continuity**: Fallback mechanisms ensure discussion never stalls

---

_This documentation represents the complete technical and user-facing specification for the Moderated Panel Pipeline feature as implemented in Feature #014 of the project._
