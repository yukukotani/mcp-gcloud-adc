import { createAuthClient } from "../libs/auth/google-auth.js";
import { createHttpClient } from "../libs/http/http-client.js";
import { setupSimpleMcpServer } from "../presentation/mcp-server-simple.js";
import { createMcpProxy } from "./mcp-proxy/handler.js";
import type { ProxyOptions } from "./mcp-proxy/types.js";
import packageInfo from "../../package.json" with { type: "json" };

type StartProxyResult =
  | { type: "success" }
  | { type: "error"; error: { kind: string; message: string } };

export async function startProxy(
  options: ProxyOptions,
): Promise<StartProxyResult> {
  // URLの検証
  if (!options.url) {
    return {
      type: "error",
      error: { kind: "validation-error", message: "URL is required" },
    };
  }

  if (
    !options.url.startsWith("https://") &&
    !options.url.startsWith("http://")
  ) {
    return {
      type: "error",
      error: { kind: "validation-error", message: "URL must be HTTP or HTTPS" },
    };
  }

  try {
    // 認証クライアントの初期化
    const authClient = createAuthClient({});

    // HTTPクライアントの初期化
    const httpClient = createHttpClient();

    // プロキシハンドラーの作成
    const proxy = createMcpProxy({
      targetUrl: options.url,
      timeout: options.timeout,
      authClient,
      httpClient,
    });

    // MCPサーバーのセットアップと接続
    await setupSimpleMcpServer({
      name: "mcp-gcloud-adc",
      version: packageInfo.version,
      proxy,
    });

    // グレースフルシャットダウンの設定
    setupGracefulShutdown();

    // プロセスが終了するまで待機
    await new Promise((resolve) => {
      process.on("SIGINT", resolve);
      process.on("SIGTERM", resolve);
    });

    return { type: "success" };
  } catch (error) {
    return {
      type: "error",
      error: {
        kind: "initialization-error",
        message:
          error instanceof Error ? error.message : "Failed to start proxy",
      },
    };
  }
}

function setupGracefulShutdown(): void {
  const shutdown = () => {
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  process.on("uncaughtException", () => {
    process.exit(1);
  });

  process.on("unhandledRejection", () => {
    process.exit(1);
  });
}
