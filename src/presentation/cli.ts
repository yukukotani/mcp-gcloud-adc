#!/usr/bin/env node
import { cli } from "gunshi";
import { startProxy } from "../usecase/start-proxy.js";

export type CliArgs = {
  url: string;
  timeout: number;
};

const proxyCommand = {
  name: "mcp-gcloud-proxy",
  description: "Google Cloud Run MCP Server Proxy with ADC authentication",
  args: {
    url: {
      type: "string" as const,
      short: "u" as const,
      required: true as const,
      description: "Cloud Run service URL (HTTP or HTTPS)",
    },
    timeout: {
      type: "number" as const,
      short: "t" as const,
      default: 120000,
      description: "HTTP request timeout in milliseconds",
    },
  },
  examples: `# Basic usage (HTTPS)
$ mcp-gcloud-proxy --url https://my-service-abc123-uc.a.run.app

# Local development (HTTP)
$ mcp-gcloud-proxy --url http://localhost:3000

# With custom timeout
$ mcp-gcloud-proxy -u https://my-service-abc123-uc.a.run.app -t 60000`,
  run: async (ctx: { values: { url: string; timeout: number } }) => {
    const { url, timeout } = ctx.values;
    await executeProxyCommand({ url, timeout });
  },
} as const;

export type CliOptions = {
  url: string;
  timeout: number;
};

export function validateCliOptions(options: CliOptions): void {
  const { url, timeout } = options;

  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("URL must be HTTP or HTTPS");
  }

  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (timeout <= 0) {
    throw new Error("Timeout must be positive");
  }

  if (timeout > 600000) {
    throw new Error("Timeout cannot exceed 10 minutes (600000ms)");
  }
}

export async function executeProxyCommand(options: CliOptions): Promise<void> {
  validateCliOptions(options);

  const result = await startProxy({
    url: options.url,
    timeout: options.timeout,
  });

  if (result.type === "error") {
    process.stderr.write(`Failed to start proxy: ${result.error.message}\n`);
    process.exit(1);
  }
}

export async function runCli(): Promise<void> {
  await cli(process.argv.slice(2), proxyCommand, {
    name: "mcp-gcloud-proxy",
    version: "1.0.0",
    description: "Google Cloud Run MCP Server Proxy with ADC authentication",
    renderHeader: async () => "",
  });
}

// CLI実行をindex.tsに移動（MCP Inspectorとの競合を防ぐため）
