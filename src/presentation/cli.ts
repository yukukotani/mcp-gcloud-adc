#!/usr/bin/env node
import { cli, define } from 'gunshi';
import type { CommandContext } from 'gunshi';
import { startProxy } from '../usecase/start-proxy.js';

export type CliArgs = {
  url: string;
  timeout: number;
  verbose: boolean;
};

export const proxyCommand = define({
  name: 'mcp-gcloud-proxy',
  description: 'Google Cloud Run MCP Server Proxy with ADC authentication',
  args: {
    url: {
      type: 'string',
      short: 'u',
      required: true,
      description: 'Cloud Run service URL (must be HTTPS)',
      validate: (value: string) => {
        if (!value.startsWith('https://')) {
          return 'URL must be HTTPS';
        }
        try {
          new URL(value);
          return true;
        } catch {
          return 'Invalid URL format';
        }
      },
    },
    timeout: {
      type: 'number',
      short: 't',
      default: 120000,
      description: 'HTTP request timeout in milliseconds',
      validate: (value: number) => {
        if (value <= 0) {
          return 'Timeout must be positive';
        }
        if (value > 600000) {
          return 'Timeout cannot exceed 10 minutes (600000ms)';
        }
        return true;
      },
    },
    verbose: {
      type: 'boolean',
      short: 'v',
      description: 'Enable verbose logging',
    },
  },
  run: async (ctx: CommandContext<CliArgs>) => {
    const { url, timeout, verbose } = ctx.values;
    
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
});

export async function runCli(): Promise<void> {
  await cli(proxyCommand);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    process.stderr.write(`Unexpected error: ${error}\n`);
    process.exit(1);
  });
}