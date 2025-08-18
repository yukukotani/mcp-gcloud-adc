#!/usr/bin/env node
import { cli } from "gunshi";
import { startProxy } from "../usecase/start-proxy.js";

export type CliArgs = {
  url: string;
  timeout: number;
  verbose: boolean;
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
    verbose: {
      type: "boolean" as const,
      short: "v" as const,
      description: "Enable verbose logging",
    },
  },
  examples: `# Basic usage (HTTPS)
$ mcp-gcloud-proxy --url https://my-service-abc123-uc.a.run.app

# Local development (HTTP)
$ mcp-gcloud-proxy --url http://localhost:3000

# With custom timeout and verbose logging
$ mcp-gcloud-proxy -u https://my-service-abc123-uc.a.run.app -v -t 60000`,
  run: async (ctx: any) => {
    const { url, timeout, verbose } = ctx.values;
    await executeProxyCommand({ url, timeout, verbose });
  },
} as const;

export type CliOptions = {
  url: string;
  timeout: number;
  verbose?: boolean;
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

  if (options.verbose) {
    process.stderr.write(`Starting MCP proxy for ${options.url}\n`);
    process.stderr.write(`Timeout: ${options.timeout}ms\n`);
  }

  try {
    // verboseプロパティをboolean型として扱う
    const proxyOptions = {
      url: options.url,
      timeout: options.timeout,
      verbose: options.verbose || false,
    };
    await startProxy(proxyOptions);
  } catch (error) {
    process.stderr.write(
      `Failed to start proxy: ${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
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

await runCli();
