#!/usr/bin/env node
import { runCli } from './presentation/cli.js';

async function main(): Promise<void> {
  try {
    await runCli();
  } catch (error) {
    process.stderr.write(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`Unexpected error: ${error}\n`);
    process.exit(1);
  });
}