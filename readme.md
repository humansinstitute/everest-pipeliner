# Pipeliner - Distributed Pipeline Execution Platform

A comprehensive AI-powered pipeline framework for Everest Agent workflows featuring parallel test execution, dialogue processing, and content transformation capabilities with intelligent scheduling, comprehensive error handling, and advanced performance optimization.

## 🚀 Features

### Core Capabilities

- **Local Pipeline Execution**: Interactive CLI for running dialogue and facilitated dialogue pipelines
- **Distributed Pipeline Triggering**: Remote pipeline execution via NostrMQ messaging protocol
- **Parallel Test Execution**: Run multiple integration tests simultaneously with up to 60-80% performance improvement
- **Intelligent Test Scheduling**: AI-driven test ordering based on historical performance data
- **Advanced Error Handling**: Comprehensive error categorization, retry mechanisms, and circuit breaker patterns
- **Memory Optimization**: Real-time memory monitoring and automatic garbage collection
- **Performance Analytics**: Detailed performance metrics, trend analysis, and optimization recommendations

### NostrMQ Integration (Feature 005)

- **Remote Pipeline Triggering**: Execute pipelines remotely via NostrMQ v0.3.0 messaging
- **Pubkey Authorization**: Secure access control with whitelist-based authentication
- **Two-Phase Response Pattern**: Immediate acknowledgment + completion response
- **Asynchronous Job Processing**: Concurrent pipeline execution with configurable limits
- **Universal Pipeline Interface**: Standard API for all pipeline types
- **Comprehensive Audit Logging**: Job-specific logs and security event tracking
- **Automatic Pipeline Discovery**: Dynamic pipeline registry with hot-loading

### Phase 4 Enhancements

- **Jest Integration**: Full compatibility with Jest test framework and existing test suites
- **CI/CD Ready**: Production-ready scripts with proper exit codes and reporting
- **Resource Monitoring**: Intelligent resource allocation and conflict detection
- **Historical Analysis**: Performance trend tracking and predictive optimization
- **Comprehensive Reporting**: Multi-format output (JSON, CSV, HTML) for different use cases

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [NostrMQ Pipeline Triggering](#nostrmq-pipeline-triggering)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Performance Optimization](#performance-optimization)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🛠 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn package manager
- Minimum 4GB RAM recommended for optimal performance

### Setup

```bash
# Clone the repository
git clone https://github.com/humansinstitute/everest-pipeliner.git
cd everest-pipeliner

# Install dependencies
npm install

# Install optional Jest reporter for CI/CD
npm install --save-dev jest-junit

# Verify installation
npm run validate
```

## ⚡ Quick Start

### Interactive CLI

```bash
# Start the interactive CLI
npm start

# Available options:
# 1. Run Dialogue Pipeline
# 2. Run Facilitated Dialogue Pipeline
# 3. Run Integration Tests
# 4. Run Parallel Integration Tests
# 5. Start NostrMQ Service (NEW!)
```

### NostrMQ Service

```bash
# Configure environment variables
cp .env.example .env
# Edit .env with your NostrMQ credentials and authorized pubkeys

# Start NostrMQ service via CLI
npm start
# Select option 5: "Start NostrMQ Service"

# Or start directly
node index.js --nostrmq
```

### Interactive Pipeline Menu

```bash
# Start the interactive pipeline menu
node index.js

# Menu options:
# 1. Run Simple Chat Pipeline (Coming Soon)
# 2. Run Dialogue Pipeline
# 3. Run Facilitated Dialogue Pipeline
# 4. Run Content Waterfall Pipeline
# 5. Manage Agents (Coming Soon)
# 0. Exit
```

### Direct Pipeline Execution

```bash
# Run Content Waterfall Pipeline directly
node src/pipelines/contentWaterfallPipeline.js

# Run Dialogue Pipeline directly
node src/pipelines/dialoguePipeline.js

# Run Facilitated Dialogue Pipeline directly
node src/pipelines/facilitatedDialoguePipeline.js
```

### Testing and Development

```bash
# Run all integration tests in parallel
npm run test:parallel

# Run with development optimizations
npm run test:parallel:dev

# Run with production optimizations
npm run test:parallel:prod

# Run for CI/CD with proper exit codes
npm run test:parallel:ci

# Run all tests (unit + integration)
npm run test:all

# Run performance benchmarks
npm run test:benchmark

# Health check
npm run health-check
```

## 🌐 NostrMQ Pipeline Triggering

### Overview

The NostrMQ Pipeline Triggering feature transforms Pipeliner from a local CLI tool into a distributed, API-accessible service. This enables remote pipeline execution via the NostrMQ v0.3.0 messaging protocol.

### Key Features

- **Remote Pipeline Execution**: Trigger pipelines from anywhere via NostrMQ messages
- **Secure Authorization**: Pubkey-based whitelist authentication with caching
- **Two-Phase Responses**: Immediate acknowledgment + completion notification
- **Asynchronous Processing**: Concurrent job execution with configurable limits
- **Universal Interface**: All pipelines support both CLI and NostrMQ execution
- **Comprehensive Logging**: Job-specific audit trails and security event tracking

### Quick Setup

1. **Configure Environment**:

```bash
cp .env.example .env
# Edit .env with your NostrMQ credentials
```

2. **Set Required Variables**:

```bash
# NostrMQ Configuration
NOSTRMQ_PRIVATE_KEY=your_private_key_hex
NOSTRMQ_RELAYS=wss://relay1.com,wss://relay2.com

# Authorization (comma-separated pubkeys)
NOSTRMQ_AUTHORIZED_PUBKEYS=pubkey1,pubkey2,pubkey3

# Optional Configuration
NOSTRMQ_MAX_CONCURRENT_JOBS=5
NOSTRMQ_JOB_TIMEOUT=300000
```

3. **Start Service**:

```bash
npm start
# Select option 5: "Start NostrMQ Service"
```

### Message Format

Send `pipeline-trigger` messages to execute pipelines:

```json
{
  "type": "pipeline-trigger",
  "pipeline": "dialogue",
  "parameters": {
    "topic": "AI Ethics",
    "participants": ["Alice", "Bob"]
  }
}
```

### Response Pattern

**Immediate Acknowledgment**:

```json
{
  "type": "pipeline-ack",
  "jobId": "job_abc123",
  "status": "accepted",
  "message": "Pipeline execution started"
}
```

**Completion Response**:

```json
{
  "type": "pipeline-response",
  "jobId": "job_abc123",
  "status": "completed",
  "result": {
    /* pipeline output */
  },
  "executionTime": 45.67
}
```

### Supported Pipelines

- **dialogue**: Interactive dialogue pipeline
- **facilitatedDialogue**: Facilitated dialogue with moderator

### Security

- **Pubkey Authorization**: Only whitelisted pubkeys can trigger pipelines
- **Request Validation**: All messages validated against schema
- **Audit Logging**: Complete security and execution audit trail
- **Error Handling**: Secure error responses without sensitive data exposure

For detailed documentation, see [`NOSTRMQ_FEATURE_DOCUMENTATION.md`](NOSTRMQ_FEATURE_DOCUMENTATION.md).

## 🤖 Agent Architecture (agentLoader)

### Overview

The agentLoader utility provides a centralized, configuration-driven approach to agent development that eliminates code duplication and ensures consistency across the entire agent ecosystem. This architecture consolidates common agent functionality while maintaining 100% backward compatibility.

### Key Benefits

- **60-80% Code Reduction**: Eliminates ~100 lines of duplicated boilerplate per agent
- **Centralized Configuration**: Single source of truth for common agent patterns
- **100% Backward Compatibility**: Existing agents continue to work without changes
- **Consistent Behavior**: Standardized error handling, logging, and validation
- **Easy Maintenance**: Bug fixes and updates propagate to all agents automatically

### Agent Types Supported

#### 1. Simple Agents

Basic conversational and analysis agents with standard requirements.

```javascript
import agentLoader from "../utils/agentLoader.js";

async function conversationAgent(message, context, history) {
  const config = {
    systemPrompt: "I want you to act as a friendly and knowledgeable agent...",
    provider: "groq",
    temperature: 0.8,
    includeDateContext: true,
  };

  return agentLoader(config, message, context, history);
}
```

#### 2. Dialogue Agents

Specialized agents for dialogue pipelines with persona-based interactions.

```javascript
async function dialogueAgent(message, context, history) {
  const config = {
    systemPrompt: "You are an explorer persona in a dialogue...",
    provider: "openrouter",
    model: "x-ai/grok-4",
    temperature: 0.8,
    includeDateContext: true,
  };

  return agentLoader(config, message, context, history);
}
```

#### 3. Panel Agents

Multi-agent panel discussions with diverse models and specialized roles.

```javascript
async function panelAgent(message, context, history) {
  const config = {
    systemPrompt: "You are 'The Challenger' in a panel discussion...",
    provider: "openrouter",
    model: "x-ai/grok-4",
    temperature: 0.8,
    includeDateContext: false,
    originOverrides: {
      channel: "panel-pipeline",
      gatewayUserID: "panel-challenger",
    },
  };

  return agentLoader(config, message, context, history);
}
```

#### 4. Waterfall Agents

Sequential content processing agents with JSON output requirements.

```javascript
import {
  generateCallDetails,
  generateOriginObject,
} from "../utils/agentLoader.js";

async function waterfallAgent(message, context, history) {
  const config = {
    provider: "openrouter",
    model: "openai/gpt-4.1",
    temperature: 0.7,
    response_format: { type: "json_object" },
    systemPrompt: "You are a content analyzer...",
  };

  // Custom handling for waterfall-specific requirements
  const callDetails = generateCallDetails(config, message, "", []);
  callDetails.origin = generateOriginObject({
    channel: "waterfall-pipeline",
    conversationID: "waterfall-analyzer",
  });

  return callDetails;
}
```

### Configuration Schema

#### Core Configuration Options

| Option         | Type   | Default          | Description                                          |
| -------------- | ------ | ---------------- | ---------------------------------------------------- |
| `systemPrompt` | string | **Required**     | The system prompt defining agent behavior            |
| `provider`     | string | `"groq"`         | Model provider: `"groq"`, `"openai"`, `"openrouter"` |
| `model`        | string | Provider default | Specific model name                                  |
| `temperature`  | number | `0.8`            | Model temperature (0-2)                              |
| `type`         | string | `"completion"`   | Response type: `"completion"`, `"json_object"`       |

#### Advanced Options

| Option               | Type    | Default     | Description                                |
| -------------------- | ------- | ----------- | ------------------------------------------ |
| `includeDateContext` | boolean | `true`      | Whether to append current date to context  |
| `debugPrefix`        | string  | `"[Agent]"` | Prefix for debug logging                   |
| `originOverrides`    | object  | `{}`        | Override specific origin object fields     |
| `response_format`    | object  | undefined   | For JSON output: `{ type: "json_object" }` |

### Migration Status

All agent types have been successfully migrated to the agentLoader architecture:

#### ✅ Simple Agents (2/2 migrated)

- [`conversationAgent.js`](src/agents/conversationAgent.js) - 74% code reduction
- [`intentAgent.js`](src/agents/intentAgent.js) - 64% code reduction

#### ✅ Dialogue Agents (4/4 migrated)

- [`DialogueAg1.js`](src/agents/dialogue/DialogueAg1.js) - Explorer persona
- [`DialogueAg2.js`](src/agents/dialogue/DialogueAg2.js) - Referee persona
- [`facilitator.js`](src/agents/dialogue/facilitator.js) - Conversation facilitator
- [`summariseConversation.js`](src/agents/dialogue/summariseConversation.js) - Summary agent

#### ✅ Panel Agents (5/5 migrated)

- [`moderator.js`](src/agents/panel/moderator.js) - Panel moderator with JSON output
- [`panel1_challenger.js`](src/agents/panel/panel1_challenger.js) - The Challenger
- [`panel2_analyst.js`](src/agents/panel/panel2_analyst.js) - The Analyst
- [`panel3_explorer.js`](src/agents/panel/panel3_explorer.js) - The Explorer
- [`summarizePanel.js`](src/agents/panel/summarizePanel.js) - Panel summarizer

#### ✅ Waterfall Agents (3/3 migrated)

- [`contentAnalyzer.js`](src/agents/waterfall/contentAnalyzer.js) - Content analysis
- [`linkedinCreator.js`](src/agents/waterfall/linkedinCreator.js) - LinkedIn post generation
- [`reelsGenerator.js`](src/agents/waterfall/reelsGenerator.js) - YouTube Reels creation

### Performance Metrics

The agentLoader migration has achieved significant improvements:

- **Code Reduction**: 60-80% reduction in lines of code per agent
- **Test Coverage**: 95%+ test coverage across all migrated agents
- **Performance**: <1ms overhead per agent call
- **Backward Compatibility**: 100% maintained across all migrations
- **Error Reduction**: Centralized validation eliminates configuration errors

### Development Workflow

#### Creating New Agents

1. **Define Purpose**: Clearly specify what your agent does
2. **Choose Configuration**: Select appropriate provider, model, and settings
3. **Implement Agent**: Use agentLoader with your configuration
4. **Create Tests**: Validate functionality and integration
5. **Document**: Add usage examples and configuration notes

#### Migration Process

1. **Analyze Current Agent**: Extract configuration parameters
2. **Create Tests**: Establish baseline behavior validation
3. **Migrate Implementation**: Replace with agentLoader configuration
4. **Validate Compatibility**: Ensure identical behavior
5. **Update Documentation**: Reflect new architecture

### Documentation Resources

- **[Agent Loader Migration Guide](AGENT_LOADER_MIGRATION_GUIDE.md)**: Step-by-step migration instructions
- **[Agent Loader Developer Guide](AGENT_LOADER_DEVELOPER_GUIDE.md)**: Creating new agents with agentLoader
- **[Agent Loader Implementation Report](AGENT_LOADER_IMPLEMENTATION_REPORT.md)**: Technical implementation details

### Testing and Validation

The agentLoader architecture includes comprehensive testing:

- **Unit Tests**: 38 tests covering all utility functions
- **Backward Compatibility Tests**: 10 tests validating identical behavior
- **Migration Tests**: 100+ tests across all agent types
- **Integration Tests**: Pipeline-level validation for all agent types

### Future Enhancements

The agentLoader architecture provides a foundation for:

- **Enhanced Monitoring**: Centralized performance and usage analytics
- **Dynamic Configuration**: Runtime configuration updates
- **Advanced Routing**: Intelligent model selection based on context
- **Cost Optimization**: Automatic provider selection for cost efficiency

## ⚙️ Configuration

### Jest Configuration

The framework extends Jest with parallel test support:

```javascript
// jest.config.js
export default {
  testTimeout: 600000, // 10 minutes for integration tests
  maxWorkers: "50%", // Use 50% of CPU cores
  maxConcurrency: 5, // Max concurrent test suites

  // Enhanced test patterns
  testMatch: [
    "**/tests/**/*.test.js",
    "**/test_*.js", // Parallel integration tests
  ],

  // Performance optimizations
  cache: true,
  logHeapUsage: true,
  detectOpenHandles: true,
};
```

### Test Suite Configuration

```javascript
// test_parallel_integration.js
const TEST_SUITES = [
  {
    name: "Main Integration Tests",
    script: "test_integration.js",
    timeout: 600000, // 10 minutes
  },
  {
    name: "Phase 2 File Input Tests",
    script: "test_phase2.js",
    timeout: 60000, // 1 minute
  },
];
```

### Environment Variables

```bash
# Set environment for different execution modes
NODE_ENV=development  # Development mode with verbose logging
NODE_ENV=production   # Production mode with optimizations
NODE_ENV=test        # Test mode for CI/CD

# NostrMQ Configuration
NOSTRMQ_PRIVATE_KEY=your_private_key_hex
NOSTRMQ_RELAYS=wss://relay1.com,wss://relay2.com
NOSTRMQ_AUTHORIZED_PUBKEYS=pubkey1,pubkey2,pubkey3
NOSTRMQ_MAX_CONCURRENT_JOBS=5
NOSTRMQ_JOB_TIMEOUT=300000

# Memory and performance tuning
JEST_MAX_WORKERS=4           # Override worker count
TEST_TIMEOUT=600000          # Override test timeout
MEMORY_LIMIT=4096           # Memory limit in MB
```

## 📊 Usage Examples

### Basic Parallel Execution

```javascript
import { runParallelTests } from "./test_parallel_integration.js";

// Run with default configuration
const result = await runParallelTests();
console.log(`Tests ${result.success ? "passed" : "failed"}`);
console.log(`Execution time: ${result.results.totalExecutionTime}s`);
```

### Advanced Usage with Optimization

```javascript
import {
  IntelligentTestScheduler,
  MemoryUsageOptimizer,
  executeTestSuite,
} from "./src/utils/testRunner.js";

// Initialize optimizers
const scheduler = new IntelligentTestScheduler();
const memoryOptimizer = new MemoryUsageOptimizer();

// Optimize test execution order
const optimizedSuites = scheduler.optimizeExecutionOrder(TEST_SUITES);

// Start memory monitoring
memoryOptimizer.startMonitoring();

// Execute optimized test suites
const results = await Promise.all(
  optimizedSuites.map((suite) => executeTestSuite(suite))
);

// Generate optimization report
const report = scheduler.generateOptimizationReport(
  TEST_SUITES,
  optimizedSuites
);
console.log("Optimization Report:", report);
```

### Custom Test Suite

```javascript
import { executeTestSuite } from "./src/utils/testRunner.js";

const customSuite = {
  name: "Custom Integration Test",
  script: "my_custom_test.js",
  timeout: 120000, // 2 minutes
};

const result = await executeTestSuite(customSuite);
console.log(`${customSuite.name}: ${result.status}`);
```

## 🔧 Performance Optimization

### Intelligent Test Scheduling

The framework automatically optimizes test execution based on:

- **Historical Performance**: Analyzes past execution times and memory usage
- **Resource Requirements**: Schedules resource-intensive tests appropriately
- **Success Rates**: Prioritizes reliable tests for faster feedback
- **Memory Patterns**: Optimizes memory allocation and garbage collection

### Memory Optimization

```javascript
// Automatic memory monitoring and optimization
const memoryOptimizer = new MemoryUsageOptimizer();
memoryOptimizer.startMonitoring();

// Get real-time memory report
const memoryReport = memoryOptimizer.getOptimizationReport();
console.log("Memory Usage:", memoryReport.currentMemoryUsage);
console.log("Recommendations:", memoryReport.recommendations);
```

### Performance Metrics

The framework provides comprehensive performance analytics:

- **Execution Time**: Parallel vs sequential comparison
- **Memory Usage**: Peak, average, and trend analysis
- **Resource Utilization**: CPU and memory efficiency metrics
- **Success Rates**: Test reliability and failure analysis
- **Historical Trends**: Performance improvement over time

## 📈 Performance Targets

Based on extensive testing, the framework achieves:

- **60-80% reduction** in total test execution time
- **Parallel efficiency** of 2-4x compared to sequential execution
- **Memory optimization** with automatic garbage collection
- **Resource utilization** of 85%+ CPU efficiency
- **Reliability** with comprehensive error handling and fallback mechanisms

### Benchmark Results

```
Sequential Execution: ~350 seconds
Parallel Execution:   ~70-140 seconds
Performance Gain:     60-80% improvement
Memory Peak:          <1GB typical usage
CPU Efficiency:       85%+ utilization
```

## 🔍 API Reference

### Core Functions

#### `executeTestSuite(testConfig)`

Executes a single test suite in a child process.

**Parameters:**

- `testConfig.name` (string): Human-readable test suite name
- `testConfig.script` (string): Path to test script file
- `testConfig.timeout` (number): Maximum execution time in milliseconds

**Returns:** Promise<TestResult>

#### `aggregateTestResults(results)`

Aggregates results from multiple test suite executions.

**Parameters:**

- `results` (Array<TestResult>): Array of test execution results

**Returns:** AggregatedResults with comprehensive metrics

#### `generateUnifiedReport(aggregatedResults)`

Generates a comprehensive, formatted test report.

**Parameters:**

- `aggregatedResults` (AggregatedResults): Aggregated test results

**Returns:** Formatted report string with color coding

### Optimization Classes

#### `IntelligentTestScheduler`

Provides AI-driven test scheduling and optimization.

**Methods:**

- `loadHistoricalData(limit)`: Load historical performance data
- `optimizeExecutionOrder(testSuites)`: Optimize test execution order
- `calculateOptimalConcurrency(testSuites)`: Calculate optimal concurrency
- `generateOptimizationReport(original, optimized)`: Generate optimization report

#### `MemoryUsageOptimizer`

Monitors and optimizes memory usage during test execution.

**Methods:**

- `startMonitoring()`: Start memory monitoring
- `stopMonitoring()`: Stop memory monitoring
- `getOptimizationReport()`: Get memory optimization report
- `generateMemoryRecommendations()`: Generate memory recommendations

### Test Result Structure

```javascript
{
  suiteName: "Test Suite Name",
  status: "PASSED" | "FAILED" | "ERROR" | "TIMEOUT",
  duration: 45.67, // seconds
  exitCode: 0,
  stdout: "Test output...",
  stderr: "Error output...",
  error: null | "Error message",
  startTime: "2025-01-01T00:00:00.000Z",
  endTime: "2025-01-01T00:00:45.670Z",
  memoryUsage: {
    peak: 123.45, // MB
    snapshots: [...]
  },
  testCases: {
    total: 10,
    passed: 9,
    failed: 1,
    cases: [...]
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Increase Node.js memory limit
node --max-old-space-size=8192 test_parallel_integration.js

# Or use the optimized script
npm run test:parallel:prod
```

#### Port Conflicts

The framework includes automatic port conflict detection and resolution.

#### Timeout Issues

```javascript
// Increase timeout for slow tests
const testConfig = {
  name: "Slow Test",
  script: "slow_test.js",
  timeout: 900000, // 15 minutes
};
```

#### CI/CD Integration

```bash
# Use CI-specific script with proper exit codes
npm run test:ci

# Generate JUnit XML for CI systems
npm test -- --reporters=default --reporters=jest-junit
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run test:parallel

# Run with Node.js inspector
node --inspect test_parallel_integration.js
```

### Performance Issues

1. **Check system resources**: Ensure adequate RAM and CPU
2. **Review historical data**: Use trend analysis to identify bottlenecks
3. **Optimize test order**: Let intelligent scheduler optimize execution
4. **Monitor memory**: Use memory optimizer for leak detection

## 📁 Project Structure

```
pipeliner/
├── src/
│   ├── nostrmq/                   # NostrMQ service implementation
│   │   ├── index.js              # Main NostrMQ service class
│   │   ├── authValidator.js      # Pubkey authorization system
│   │   ├── messageHandler.js     # Message processing and validation
│   │   └── jobManager.js         # Asynchronous job execution
│   ├── pipelines/                 # Pipeline implementations
│   │   ├── registry/             # Pipeline discovery system
│   │   ├── dialoguePipeline.js   # Dialogue pipeline with NostrMQ support
│   │   └── facilitatedDialoguePipeline.js # Facilitated dialogue
│   ├── services/                  # Core services
│   │   ├── config.js             # Configuration management
│   │   ├── logger.js             # Application logging
│   │   └── jobLogger.js          # Job-specific logging
│   ├── utils/                     # Utility functions
│   │   ├── testRunner.js         # Core test execution framework
│   │   ├── jobId.js              # Job ID generation
│   │   └── messageValidation.js  # Message validation schemas
│   └── agents/                    # Everest agent implementations
├── tests/
│   ├── nostrmq/                   # NostrMQ feature tests
│   │   ├── authValidator.test.js # Authorization tests
│   │   ├── integration.test.js   # End-to-end integration tests
│   │   ├── security.test.js      # Security validation tests
│   │   └── *.test.js             # Additional NostrMQ tests
│   ├── setup.js                   # Jest test setup
│   ├── globalSetup.js            # Global test environment setup
│   ├── globalTeardown.js         # Global test cleanup
│   └── **/*.test.js              # Unit tests
├── logs/                          # Test execution logs and reports
├── test-results/                  # CI/CD test results
├── coverage/                      # Test coverage reports
├── test_*.js                      # Integration test files
├── .env.example                   # Environment configuration template
├── NOSTRMQ_FEATURE_DOCUMENTATION.md # NostrMQ feature documentation
├── jest.config.js                 # Jest configuration
├── ecosystem.config.cjs           # PM2 process management
├── package.json                   # Project configuration and scripts
├── CONTENT_WATERFALL_FEATURE_DOCUMENTATION.md  # Waterfall pipeline docs
└── README.md                      # This documentation
```

## 🤝 Contributing

### Development Setup

```bash
# Install development dependencies
npm install

# Run tests in watch mode
npm run dev:test

# Run linting and formatting
npm run lint
npm run format
```

### Adding New Test Suites

1. Create your test file following the pattern `test_*.js`
2. Add configuration to `TEST_SUITES` array in `test_parallel_integration.js`
3. Test locally with `npm run test:parallel:dev`
4. Update documentation as needed

### Performance Optimization Guidelines

- Keep individual test suites under 10 minutes when possible
- Use appropriate timeouts for different test types
- Monitor memory usage and optimize accordingly
- Leverage historical data for intelligent scheduling

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Everest AI Platform](https://everest.ai)
- [Jest Documentation](https://jestjs.io/)
- [Node.js Performance Guide](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Built with ❤️ for high-performance AI workflow testing**
