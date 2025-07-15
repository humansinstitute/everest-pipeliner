# Pipeliner MCP Server Integration Guide

This guide provides comprehensive instructions for setting up and using the Pipeliner MCP (Model Context Protocol) server with Claude Desktop and other MCP-compatible clients.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Starting the MCP Server](#starting-the-mcp-server)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Overview

The Pipeliner MCP Server exposes Pipeliner's AI pipeline capabilities as MCP tools, allowing Claude Desktop and other MCP clients to execute sophisticated AI workflows including:

- **Dialogue Pipelines**: Multi-agent conversations for content analysis
- **Facilitated Dialogue**: AI-moderated discussions with intervention capabilities
- **Content Waterfall**: Transform long-form content into social media posts
- **Simple Chat**: Direct AI agent interactions

## Prerequisites

- Node.js 18+ installed
- Pipeliner project set up and configured
- Claude Desktop application (for Claude integration)
- Valid Everest API credentials configured in `.env`

## Installation & Setup

### 1. Environment Configuration

Create or update your `.env` file with MCP server settings:

```bash
# Enable MCP Server
ENABLE_MCP_SERVER=true

# MCP Server Configuration
MCP_SERVER_PORT=3001
MCP_SERVER_HOST=localhost
MCP_LOG_LEVEL=info

# Pipeline Configuration
MCP_PIPELINE_DIRECTORY=./src/pipelines
MCP_AUTO_DISCOVERY=true

# Security Settings
MCP_LOCAL_ONLY=true
MCP_ALLOWED_HOSTS=localhost,127.0.0.1,::1

# Tool Configuration
MCP_TOOL_PREFIX=run_pipeliner_

# Response Settings
MCP_INCLUDE_DEBUG=false
MCP_MAX_RESPONSE_SIZE=1048576

# Performance Settings
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=300000

# Required: Everest API Configuration
EVEREST_API_BASE=https://your-everest-api-endpoint
EVEREST_API=your-everest-api-key
```

### 2. Install Dependencies

Ensure all dependencies are installed:

```bash
npm install
```

### 3. Verify Setup

Test the MCP server configuration:

```bash
node src/mcp/server.js
```

You should see output indicating successful initialization and tool registration.

## Configuration

### Environment Variables

| Variable                 | Default           | Description                              |
| ------------------------ | ----------------- | ---------------------------------------- |
| `ENABLE_MCP_SERVER`      | `false`           | Enable/disable MCP server                |
| `MCP_SERVER_PORT`        | `3001`            | Port for MCP server                      |
| `MCP_SERVER_HOST`        | `localhost`       | Host for MCP server                      |
| `MCP_LOG_LEVEL`          | `info`            | Logging level (debug, info, warn, error) |
| `MCP_PIPELINE_DIRECTORY` | `./src/pipelines` | Directory containing pipeline modules    |
| `MCP_AUTO_DISCOVERY`     | `true`            | Automatically discover pipeline tools    |
| `MCP_LOCAL_ONLY`         | `true`            | Restrict access to localhost only        |
| `MCP_TOOL_PREFIX`        | `run_pipeliner_`  | Prefix for tool names                    |
| `MCP_INCLUDE_DEBUG`      | `false`           | Include debug information in responses   |
| `MCP_CACHE_ENABLED`      | `true`            | Enable pipeline caching                  |

### Development vs Production

**Development Environment:**

```bash
NODE_ENV=development
MCP_LOG_LEVEL=debug
MCP_INCLUDE_DEBUG=true
MCP_CACHE_ENABLED=false
```

**Production Environment:**

```bash
NODE_ENV=production
MCP_LOG_LEVEL=info
MCP_INCLUDE_DEBUG=false
MCP_CACHE_ENABLED=true
```

## Starting the MCP Server

### Method 1: CLI Menu (Recommended)

1. Start Pipeliner:

   ```bash
   npm start
   ```

2. Select option `6. Start MCP Server` from the menu

3. The server will initialize and display available tools

### Method 2: Direct Server Start

```bash
node src/mcp/server.js
```

### Method 3: Service Manager

```bash
node -e "
import { ServiceManager } from './src/services/serviceManager.js';
const manager = new ServiceManager();
await manager.startMCPServer();
"
```

### Verification

When successfully started, you should see:

```
🚀 Pipeliner MCP Server started
📊 Registered 4 pipeline tools

🔧 Available tools:
   - run_pipeliner_dialogue: Execute dialogue between two agents
   - run_pipeliner_facilitatedDialogue: Execute facilitated dialogue with AI facilitator
   - run_pipeliner_contentWaterfall: Transform content into social media posts
   - run_pipeliner_simpleChat: Simple chat interaction with AI agent
```

## Claude Desktop Integration

### 1. Configure Claude Desktop

Add the Pipeliner MCP server to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pipeliner": {
      "command": "node",
      "args": ["/path/to/your/pipeliner/project/src/mcp/server.js"],
      "cwd": "/path/to/your/pipeliner/project",
      "env": {
        "ENABLE_MCP_SERVER": "true"
      }
    }
  }
}
```

**CRITICAL FIX:** Use absolute paths in the `args` array to prevent path resolution errors.

### 2. Restart Claude Desktop

Close and restart Claude Desktop to load the new MCP server configuration.

### 3. Verify Integration

In Claude Desktop, you should see the Pipeliner tools available. You can verify by asking Claude:

> "What Pipeliner tools are available?"

Claude should list the available pipeline tools.

## Available Tools

### 1. Dialogue Pipeline (`run_pipeliner_dialogue`)

Execute a dialogue between two AI agents to analyze and discuss content.

**Parameters:**

- `sourceText` (required): The source material to be discussed
- `discussionPrompt` (required): The specific prompt to guide the discussion
- `iterations` (optional): Number of back-and-forth exchanges (1-10, default: 3)
- `summaryFocus` (optional): Focus for the final summary

**Example Usage:**

```
Please use the dialogue pipeline to analyze this research paper:
[paste research paper content]

Discussion prompt: "Analyze the methodology and discuss the implications of the findings"
```

### 2. Facilitated Dialogue (`run_pipeliner_facilitatedDialogue`)

Execute a dialogue with AI facilitator interventions to improve discussion quality.

**Parameters:**

- `sourceText` (required): Source material for discussion
- `discussionPrompt` (required): Discussion prompt
- `iterations` (optional): Number of iterations (must be even, 2-10, default: 4)
- `summaryFocus` (optional): Summary focus

**Example Usage:**

```
Use the facilitated dialogue pipeline to discuss this business case:
[paste business case]

Discussion prompt: "Evaluate the strategic options and recommend the best approach"
Iterations: 4
```

### 3. Content Waterfall (`run_pipeliner_contentWaterfall`)

Transform long-form content into social media posts and video concepts.

**Parameters:**

- `sourceText` (required): Long-form content to transform
- `customFocus` (optional): Custom focus areas for content extraction

**Example Usage:**

```
Transform this blog post into social media content:
[paste blog post]

Custom focus: "Focus on actionable tips for developers"
```

### 4. Simple Chat (`run_pipeliner_simpleChat`)

Simple chat interaction with an AI agent.

**Parameters:**

- `message` (required): Message to send to the AI agent
- `context` (optional): Optional context for the conversation

**Example Usage:**

```
Use simple chat to ask: "What are the best practices for API design?"
```

## Usage Examples

### Research Analysis Workflow

1. **Initial Analysis:**

   ```
   Use the dialogue pipeline to analyze this research paper on AI ethics:
   [research paper content]

   Discussion prompt: "Examine the ethical frameworks presented and discuss their practical applications"
   ```

2. **Deeper Discussion:**

   ```
   Use the facilitated dialogue pipeline with the same content:
   Discussion prompt: "Critically evaluate the proposed solutions and identify potential challenges"
   Iterations: 6
   ```

3. **Content Creation:**
   ```
   Use the content waterfall pipeline to create social media content from the research:
   Custom focus: "Highlight key ethical considerations for AI practitioners"
   ```

### Content Marketing Workflow

1. **Content Analysis:**

   ```
   Analyze this podcast transcript using the dialogue pipeline:
   [transcript content]

   Discussion prompt: "Identify the key insights and main themes"
   ```

2. **Social Media Creation:**
   ```
   Transform the analyzed content using the content waterfall pipeline:
   Custom focus: "Create engaging posts for LinkedIn and Twitter"
   ```

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

**Error:** `MCP server is disabled`
**Solution:** Set `ENABLE_MCP_SERVER=true` in your `.env` file

**Error:** `Port 3001 is already in use`
**Solution:** Change `MCP_SERVER_PORT` to a different port or stop the conflicting service

**Error:** `Pipeline directory not found`
**Solution:** Verify `MCP_PIPELINE_DIRECTORY` points to the correct directory

#### 2. Claude Desktop Integration Issues

**Error:** `Cannot find module '/src/mcp/server.js'`
**Solution:**

1. **Use absolute path in args array (CRITICAL FIX):**
   ```json
   "args": ["/absolute/path/to/pipeliner/src/mcp/server.js"]
   ```
2. Ensure both `args` and `cwd` use absolute paths
3. Test the path manually: `node /absolute/path/to/pipeliner/src/mcp/server.js`

**Error:** Tools not appearing in Claude Desktop
**Solution:**

1. Verify the configuration file path and format
2. Ensure the `cwd` path is correct and absolute
3. Ensure the `args` path is absolute (not relative)
4. Restart Claude Desktop completely
5. Check Claude Desktop logs for errors

**Error:** `Connection refused`
**Solution:**

1. Ensure the MCP server is running
2. Verify the port configuration matches
3. Check firewall settings

#### 3. Pipeline Execution Errors

**Error:** `Everest API error`
**Solution:** Verify `EVEREST_API_BASE` and `EVEREST_API` are correctly configured

**Error:** `Pipeline execution timed out`
**Solution:** Increase `MCP_DEFAULT_TIMEOUT` or reduce content size

### Debug Mode

Enable debug mode for detailed logging:

```bash
MCP_LOG_LEVEL=debug
MCP_INCLUDE_DEBUG=true
```

### Checking Server Status

Use the CLI menu option `8. Service Status` to check the current server state and configuration.

## Advanced Configuration

### Custom Pipeline Integration

To add custom pipelines to the MCP server:

1. Create your pipeline in `src/pipelines/`
2. Implement the required interface:

   ```javascript
   export async function executeViaMCP(parameters, logger) {
     // Your pipeline logic
   }

   export const metadata = {
     name: "yourPipeline",
     description: "Your pipeline description",
     parameters: {
       // Parameter definitions
     },
     interfaces: ["mcp", "cli"],
   };
   ```

3. Restart the MCP server to auto-discover the new pipeline

### Performance Tuning

For high-volume usage:

```bash
# Increase concurrent executions
MCP_MAX_CONCURRENT=5

# Increase timeout for complex pipelines
MCP_DEFAULT_TIMEOUT=600000

# Optimize response size
MCP_MAX_RESPONSE_SIZE=2097152

# Enable caching
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=600000
```

### Security Considerations

For production deployment:

```bash
# Restrict to specific hosts
MCP_LOCAL_ONLY=true
MCP_ALLOWED_HOSTS=localhost,127.0.0.1

# Disable debug information
MCP_INCLUDE_DEBUG=false

# Use appropriate log level
MCP_LOG_LEVEL=warn
```

### Monitoring and Logging

Monitor MCP server performance:

1. Check logs in the `logs/` directory
2. Use the service status endpoint
3. Monitor response times and error rates
4. Track tool usage patterns

## Support

For additional support:

1. Check the troubleshooting section above
2. Review the logs for detailed error information
3. Verify your configuration against the examples
4. Ensure all prerequisites are met

## Next Steps

- Explore the [Claude Desktop Integration Guide](docs/mcp-claude-integration.md)
- Review the [API Documentation](docs/api-reference.md)
- Check out [Usage Examples](docs/examples.md)
