[![MSeeP.ai Security Assessment Badge](https://mseep.net/pr/yukukotani-mcp-gcloud-adc-proxy-badge.png)](https://mseep.ai/app/yukukotani-mcp-gcloud-adc-proxy)

# mcp-gcloud-adc-proxy

[日本語](./README_ja.md)

An auth proxy for accessing remote MCP servers using Google Cloud Application Default Credentials (ADC)

## Overview

This tool runs as a stdio MCP server and forwards all requests to a remote MCP server, automatically attaching an `Authorization` header with a Google Cloud Application Default Credentials (ADC) token.

It allows you to connect to remote MCP servers hosted on IAM-protected services such as Cloud Run.

## Usage

### Prerequisites

You need to configure Google Cloud authentication. Choose one of the following methods:

```bash
# Method 1: User authentication using gcloud CLI
gcloud auth application-default login

# Method 2: Using service account key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

See the [Google Cloud documentation](https://cloud.google.com/docs/authentication/provide-credentials-adc) for more details.

### Basic Usage

```bash
# Start MCP proxy
npx mcp-gcloud-adc-proxy --url https://your-cloud-run-service.run.app
```

### Setup to Claude Code

```bash
# Add to user scope (available across all projects)
claude mcp add foobar -s user -- npx -y mcp-gcloud-adc-proxy -u https://foobar.run.app

# Or add to project scope to share with your team
claude mcp add foobar -s project -- npx -y mcp-gcloud-adc-proxy -u https://foobar.run.app
```

## License

Apache 2.0 License
