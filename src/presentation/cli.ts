#!/usr/bin/env node
import { cli } from 'gunshi';
import { startProxy } from '../usecase/start-proxy.js';

export type CliArgs = {
  url: string;
  timeout: number;
  verbose: boolean;
};

const proxyCommand = {
  name: 'mcp-gcloud-proxy',
  description: 'Google Cloud Run MCP Server Proxy with ADC authentication',
  args: {
    url: {
      type: 'string' as const,
      short: 'u',
      required: true,
      description: 'Cloud Run service URL (must be HTTPS)',
    },
    timeout: {
      type: 'number' as const,
      short: 't',
      default: 120000,
      description: 'HTTP request timeout in milliseconds',
    },
    verbose: {
      type: 'boolean' as const,
      short: 'v',
      description: 'Enable verbose logging',
    },
  },
  examples: `# Basic usage
$ mcp-gcloud-proxy --url https://my-service-abc123-uc.a.run.app

# With custom timeout and verbose logging
$ mcp-gcloud-proxy -u https://my-service-abc123-uc.a.run.app -v -t 60000`,
  run: async (ctx: any) => {
    const { url, timeout, verbose } = ctx.values;

    // Validation
    if (!url.startsWith('https://')) {
      throw new Error('URL must be HTTPS');
    }

    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    if (timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    if (timeout > 600000) {
      throw new Error('Timeout cannot exceed 10 minutes (600000ms)');
    }
    
    if (verbose) {
      process.stderr.write(`Starting MCP proxy for ${url}\n`);
      process.stderr.write(`Timeout: ${timeout}ms\n`);
    }
    
    try {
      await startProxy({ url, timeout, verbose });
    } catch (error) {
      process.stderr.write(`Failed to start proxy: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      process.exit(1);
    }
  },
};

export async function runCli(): Promise<void> {
  await cli(process.argv.slice(2), proxyCommand, {
    name: 'mcp-gcloud-proxy',
    version: '1.0.0',
    description: 'Google Cloud Run MCP Server Proxy with ADC authentication',
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    process.stderr.write(`Unexpected error: ${error}\n`);
    process.exit(1);
  });
}