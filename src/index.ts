#!/usr/bin/env node
import { logger } from "./libs/logging/logger.js";
import { runCli } from "./presentation/cli.js";

async function main(): Promise<void> {
  try {
    await runCli();
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Fatal error occurred",
    );
    process.stderr.write(
      `Fatal error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`Unexpected error: ${error}\n`);
  process.exit(1);
});
