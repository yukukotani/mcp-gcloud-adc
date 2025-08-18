import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPinoLogger,
  createLogger,
  getGlobalLogger,
  setGlobalLogger,
  createContextLogger,
} from "./logger.js";

describe("createPinoLogger", () => {
  let mockStderr: any;

  beforeEach(() => {
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("デフォルト設定でpinoロガーを作成する", () => {
    const logger = createPinoLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("pretty形式でロガーを作成する", () => {
    const logger = createPinoLogger({ pretty: true, level: "info" });
    expect(logger).toBeDefined();
    
    logger.info("Test pretty message");
    expect(mockStderr).toHaveBeenCalled();
  });

  it("structured形式でロガーを作成する", () => {
    const logger = createPinoLogger({ pretty: false, level: "info" });
    expect(logger).toBeDefined();
    
    logger.info("Test structured message");
    expect(mockStderr).toHaveBeenCalled();
  });

  it("コンテキスト付きでロガーを作成する", () => {
    const logger = createPinoLogger({ context: "test-context", pretty: true });
    expect(logger).toBeDefined();
    
    logger.info("Test message");
    expect(mockStderr).toHaveBeenCalled();
  });

  it("verboseモードでdebugレベルを有効にする", () => {
    const logger = createPinoLogger({ verbose: true, level: "info" });
    expect(logger.level).toBe("debug");
  });

  it("非verboseモードで指定されたレベルを使用する", () => {
    const logger = createPinoLogger({ verbose: false, level: "warn" });
    expect(logger.level).toBe("warn");
  });
});

describe("createLogger", () => {
  it("consoleタイプでpinoロガーを作成する", () => {
    const logger = createLogger("console", true, "debug");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("structuredタイプでpinoロガーを作成する", () => {
    const logger = createLogger("structured", true, "debug");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("デフォルトでconsole形式のpinoロガーを作成する", () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("コンテキスト付きでロガーを作成する", () => {
    const logger = createLogger("console", false, "info", "test-context");
    expect(logger).toBeDefined();
  });
});

describe("createContextLogger", () => {
  it("コンテキスト名付きのロガーを作成する", () => {
    const logger = createContextLogger("my-component");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("prettyフラグを制御できる", () => {
    const prettyLogger = createContextLogger("component", true);
    const structuredLogger = createContextLogger("component", false);
    
    expect(prettyLogger).toBeDefined();
    expect(structuredLogger).toBeDefined();
  });
});

describe("Global Logger", () => {
  afterEach(() => {
    // グローバルロガーをリセット
    setGlobalLogger(createLogger("console", false, "info"));
  });

  it("グローバルロガーを設定する", () => {
    const customLogger = createLogger("structured", true, "debug");
    setGlobalLogger(customLogger);

    const retrievedLogger = getGlobalLogger();
    expect(retrievedLogger).toBe(customLogger);
  });

  it("グローバルロガーが未設定の場合デフォルトを作成する", () => {
    // グローバルロガーを明示的にクリア
    (global as any).globalLogger = null;

    const logger = getGlobalLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });
});

describe("Pino Logger Integration", () => {
  let mockStderr: any;

  beforeEach(() => {
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pinoの標準APIを直接使用できる", () => {
    const logger = createPinoLogger({ pretty: true });
    
    // Pinoの標準メソッドを使用
    logger.info("Standard info message");
    logger.debug("Debug message");
    logger.warn("Warning message");
    logger.error("Error message");
    
    // ログの出力があることを確認
    expect(mockStderr).toHaveBeenCalled();
  });

  it("オブジェクトと文字列を組み合わせたログ記録", () => {
    const logger = createPinoLogger({ pretty: true });
    
    logger.info({ userId: 123, action: "login" }, "User logged in");
    logger.warn({ error: "timeout" }, "Request failed");
    
    expect(mockStderr).toHaveBeenCalled();
  });

  it("child loggerを作成できる", () => {
    const logger = createPinoLogger({ pretty: true });
    const childLogger = logger.child({ component: "auth" });
    
    childLogger.info("Authentication successful");
    expect(mockStderr).toHaveBeenCalled();
  });

  it("ログレベルを動的に変更できる", () => {
    const logger = createPinoLogger({ level: "info" });
    expect(logger.level).toBe("info");
    
    logger.level = "debug";
    expect(logger.level).toBe("debug");
  });
});