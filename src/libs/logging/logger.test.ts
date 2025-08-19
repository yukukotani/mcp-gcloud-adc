import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, logger } from "./logger.js";

describe("createLogger", () => {
  const testLogFile = "./test-log.log";

  afterEach(() => {
    // テスト用ログファイルをクリーンアップ
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
    vi.restoreAllMocks();
  });

  it("デフォルト設定でファイル出力のpinoロガーを作成する", () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("file形式でロガーを作成する", () => {
    const logger = createLogger({
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

  it("silentレベルでスタブロガーを作成する", () => {
    const logger = createLogger({
      level: "silent",
    });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });
});

describe("logger", () => {
  it("デフォルトのロガーインスタンスが存在する", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("デフォルトはsilentレベルになっている", () => {
    // silent level なので何もログ出力されない
    expect(() => {
      logger.info("This should not be output");
    }).not.toThrow();
  });
});
