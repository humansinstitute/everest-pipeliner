# Pipeliner - Distributed Pipeline Execution Platform

A comprehensive AI-powered pipeline framework for Everest Agent workflows featuring parallel test execution, dialogue processing, and content transformation capabilities with intelligent scheduling, comprehensive error handling, and advanced performance optimization.

## 🚀 Features

### Core Capabilities

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
│   ├── utils/
│   │   └── testRunner.js          # Core test execution framework
│   ├── agents/                    # Everest agent implementations
│   └── pipelines/                 # Pipeline implementations
├── tests/
│   ├── setup.js                   # Jest test setup
│   ├── globalSetup.js            # Global test environment setup
│   ├── globalTeardown.js         # Global test cleanup
│   └── **/*.test.js              # Unit tests
├── logs/                          # Test execution logs and reports
├── test-results/                  # CI/CD test results
├── coverage/                      # Test coverage reports
├── test_*.js                      # Integration test files
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
