# Pipeliner - AI-Powered Content Pipeline Framework

A comprehensive AI-powered pipeline framework for Everest Agent workflows featuring parallel test execution, dialogue processing, and content transformation capabilities with intelligent scheduling, comprehensive error handling, and advanced performance optimization.

## 🚀 Features

### Core Capabilities

- **Content Waterfall Pipeline**: Transform long-form content into LinkedIn posts and YouTube Reels concepts
- **Dialogue Processing**: AI-powered conversation generation with optional facilitator intervention
- **Parallel Test Execution**: Run multiple integration tests simultaneously with up to 60-80% performance improvement
- **Intelligent Test Scheduling**: AI-driven test ordering based on historical performance data
- **Advanced Error Handling**: Comprehensive error categorization, retry mechanisms, and circuit breaker patterns
- **Memory Optimization**: Real-time memory monitoring and automatic garbage collection
- **Performance Analytics**: Detailed performance metrics, trend analysis, and optimization recommendations

### Phase 4 Enhancements

- **Jest Integration**: Full compatibility with Jest test framework and existing test suites
- **CI/CD Ready**: Production-ready scripts with proper exit codes and reporting
- **Resource Monitoring**: Intelligent resource allocation and conflict detection
- **Historical Analysis**: Performance trend tracking and predictive optimization
- **Comprehensive Reporting**: Multi-format output (JSON, CSV, HTML) for different use cases

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Pipeline Features](#pipeline-features)
  - [Content Waterfall Pipeline](#content-waterfall-pipeline)
  - [Dialogue Pipelines](#dialogue-pipelines)
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

## 🌊 Pipeline Features

### Content Waterfall Pipeline

The Content Waterfall Pipeline transforms long-form content into structured social media outputs through a three-stage AI agent workflow.

#### Overview

- **Input**: Articles, transcripts, interviews, blog posts (1K-10K words optimal)
- **Output**: 4 topics → 4 LinkedIn posts → 8 YouTube Reels concepts
- **Processing Time**: Typically 2-3 minutes for standard content
- **Cost**: ~$0.02-0.05 per pipeline execution

#### Key Features

- **Automated Topic Extraction**: AI-powered analysis extracts 4 distinct, compelling topics
- **LinkedIn Optimization**: Posts follow embedded style guides for maximum professional engagement
- **Video Content Planning**: Detailed Reels concepts with production guidance and visual suggestions
- **Organized Output**: Timestamped directories with individual files for each deliverable

#### Usage Example

```bash
# Start interactive menu
node index.js

# Select option 4: Run Content Waterfall Pipeline
# Choose input method:
#   1. Select from files in output/waterfall/ip/
#   2. Input text directly via CLI
# Optional: Add custom focus areas
# Review generated content in output/waterfall/YY_MM_DD_HH_MM_SS_ID/
```

#### Input Methods

1. **File Input**: Place `.txt` or `.md` files in `output/waterfall/ip/` directory
2. **Direct Input**: Type or paste content directly into CLI (end with `###`)

#### Generated Output Structure

```
output/waterfall/25_01_14_13_45_23_1/
├── topic_extractions.md          # Detailed topic analysis
├── linkedin_posts/               # Individual LinkedIn posts
│   ├── post_1_[topic].md
│   ├── post_2_[topic].md
│   ├── post_3_[topic].md
│   └── post_4_[topic].md
├── reels_concepts/               # Individual Reels concepts
│   ├── concept_1_[type].md
│   ├── concept_2_[type].md
│   ├── ... (8 total)
│   └── concept_8_[type].md
├── summary.md                    # Comprehensive summary
└── data.json                     # Technical metadata
```

#### Agent Workflow

1. **Content Analyzer**: Extracts 4 distinct topics with insights and context
2. **LinkedIn Creator**: Transforms topics into optimized LinkedIn posts with varied approaches
3. **Reels Generator**: Creates 2 YouTube Reels concepts per LinkedIn post with production guidance

### Dialogue Pipelines

#### Standard Dialogue Pipeline

- **Purpose**: Generate AI-powered conversations between two agents on a given topic
- **Input**: Source material + discussion prompt + iteration count
- **Output**: Structured conversation with summary and analysis
- **Use Cases**: Exploring different perspectives, generating discussion content, idea development

#### Facilitated Dialogue Pipeline

- **Purpose**: Enhanced dialogue with optional facilitator agent intervention
- **Features**: Facilitator can intervene to improve discussion quality and prevent agreement bias
- **Configuration**: Even iteration counts required when facilitator is enabled
- **Benefits**: Higher quality discussions, thorough exploration of ideas, guided conversation focus

#### Common Features

- **File Input Support**: Use files from `output/dialogue/ip/` directory
- **Flexible Configuration**: Customizable iteration counts, summary focus, and discussion prompts
- **Comprehensive Output**: Conversation transcripts, summaries, and metadata
- **Cost Tracking**: Detailed cost analysis for each pipeline execution

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
│   ├── pipelines/                 # Pipeline implementations
│   │   ├── contentWaterfallPipeline.js    # Content transformation pipeline
│   │   ├── dialoguePipeline.js            # Standard dialogue pipeline
│   │   ├── facilitatedDialoguePipeline.js # Facilitated dialogue pipeline
│   │   └── simpleChatPipeline.js          # Simple chat pipeline (planned)
│   ├── agents/                    # Everest agent implementations
│   │   ├── waterfall/             # Content waterfall agents
│   │   │   ├── contentAnalyzer.js         # Topic extraction agent
│   │   │   ├── linkedinCreator.js         # LinkedIn post generation
│   │   │   └── reelsGenerator.js          # Reels concept generation
│   │   ├── dialogue/              # Dialogue pipeline agents
│   │   │   ├── DialogueAg1.js             # First dialogue agent
│   │   │   ├── DialogueAg2.js             # Second dialogue agent
│   │   │   ├── facilitator.js             # Facilitator agent
│   │   │   └── summariseConversation.js   # Conversation summarizer
│   │   ├── conversationAgent.js           # General conversation agent
│   │   ├── converstationAnalysis.js       # Conversation analysis
│   │   └── intentAgent.js                 # Intent detection agent
│   ├── services/                  # Core services
│   │   ├── everest.service.js             # Everest API communication
│   │   └── agentLoader.service.js         # Agent loading and configuration
│   └── utils/                     # Utility functions
│       ├── testRunner.js                  # Core test execution framework
│       ├── pipelineData.js                # Pipeline execution tracking
│       └── pipelineCost.js                # Cost monitoring and reporting
├── output/                        # Pipeline output directories
│   ├── waterfall/                 # Content waterfall outputs
│   │   ├── ip/                            # Input files directory
│   │   └── YY_MM_DD_HH_MM_SS_ID/         # Timestamped output folders
│   └── dialogue/                  # Dialogue pipeline outputs
│       ├── ip/                            # Input files directory
│       └── YY_MM_DD_HH_MM_SS_ID/         # Timestamped output folders
├── tests/                         # Test suites
│   ├── pipelines/                 # Pipeline tests
│   │   ├── contentWaterfallPipeline.test.js   # Waterfall pipeline tests
│   │   ├── dialoguePipeline.test.js           # Dialogue pipeline tests
│   │   └── facilitatedDialoguePipeline.test.js # Facilitated dialogue tests
│   ├── agents/                    # Agent tests
│   │   └── waterfall.test.js              # Waterfall agent tests
│   ├── services/                  # Service tests
│   │   └── everest.service.test.js        # Everest service tests
│   ├── utils/                     # Utility tests
│   │   ├── pipelineData.test.js           # Pipeline data tests
│   │   ├── pipelineCost.test.js           # Cost tracking tests
│   │   └── waterfallTestHelpers.js        # Waterfall test utilities
│   ├── fixtures/                  # Test fixtures
│   │   └── waterfall/                     # Waterfall test content
│   ├── setup.js                   # Jest test setup
│   ├── globalSetup.js            # Global test environment setup
│   ├── globalTeardown.js         # Global test cleanup
│   └── **/*.test.js              # Unit tests
├── logs/                          # Test execution logs and reports
├── test-results/                  # CI/CD test results
├── coverage/                      # Test coverage reports
├── test_*.js                      # Integration test files
├── index.js                       # Main CLI interface
├── jest.config.js                 # Jest configuration
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
