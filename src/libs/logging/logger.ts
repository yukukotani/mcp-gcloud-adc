import pino from "pino";
import type { LevelWithSilent, Logger as PinoLogger } from "pino";

export type LoggerConfig = {
  level?: pino.LevelWithSilent;
  verbose?: boolean;
  context?: string;
  pretty?: boolean;
};

export function createPinoLogger(config: LoggerConfig = {}): PinoLogger {
  const { level = "info", verbose = false, pretty = false, context } = config;

  // Pinoの設定
  const pinoConfig: pino.LoggerOptions = {
    name: context || "mcp-proxy",
    level: verbose ? "debug" : level,
  };

  // pretty formatの場合のみtransportを追加
  if (pretty) {
    pinoConfig.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
        ignore: "pid,hostname",
        destination: 2, // stderr
      },
    };
  }

  // stderrに出力するためのdestinationを設定
  return pino(pinoConfig, pino.destination(2));
}

export type LoggerType = "console" | "structured";

export function createLogger(
  type: LoggerType = "console",
  verbose: boolean = false,
  level: LevelWithSilent = "silent",
  context?: string,
): PinoLogger {
  // typeに関わらずPino loggerを使用（prettyフォーマットで区別）
  const pretty = type === "console";

  const config: LoggerConfig = {
    level,
    verbose,
    pretty,
  };

  if (context) {
    config.context = context;
  }

  return createPinoLogger(config);
}

// グローバルロガーインスタンス
let globalLogger: PinoLogger | null = null;

export function setGlobalLogger(logger: PinoLogger): void {
  globalLogger = logger;
}

export function getGlobalLogger(): PinoLogger {
  if (!globalLogger) {
    globalLogger = createLogger("console", false, "info");
  }
  return globalLogger;
}

// 便利な関数でコンテキスト付きロガーを作成
export function createContextLogger(
  context: string,
  pretty: boolean = true,
): PinoLogger {
  return createPinoLogger({
    context,
    pretty,
    verbose: false,
    level: "info",
  });
}
