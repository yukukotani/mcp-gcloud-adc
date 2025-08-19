#!/usr/bin/env node
import { cli, define } from "gunshi";
import packageInfo from "../../package.json" with { type: "json" };
import { logger } from "../libs/logging/logger.js";
import { startProxy } from "../usecase/start-proxy.js";

const proxyCommand = define({
  name: "mcp-gcloud-adc",
  description: "Google Cloud Run MCP Server Proxy with ADC authentication",
  args: {
    url: {
      type: "string",
      short: "u",
      required: true,
      description: "Cloud Run service URL (HTTP or HTTPS)",
    },
    timeout: {
      type: "number",
      short: "t",
      default: 120000,
      description: "HTTP request timeout in milliseconds",
    },
  },
  examples: `# Basic usage (HTTPS)
$ mcp-gcloud-adc --url https://my-service-abc123-uc.a.run.app

# Local development (HTTP)
$ mcp-gcloud-adc --url http://localhost:3000

# With custom timeout
$ mcp-gcloud-adc -u https://my-service-abc123-uc.a.run.app -t 60000`,
  run: async (ctx) => {
    console.log(ctx.values.url, ctx.values.timeout);

    const { url, timeout } = ctx.values;
    await executeProxyCommand({ url, timeout });
  },
});

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
  logger.info(
    { url: options.url, timeout: options.timeout },
    "Executing proxy command",
  );

  validateCliOptions(options);

  const result = await startProxy({
    url: options.url,
    timeout: options.timeout,
  });

  if (result.type === "error") {
    logger.error({ error: result.error }, "Failed to start proxy from CLI");
    process.stderr.write(`Failed to start proxy: ${result.error.message}\n`);
    process.exit(1);
  }
}

export async function runCli(): Promise<void> {
  await cli(process.argv.slice(2), proxyCommand, {
    name: "mcp-gcloud-adc",
    version: packageInfo.version,
    description: "Google Cloud Run MCP Server Proxy with ADC authentication",
    renderHeader: async () => "",
  });
}

// CLI実行をindex.tsに移動（MCP Inspectorとの競合を防ぐため）
