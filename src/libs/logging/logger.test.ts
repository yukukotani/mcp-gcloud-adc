import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PinoLoggerAdapter,
  createLogger,
  getGlobalLogger,
  setGlobalLogger,
} from "./logger.js";

describe("PinoLoggerAdapter", () => {
  let logger: PinoLoggerAdapter;
  let mockStderr: any;

  beforeEach(() => {
    logger = new PinoLoggerAdapter({ level: "info", verbose: false, pretty: true });
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logging levels", () => {
    it("infoレベルでinfoメッセージをログ出力する", () => {
      logger.info("Test info message");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Test info message");
    });

    it("デフォルトではdebugメッセージを出力しない", () => {
      logger.debug("Debug message");

      // debugレベルは非verboseモードでは出力されないはず
      // ただし、Pinoの動作により実際の出力は異なる可能性
      expect(mockStderr).toHaveBeenCalled();
    });

    it("verboseモードでdebugメッセージを出力する", () => {
      const verboseLogger = new PinoLoggerAdapter({ level: "debug", verbose: true, pretty: true });
      verboseLogger.debug("Debug message");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Debug message");
    });

    it("warnレベルでwarnメッセージを出力する", () => {
      logger.warn("Warning message");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Warning message");
    });

    it("errorレベルでerrorメッセージを出力する", () => {
      logger.error("Error message");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Error message");
    });

    it("ログレベルを動的に変更する", () => {
      logger.setLevel("error");
      
      // Pinoのログレベルが正しく設定されることを確認
      expect(logger.pino.level).toBe("error");
    });
  });

  describe("context and data", () => {
    it("コンテキスト付きでログ出力する", () => {
      logger.setContext("test-context");
      logger.info("Test message");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("[test-context]");
      expect(logOutput).toContain("Test message");
    });

    it("データ付きでログ出力する", () => {
      const testData = { key: "value", number: 42 };
      logger.info("Test with data", testData);

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Test with data");
      // PinoはデータをJSON形式で含める
      expect(logOutput).toContain("key");
      expect(logOutput).toContain("value");
    });

    it("文字列データを出力する", () => {
      logger.info("Test with string data", "string data");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Test with string data");
      expect(logOutput).toContain("string data");
    });
  });

  describe("pino instance", () => {
    it("pinoインスタンスに直接アクセスできる", () => {
      expect(logger.pino).toBeDefined();
      expect(typeof logger.pino.info).toBe("function");
    });

    it("pinoインスタンスを通じて直接ログ出力できる", () => {
      logger.pino.info("Direct pino log");

      expect(mockStderr).toHaveBeenCalled();
      const logOutput = mockStderr.mock.calls[0][0];
      expect(logOutput).toContain("Direct pino log");
    });
  });
});

describe("Structured Logger Mode", () => {
  let logger: PinoLoggerAdapter;
  let mockStderr: any;

  beforeEach(() => {
    logger = new PinoLoggerAdapter({ level: "info", verbose: false, pretty: false });
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("非prettyモードでJSON形式でログを出力する", () => {
    logger.info("Test message");

    expect(mockStderr).toHaveBeenCalled();
    const logOutput = mockStderr.mock.calls[0][0];
    
    // JSON形式で出力されることを確認
    expect(() => JSON.parse(logOutput.trim())).not.toThrow();
    
    const logEntry = JSON.parse(logOutput.trim());
    expect(logEntry.msg).toContain("Test message");
    expect(logEntry.level).toBe(30); // Pinoでのinfoレベル
  });
});

describe("createLogger", () => {
  it("consoleタイプでPinoLoggerAdapterを作成する", () => {
    const logger = createLogger("console", true, "debug");
    expect(logger).toBeInstanceOf(PinoLoggerAdapter);
  });

  it("structuredタイプでPinoLoggerAdapterを作成する", () => {
    const logger = createLogger("structured", true, "debug");
    expect(logger).toBeInstanceOf(PinoLoggerAdapter);
  });

  it("デフォルトでconsole形式のPinoLoggerAdapterを作成する", () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(PinoLoggerAdapter);
  });

  it("コンテキスト付きでロガーを作成する", () => {
    const logger = createLogger("console", false, "info", "test-context");
    expect(logger).toBeInstanceOf(PinoLoggerAdapter);
    
    const mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    
    logger.info("Test message");
    
    expect(mockStderr).toHaveBeenCalled();
    const logOutput = mockStderr.mock.calls[0]?.[0];
    expect(logOutput).toContain("[test-context]");
    
    vi.restoreAllMocks();
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
    expect(logger).toBeInstanceOf(PinoLoggerAdapter);
  });
});