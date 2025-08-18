import { createAuthClient } from "../libs/auth/google-auth.js";
import { createConfigManager, getPackageInfo } from "../libs/config/manager.js";
import { createErrorHandler } from "../libs/error/handler.js";
import { createHttpClient } from "../libs/http/http-client.js";
import { createLogger, setGlobalLogger } from "../libs/logging/logger.js";
import { setupMcpServer } from "../presentation/mcp-server.js";
import { createMcpProxy } from "./mcp-proxy/handler.js";
import type { ProxyOptions } from "./mcp-proxy/types.js";

export async function startProxy(options: ProxyOptions): Promise<void> {
  const packageInfo = getPackageInfo();
  const configManager = createConfigManager(packageInfo);
  const config = configManager.loadConfig(options);

  // 設定の検証
  const validation = configManager.validateConfig(config);
  if (!validation.valid) {
    throw new Error(
      `Configuration validation failed:\n${validation.errors.join("\n")}`,
    );
  }

  // ロガーの初期化
  const logger = createLogger(
    config.logging.type,
    config.logging.verbose,
    config.logging.level,
  );
  logger.setContext("mcp-proxy");
  setGlobalLogger(logger);

  // エラーハンドラーの初期化
  const errorHandler = createErrorHandler(config.logging.verbose);

  logger.info(`Starting ${config.server.name} v${config.server.version}`);
  logger.info(`Target URL: ${config.proxy.url}`);
  logger.info(`Timeout: ${config.proxy.timeout}ms`);

  try {
    // 認証クライアントの初期化
    logger.debug("Initializing authentication client");
    const authClient = createAuthClient(config.auth);

    // HTTPクライアントの初期化
    logger.debug("Initializing HTTP client");
    const httpClient = createHttpClient();

    // プロキシハンドラーの作成
    logger.debug("Creating proxy handler");
    const proxy = createMcpProxy({
      targetUrl: config.proxy.url,
      timeout: config.proxy.timeout,
      authClient,
      httpClient,
      verbose: config.proxy.verbose || false,
    });

    // MCPサーバーのセットアップと接続
    logger.debug("Setting up MCP proxy server");
    await setupMcpServer({
      name: config.server.name,
      version: config.server.version,
      proxy,
      verbose: config.proxy.verbose || false,
    });

    // グレースフルシャットダウンの設定
    setupGracefulShutdown(logger);

    logger.info("MCP proxy server started successfully");

    // プロセスが終了するまで待機
    await new Promise((resolve) => {
      process.on("SIGINT", resolve);
      process.on("SIGTERM", resolve);
    });
  } catch (error) {
    const appError = errorHandler.handleUnexpectedError(error, "startup");
    logger.error("Failed to start proxy server", appError);
    throw new Error(appError.message);
  }
}

function setupGracefulShutdown(logger: any): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", reason);
    process.exit(1);
  });
}
