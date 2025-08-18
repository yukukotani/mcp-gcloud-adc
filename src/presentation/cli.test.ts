import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startProxy } from "../usecase/start-proxy.js";
import {
  type CliOptions,
  executeProxyCommand,
  validateCliOptions,
} from "./cli.js";

// モジュールのモック
vi.mock("../usecase/start-proxy.js", () => ({
  startProxy: vi.fn(),
}));

describe("CLI", () => {
  let mockStderr: any;
  let mockExit: any;

  beforeEach(() => {
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("バリデーション", () => {
    it("有効なオプションを受け入れる", () => {
      expect(() =>
        validateCliOptions({
          url: "https://example.com",
          timeout: 60000,
        }),
      ).not.toThrow();
    });

    it("HTTPとHTTPSの両方を受け入れる", () => {
      expect(() =>
        validateCliOptions({
          url: "http://example.com",
          timeout: 60000,
        }),
      ).not.toThrow();

      expect(() =>
        validateCliOptions({
          url: "https://example.com",
          timeout: 60000,
        }),
      ).not.toThrow();
    });

    it("無効なURL形式を拒否する", () => {
      expect(() =>
        validateCliOptions({
          url: "https://[invalid-url",
          timeout: 60000,
        }),
      ).toThrow("Invalid URL format");
    });

    it("負のタイムアウトを拒否する", () => {
      expect(() =>
        validateCliOptions({
          url: "https://example.com",
          timeout: -1,
        }),
      ).toThrow("Timeout must be positive");
    });

    it("大きすぎるタイムアウトを拒否する", () => {
      expect(() =>
        validateCliOptions({
          url: "https://example.com",
          timeout: 700000,
        }),
      ).toThrow("Timeout cannot exceed 10 minutes (600000ms)");
    });
  });

  describe("executeProxyCommand", () => {
    it("有効なオプションでstartProxyを呼び出す", async () => {
      const options: CliOptions = {
        url: "https://example.com",
        timeout: 60000,
      };
      vi.mocked(startProxy).mockResolvedValue({ type: "success" });

      await executeProxyCommand(options);

      expect(vi.mocked(startProxy)).toHaveBeenCalledWith(options);
    });

    it("ログ出力を適切に処理する", async () => {
      const options: CliOptions = {
        url: "https://example.com",
        timeout: 120000,
      };
      vi.mocked(startProxy).mockResolvedValue({ type: "success" });

      await executeProxyCommand(options);

      // プロキシが正しいオプションで呼び出されることを確認
      expect(vi.mocked(startProxy)).toHaveBeenCalledWith({
        url: "https://example.com",
        timeout: 120000,
      });
    });

    it("startProxyのエラーを処理する", async () => {
      const options: CliOptions = {
        url: "https://example.com",
        timeout: 120000,
      };
      vi.mocked(startProxy).mockResolvedValue({
        type: "error",
        error: { kind: "connection-error", message: "Connection failed" },
      });

      await executeProxyCommand(options);

      expect(mockStderr).toHaveBeenCalledWith(
        "Failed to start proxy: Connection failed\n",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("予期しないエラーを処理する", async () => {
      const options: CliOptions = {
        url: "https://example.com",
        timeout: 120000,
      };
      vi.mocked(startProxy).mockResolvedValue({
        type: "error",
        error: { kind: "unknown-error", message: "Unknown error" },
      });

      await executeProxyCommand(options);

      expect(mockStderr).toHaveBeenCalledWith(
        "Failed to start proxy: Unknown error\n",
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("無効なプロトコルでバリデーションエラーを投げる", async () => {
      const options: CliOptions = {
        url: "ftp://example.com", // HTTPでもHTTPSでもない
        timeout: 120000,
      };

      await expect(executeProxyCommand(options)).rejects.toThrow(
        "URL must be HTTP or HTTPS",
      );
    });
  });
});
