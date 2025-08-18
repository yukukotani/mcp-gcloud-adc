export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
};

export type Logger = {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  setLevel: (level: LogLevel) => void;
  setContext: (context: string) => void;
};

export class ConsoleLogger implements Logger {
  private currentLevel: LogLevel = "info";
  private context?: string;

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(
    private verbose: boolean = false,
    initialLevel: LogLevel = "info",
  ) {
    this.currentLevel = initialLevel;
  }

  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  setContext(context: string): void {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    if (this.context) {
      entry.context = this.context;
    }

    this.writeLog(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === "debug" && !this.verbose) {
      return false;
    }

    return this.levelPriority[level] >= this.levelPriority[this.currentLevel];
  }

  private writeLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` [${entry.context}]` : "";
    const levelStr = entry.level.toUpperCase().padEnd(5);

    const logMessage = `[${timestamp}]${contextStr} ${levelStr}: ${entry.message}`;

    // エラーと警告はstderrに、その他はstderrに出力（MCPプロトコルでstdoutは使用されるため）
    const output =
      entry.level === "error" || entry.level === "warn"
        ? process.stderr
        : process.stderr;

    output.write(`${logMessage}\n`);

    if (this.verbose && entry.data !== undefined) {
      const dataStr =
        typeof entry.data === "string"
          ? entry.data
          : JSON.stringify(entry.data, null, 2);
      output.write(
        `[${timestamp}]${contextStr} ${levelStr} Data: ${dataStr}\n`,
      );
    }
  }
}

export type StructuredLogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  pid: number;
  hostname: string;
};

export class StructuredLogger implements Logger {
  private currentLevel: LogLevel = "info";
  private context?: string;

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(
    private verbose: boolean = false,
    initialLevel: LogLevel = "info",
  ) {
    this.currentLevel = initialLevel;
  }

  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown): void {
    this.log("error", message, data);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  setContext(context: string): void {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      pid: process.pid,
      hostname: process.env.HOSTNAME || "unknown",
    };

    if (this.context) {
      entry.context = this.context;
    }

    if (this.verbose && data !== undefined) {
      entry.data = data;
    }

    this.writeStructuredLog(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === "debug" && !this.verbose) {
      return false;
    }

    return this.levelPriority[level] >= this.levelPriority[this.currentLevel];
  }

  private writeStructuredLog(entry: StructuredLogEntry): void {
    const output =
      entry.level === "error" || entry.level === "warn"
        ? process.stderr
        : process.stderr;

    try {
      const logString = JSON.stringify(entry);
      output.write(`${logString}\n`);
    } catch (error) {
      // フォールバック: JSON化に失敗した場合は通常のログ形式
      const fallbackMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
      output.write(`${fallbackMessage}\n`);
    }
  }
}

export type LoggerType = "console" | "structured";

export function createLogger(
  type: LoggerType = "console",
  verbose: boolean = false,
  level: LogLevel = "info",
): Logger {
  switch (type) {
    case "structured":
      return new StructuredLogger(verbose, level);
    case "console":
    default:
      return new ConsoleLogger(verbose, level);
  }
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
