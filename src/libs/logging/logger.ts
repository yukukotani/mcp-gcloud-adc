import pino from "pino";
import type { Logger as PinoLogger } from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  setLevel: (level: LogLevel) => void;
  setContext: (context: string) => void;
  // Pino loggerへの直接アクセス
  pino: PinoLogger;
};

export type LoggerConfig = {
  level?: LogLevel;
  verbose?: boolean;
  context?: string;
  pretty?: boolean;
};

export class PinoLoggerAdapter implements Logger {
  public readonly pino: PinoLogger;
  private context?: string;

  constructor(config: LoggerConfig = {}) {
    const { level = "info", verbose = false, pretty = false } = config;
    
    // Pinoの設定
    const pinoConfig: pino.LoggerOptions = {
      name: "mcp-proxy",
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
    this.pino = pino(pinoConfig, pino.destination(2));

    if (config.context) {
      this.setContext(config.context);
    }
  }

  debug(message: string, data?: unknown): void {
    if (data !== undefined) {
      this.pino.debug(this.formatData(data), this.formatMessage(message));
    } else {
      this.pino.debug(this.formatMessage(message));
    }
  }

  info(message: string, data?: unknown): void {
    if (data !== undefined) {
      this.pino.info(this.formatData(data), this.formatMessage(message));
    } else {
      this.pino.info(this.formatMessage(message));
    }
  }

  warn(message: string, data?: unknown): void {
    if (data !== undefined) {
      this.pino.warn(this.formatData(data), this.formatMessage(message));
    } else {
      this.pino.warn(this.formatMessage(message));
    }
  }

  error(message: string, data?: unknown): void {
    if (data !== undefined) {
      this.pino.error(this.formatData(data), this.formatMessage(message));
    } else {
      this.pino.error(this.formatMessage(message));
    }
  }

  setLevel(level: LogLevel): void {
    this.pino.level = level;
  }

  setContext(context: string): void {
    this.context = context;
  }

  private formatMessage(message: string): string {
    return this.context ? `[${this.context}] ${message}` : message;
  }

  private formatData(data: unknown): Record<string, unknown> {
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return { data };
  }
}

export type LoggerType = "console" | "structured";

export function createLogger(
  type: LoggerType = "console",
  verbose: boolean = false,
  level: LogLevel = "info",
  context?: string,
): Logger {
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
  
  return new PinoLoggerAdapter(config);
}

// グローバルロガーインスタンス
let globalLogger: Logger | null = null;

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = createLogger("console", false, "info");
  }
  return globalLogger;
}