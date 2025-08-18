import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsoleLogger,
  createLogger,
  getGlobalLogger,
  StructuredLogger,
  setGlobalLogger,
} from "./logger.js";

describe("ConsoleLogger", () => {
  let logger: ConsoleLogger;
  let mockStderr: any;

  beforeEach(() => {
    logger = new ConsoleLogger(false, "info");
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("logging levels", () => {
    it("infoレベルでinfoメッセージをログ出力する", () => {
      logger.info("Test info message");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/INFO : Test info message\n/),
      );
    });

    it("デフォルトではdebugメッセージを出力しない", () => {
      logger.debug("Debug message");

      expect(mockStderr).not.toHaveBeenCalled();
    });

    it("verboseモードでdebugメッセージを出力する", () => {
      const verboseLogger = new ConsoleLogger(true, "debug");
      verboseLogger.debug("Debug message");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/DEBUG: Debug message\n/),
      );
    });

    it("warnレベルでwarnメッセージを出力する", () => {
      logger.warn("Warning message");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/WARN : Warning message\n/),
      );
    });

    it("errorレベルでerrorメッセージを出力する", () => {
      logger.error("Error message");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR: Error message\n/),
      );
    });

    it("ログレベルを動的に変更する", () => {
      logger.setLevel("error");

      logger.info("This should not appear");
      logger.error("This should appear");

      expect(mockStderr).toHaveBeenCalledTimes(1);
      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR: This should appear\n/),
      );
    });
  });

  describe("context and data", () => {
    it("コンテキスト付きでログ出力する", () => {
      logger.setContext("test-context");
      logger.info("Test message");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/\[test-context\] INFO : Test message\n/),
      );
    });

    it("verboseモードでデータを出力する", () => {
      const verboseLogger = new ConsoleLogger(true, "info");
      const testData = { key: "value", number: 42 };

      verboseLogger.info("Test with data", testData);

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/INFO : Test with data\n/),
      );
      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(
          /INFO {2}Data: {\n {2}"key": "value",\n {2}"number": 42\n}\n/,
        ),
      );
    });

    it("文字列データを出力する", () => {
      const verboseLogger = new ConsoleLogger(true, "info");

      verboseLogger.info("Test with string data", "string data");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/INFO {2}Data: string data\n/),
      );
    });
  });

  describe("timestamp formatting", () => {
    it("ISO形式のタイムスタンプを含む", () => {
      const fixedDate = new Date("2023-01-01T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      logger.info("Test message");

      expect(mockStderr).toHaveBeenCalledWith(
        "[2023-01-01T12:00:00.000Z] INFO : Test message\n",
      );
    });
  });
});

describe("StructuredLogger", () => {
  let logger: StructuredLogger;
  let mockStderr: any;

  beforeEach(() => {
    logger = new StructuredLogger(false, "info");
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    vi.useFakeTimers();

    // プロセス情報をモック
    Object.defineProperty(process, "pid", {
      value: 12345,
      configurable: true,
    });
    process.env.HOSTNAME = "test-host";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.HOSTNAME;
  });

  describe("structured logging", () => {
    it("JSON形式でログを出力する", () => {
      const fixedDate = new Date("2023-01-01T12:00:00.000Z");
      vi.setSystemTime(fixedDate);

      logger.info("Test message");

      const expectedLog = {
        timestamp: "2023-01-01T12:00:00.000Z",
        level: "info",
        message: "Test message",
        pid: 12345,
        hostname: "test-host",
      };

      expect(mockStderr).toHaveBeenCalledWith(
        `${JSON.stringify(expectedLog)}\n`,
      );
    });

    it("コンテキスト付きでログを出力する", () => {
      logger.setContext("test-context");
      logger.info("Test message");

      const logCall = mockStderr.mock.calls[0][0];
      const logEntry = JSON.parse(logCall.trim());

      expect(logEntry.context).toBe("test-context");
    });

    it("verboseモードでデータを含む", () => {
      const verboseLogger = new StructuredLogger(true, "info");
      const testData = { key: "value" };

      verboseLogger.info("Test message", testData);

      const logCall = mockStderr.mock.calls[0][0];
      const logEntry = JSON.parse(logCall.trim());

      expect(logEntry.data).toEqual(testData);
    });

    it("非verboseモードではデータを含まない", () => {
      const testData = { key: "value" };

      logger.info("Test message", testData);

      const logCall = mockStderr.mock.calls[0][0];
      const logEntry = JSON.parse(logCall.trim());

      expect(logEntry.data).toBeUndefined();
    });

    it("JSON化に失敗した場合フォールバックする", () => {
      const circularObj: any = {};
      circularObj.self = circularObj;

      const verboseLogger = new StructuredLogger(true, "info");
      verboseLogger.info("Test message", circularObj);

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message\n/,
        ),
      );
    });
  });

  describe("log levels", () => {
    it("ログレベルフィルタリングが動作する", () => {
      logger.setLevel("error");

      logger.info("This should not appear");
      logger.error("This should appear");

      expect(mockStderr).toHaveBeenCalledTimes(1);

      const logCall = mockStderr.mock.calls[0][0];
      const logEntry = JSON.parse(logCall.trim());

      expect(logEntry.level).toBe("error");
      expect(logEntry.message).toBe("This should appear");
    });
  });
});

describe("createLogger", () => {
  it("ConsoleLoggerを作成する", () => {
    const logger = createLogger("console", true, "debug");
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it("StructuredLoggerを作成する", () => {
    const logger = createLogger("structured", true, "debug");
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  it("デフォルトでConsoleLoggerを作成する", () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });
});

describe("Global Logger", () => {
  beforeEach(() => {
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
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });
});
