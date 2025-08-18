import type { LevelWithSilent, Logger as PinoLogger } from "pino";
import pino from "pino";

export type LogType = "pretty" | "json" | "file";

export type LoggerConfig = {
  level?: pino.LevelWithSilent;
  verbose?: boolean;
  context?: string;
  type?: LogType;
  filePath?: string;
};

export function createPinoLogger(config: LoggerConfig = {}): PinoLogger {
  const {
    level = "info",
    verbose = false,
    type = "file",
    context,
    filePath = "./mcp-gcloud-adc.log",
  } = config;

  // Pinoの設定
  const pinoConfig: pino.LoggerOptions = {
    name: context || "mcp-proxy",
    level: verbose ? "debug" : level,
  };

  // transportの設定
  if (type === "pretty") {
    // pretty format - stderrに出力
    pinoConfig.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
        ignore: "pid,hostname",
        destination: 2, // stderr
      },
    };
    return pino(pinoConfig);
  } else if (type === "json") {
    // JSON format - stderrに出力
    return pino(pinoConfig, pino.destination(2));
  } else {
    // file format - ファイルに出力（デフォルト）
    return pino(pinoConfig, pino.destination(filePath));
  }
}

export type LoggerType = "console" | "structured" | "file";

export function createLogger(
  type: LoggerType = "file",
  verbose: boolean = false,
  level: LevelWithSilent = "info",
  context?: string,
  filePath?: string,
): PinoLogger {
  // 旧来のtypeを新しいLogTypeにマッピング
  let logType: LogType;
  if (type === "console") {
    logType = "pretty";
  } else if (type === "structured") {
    logType = "json";
  } else {
    logType = "file";
  }

  const config: LoggerConfig = {
    level,
    verbose,
    type: logType,
  };

  if (filePath) {
    config.filePath = filePath;
  }

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
    globalLogger = createLogger("file", false, "info");
  }
  return globalLogger;
}

// 便利な関数でコンテキスト付きロガーを作成
export function createContextLogger(
  context: string,
  type: LogType = "file",
  filePath?: string,
): PinoLogger {
  const config: LoggerConfig = {
    context,
    type,
    verbose: false,
    level: "info",
  };

  if (filePath) {
    config.filePath = filePath;
  }

  return createPinoLogger(config);
}
