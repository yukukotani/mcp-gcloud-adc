# mcp-gcloud-adc

A proxy tool for accessing MCP servers using Google Cloud Application Default Credentials (ADC)

## Overview

This tool authenticates using Google Cloud Application Default Credentials (ADC) and proxies requests to Model Context Protocol (MCP) servers. It's particularly useful for accessing MCP servers running on Google Cloud services like Cloud Run.

## Features

- **ADC Authentication**: Automatically uses Google Cloud Application Default Credentials
- **MCP Proxy**: Transparently proxies JSON-RPC formatted MCP requests
- **Error Handling**: Properly handles authentication errors, network errors, and HTTP errors
- **CLI Interface**: Simple command-line operation

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Google Cloud Authentication

Set up ADC using one of the following methods:

```bash
# Method 1: User authentication using gcloud CLI
gcloud auth application-default login

# Method 2: Using service account key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### 3. Build

```bash
bun run build
```

## Usage

### Basic Usage

```bash
# Start MCP proxy
bun run start --url https://your-cloud-run-service.run.app --timeout 30000

# Or use the built binary
node dist/index.js --url https://your-cloud-run-service.run.app --timeout 30000
```

### Parameters

- `--url`: URL of the target MCP server (required)
- `--timeout`: Request timeout in milliseconds (default: 30000)

### Examples

```bash
# Proxy to Cloud Run service
bun run start --url https://mcp-server-abcd1234-uw.a.run.app --timeout 10000

# Proxy to local HTTP server (no authentication)
bun run start --url http://localhost:3000 --timeout 5000
```

## Architecture

### Directory Structure

```
src/
├── presentation/     # Presentation layer
│   ├── cli.ts       # CLI interface
│   └── mcp-proxy-handlers.ts  # HTTP/JSON-RPC conversion
├── usecase/         # Use case layer
│   └── mcp-proxy/   # Proxy business logic
└── libs/           # Library layer
    ├── auth/       # Google Cloud authentication
    └── http/       # HTTP client
```

### Main Components

- **CLI (`presentation/cli.ts`)**: Command-line argument processing and application startup
- **MCP Proxy (`usecase/mcp-proxy/`)**: Authenticated request processing and upstream forwarding
- **Auth Client (`libs/auth/`)**: ID token acquisition using Google Cloud ADC
- **HTTP Client (`libs/http/`)**: HTTP request sending and error handling

## Development

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/usecase/mcp-proxy/handler.test.ts

# Use Vitest directly
bunx vitest
```

### Linting and Formatting

```bash
# Run lint and type check
bun lint

# Fix formatting issues
bun run biome check . --fix
```

### Build

```bash
# Build with tsdown (fast, optimized)
bun run build

# Build with TypeScript compiler (fallback)
bun run build:tsc

# Watch mode for development
bun run dev
```

## Authentication

This tool uses Google Cloud Application Default Credentials (ADC). ADC searches for credentials in the following order:

1. Service account key specified by the `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. User credentials set by the gcloud CLI
3. Metadata server in Google Cloud environments (Compute Engine, Cloud Run, etc.)

For more details, see the [Google Cloud documentation](https://cloud.google.com/docs/authentication/application-default-credentials).

## Error Handling

The following errors are properly handled:

- **Authentication Errors**: ADC credentials not found or invalid tokens
- **Network Errors**: Connection failures, timeouts
- **HTTP Errors**: 4xx, 5xx status codes
- **JSON-RPC Errors**: Invalid request/response formats

## License

MIT License

## Developer Information

### Commit Guidelines

- Small, frequent commits are recommended
- Commit messages should be written in Japanese
- Create separate commits for each task

### Test-Driven Development

- Create tests before implementing new features
- Use power-assert for assertions
- Use vitest for test execution

### Coding Guidelines

- Functional programming style
- Use tagged unions for error handling
- Prefer functions over classes