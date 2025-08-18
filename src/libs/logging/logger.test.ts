import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createContextLogger,
  createLogger,
  createPinoLogger,
  getGlobalLogger,
  setGlobalLogger,
} from "./logger.js";

describe("createPinoLogger", () => {
  const testLogFile = "./test-log.log";

  afterEach(() => {
    // テスト用ログファイルをクリーンアップ
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
    vi.restoreAllMocks();
  });

  it("デフォルト設定でファイル出力のpinoロガーを作成する", () => {
    const logger = createPinoLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("pretty形式でロガーを作成する", () => {
    const mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const logger = createPinoLogger({ type: "pretty", level: "info" });
    expect(logger).toBeDefined();

    logger.info("Test pretty message");
    // Prettty形式はstderrに出力される
    expect(mockStderr).toHaveBeenCalled();
  });

  it("json形式でロガーを作成する", () => {
    const mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const logger = createPinoLogger({ type: "json", level: "info" });
    expect(logger).toBeDefined();

    logger.info("Test json message");
    // JSON形式はstderrに出力される
    expect(mockStderr).toHaveBeenCalled();
  });

  it("file形式でロガーを作成する", () => {
    const logger = createPinoLogger({
      type: "file",
      level: "info",
      filePath: testLogFile,
    });
    expect(logger).toBeDefined();

    logger.info("Test file message");

    // ファイルが作成されることを確認（非同期のため少し待機）
    setTimeout(() => {
      expect(fs.existsSync(testLogFile)).toBe(true);
    }, 100);
  });

  it("コンテキスト付きでロガーを作成する", () => {
    const logger = createPinoLogger({
      context: "test-context",
      type: "file",
      filePath: testLogFile,
    });
    expect(logger).toBeDefined();

    logger.info("Test message");
  });
});

describe("createLogger", () => {
  const testLogFile = "./test-legacy.log";

  afterEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
    vi.restoreAllMocks();
  });

  it("consoleタイプでpinoロガーを作成する", () => {
    const logger = createLogger("console", "debug");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("structuredタイプでpinoロガーを作成する", () => {
    const logger = createLogger("structured", "debug");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("fileタイプでpinoロガーを作成する", () => {
    const logger = createLogger("file", "info", "test", testLogFile);
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("デフォルトでfile形式のpinoロガーを作成する", () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("コンテキスト付きでロガーを作成する", () => {
    const logger = createLogger("console", "info", "test-context");
    expect(logger).toBeDefined();
  });
});

describe("createContextLogger", () => {
  const testLogFile = "./test-context.log";

  afterEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  it("コンテキスト名付きのロガーを作成する", () => {
    const logger = createContextLogger("my-component");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });

  it("ログタイプを指定できる", () => {
    const prettyLogger = createContextLogger("component", "pretty");
    const jsonLogger = createContextLogger("component", "json");
    const fileLogger = createContextLogger("component", "file", testLogFile);

    expect(prettyLogger).toBeDefined();
    expect(jsonLogger).toBeDefined();
    expect(fileLogger).toBeDefined();
  });
});

describe("Global Logger", () => {
  afterEach(() => {
    // グローバルロガーをリセット
    setGlobalLogger(createLogger("file", "info"));
  });

  it("グローバルロガーを設定する", () => {
    const customLogger = createLogger("structured", "debug");
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

describe("Log Output Integration", () => {
  const testLogFile = "./test-integration.log";

  afterEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
    vi.restoreAllMocks();
  });

  it("ファイル出力の基本動作", () => {
    const logger = createPinoLogger({
      type: "file",
      filePath: testLogFile,
      level: "info",
    });

    logger.info("Test file output");

    // ロガーが作成されることを確認
    expect(logger).toBeDefined();
  });

  it("pretty出力はstderrに送られる", () => {
    const mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const logger = createPinoLogger({ type: "pretty" });
    logger.info("Test stderr output");

    expect(mockStderr).toHaveBeenCalled();
  });

  it("JSON出力はstderrに送られる", () => {
    const mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const logger = createPinoLogger({ type: "json" });
    logger.info("Test json stderr output");

    expect(mockStderr).toHaveBeenCalled();
  });
});
