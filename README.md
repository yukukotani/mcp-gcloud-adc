# mcp-gcloud-adc

A proxy tool for accessing MCP servers using Google Cloud Application Default Credentials (ADC)

## Overview

This tool authenticates using Google Cloud Application Default Credentials (ADC) and proxies requests to Model Context Protocol (MCP) servers. It's particularly useful for accessing MCP servers running on Google Cloud services like Cloud Run.

## Features

- **ADC Authentication**: Automatically uses Google Cloud Application Default Credentials
- **MCP Proxy**: Transparently proxies JSON-RPC formatted MCP requests
- **Error Handling**: Properly handles authentication errors, network errors, and HTTP errors
- **CLI Interface**: Simple command-line operation

## Installation

```bash
npm install -g mcp-gcloud-adc
```

## Usage

### Prerequisites

You need to set up Google Cloud authentication credentials. Use one of the following methods:

```bash
# Method 1: User authentication using gcloud CLI
gcloud auth application-default login

# Method 2: Using service account key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### Basic Usage

```bash
# Start MCP proxy
mcp-gcloud-adc --url https://your-cloud-run-service.run.app --timeout 30000
```

### Parameters

- `--url`: URL of the target MCP server (required)
- `--timeout`: Request timeout in milliseconds (default: 30000)

### Examples

```bash
# Proxy to Cloud Run service
mcp-gcloud-adc --url https://mcp-server-abcd1234-uw.a.run.app --timeout 10000

# Proxy to local HTTP server (no authentication)
mcp-gcloud-adc --url http://localhost:3000 --timeout 5000
```

## Claude Desktop Configuration

Add the following to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "npx",
      "args": [
        "mcp-gcloud-adc",
        "--url",
        "https://your-cloud-run-service.run.app"
      ]
    }
  }
}
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

## Troubleshooting

### Authentication Errors

```bash
# Verify ADC is configured correctly
gcloud auth application-default print-access-token

# Re-authenticate
gcloud auth application-default login
```

### Timeout Issues

Increase the `--timeout` parameter value:

```bash
mcp-gcloud-adc --url https://your-service.run.app --timeout 60000
```

## License

MIT License

## Contributing

Issues and Pull Requests are welcome! Visit our [GitHub repository](https://github.com/yukukotani/mcp-gcloud-adc).