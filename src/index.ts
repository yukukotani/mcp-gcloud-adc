#!/usr/bin/env node
import { runCli } from "./presentation/cli.js";
import { startProxy } from "./usecase/start-proxy.js";

async function main(): Promise<void> {
  try {
    // MCP Inspector や stdio MCP クライアント用: 引数なしまたはURL引数のみの場合はstdio MCPサーバーモードで起動
    if (process.argv.length === 2 || (process.argv.length === 4 && process.argv[2] === '-u')) {
      // stdio MCP サーバーモード - デバッグのためverbose=trueに設定
      const url = process.argv.length === 4 && process.argv[3] ? process.argv[3] : 'https://httpbin.org/post';
      await startProxy({ url, timeout: 120000, verbose: true });
      return;
    }
    
    // 通常のCLIモード
    await runCli();
  } catch (error) {
    process.stderr.write(
      `Fatal error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`Unexpected error: ${error}\n`);
    process.exit(1);
  });
}
