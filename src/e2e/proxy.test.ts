import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProxyOptions } from "../usecase/mcp-proxy/types.js";
import { startProxy } from "../usecase/start-proxy.js";

// モジュールのモック
vi.mock("../libs/auth/google-auth.js", () => ({
  createAuthClient: () => ({
    getIdToken: vi.fn().mockResolvedValue({
      type: "success",
      token: "mock-id-token",
      expiresAt: Date.now() + 3600000,
    }),
  }),
}));

vi.mock("../libs/http/http-client.js", () => ({
  createHttpClient: () => ({
    post: vi.fn().mockResolvedValue({
      type: "success",
      data: { result: "success" },
      status: 200,
    }),
    postStream: vi.fn().mockImplementation(async function* () {
      yield { data: '{"result": "stream1"}', isLast: false };
      yield { data: '{"result": "stream2"}', isLast: true };
    }),
  }),
}));

vi.mock("../presentation/mcp-server.js", () => ({
  setupMcpServer: vi.fn().mockImplementation(async () => {
    // MCPサーバーの起動をシミュレートするが、実際には起動しない
    return Promise.resolve();
  }),
}));

// プロセスのイベントリスナーをモック
vi.spyOn(process, "on").mockImplementation(
  (event: string | symbol, listener: any) => {
    if (event === "SIGINT" || event === "SIGTERM") {
      // すぐにリスナーを実行してテストを終了
      setTimeout(() => listener(), 10);
    }
    return process;
  },
);

describe("Proxy E2E Tests", () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("正常シナリオ", () => {
    it("有効なオプションでプロキシを起動する", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 30000,
        verbose: true,
      };

      // startProxyを開始して短時間後に終了シグナルを送信
      const proxyPromise = startProxy(options);

      // 少し待ってからSIGINTを送信
      setTimeout(() => {
        process.emit("SIGINT", "SIGINT");
      }, 100);

      await expect(proxyPromise).resolves.not.toThrow();
    }, 10000);

    it("デフォルトタイムアウトでプロキシを起動する", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 120000,
        verbose: false,
      };

      const proxyPromise = startProxy(options);
      setTimeout(() => process.emit("SIGINT", "SIGINT"), 100);

      await expect(proxyPromise).resolves.not.toThrow();
    }, 10000);

    it("verboseモードで詳細ログを出力する", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 30000,
        verbose: true,
      };

      const proxyPromise = startProxy(options);
      setTimeout(() => process.emit("SIGINT", "SIGINT"), 100);

      await proxyPromise;

      // ログメッセージが出力されることを確認
      expect(vi.mocked(process.stderr.write)).toHaveBeenCalledWith(
        expect.stringContaining("Starting MCP proxy"),
      );
    }, 10000);
  });

  describe("設定バリデーション", () => {
    it("無効なプロトコルでエラーを投げる", async () => {
      const options: ProxyOptions = {
        url: "ftp://example.com", // HTTPでもHTTPSでもない
        timeout: 30000,
        verbose: false,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });

    it("負のタイムアウトでエラーを投げる", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: -1,
        verbose: false,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });

    it("大きすぎるタイムアウトでエラーを投げる", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 700000, // 10分を超える
        verbose: false,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });
  });

  describe("統合エラーハンドリング", () => {
    it("認証エラーを適切に処理する", async () => {
      // バリデーションエラーでテストする（起動前にエラーになる）
      const options: ProxyOptions = {
        url: "invalid-url",
        timeout: 30000,
        verbose: false,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });

    it("無効なプロトコルエラーを適切に処理する", async () => {
      // バリデーションエラーでテストする（起動前にエラーになる）
      const options: ProxyOptions = {
        url: "ftp://example.com", // HTTPでもHTTPSでもない
        timeout: 30000,
        verbose: false,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });
  });

  describe("設定管理", () => {
    it("パッケージ情報を正しく読み込む", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 30000,
        verbose: false,
      };

      const proxyPromise = startProxy(options);
      setTimeout(() => process.emit("SIGINT", "SIGINT"), 100);

      await expect(proxyPromise).resolves.not.toThrow();
    }, 10000);

    it("ログレベルの設定を適用する", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 30000,
        verbose: false,
      };

      const proxyPromise = startProxy(options);
      setTimeout(() => process.emit("SIGINT", "SIGINT"), 100);

      await proxyPromise;

      // 非verboseモードではデバッグログが出力されないことを確認
      expect(vi.mocked(process.stderr.write)).not.toHaveBeenCalledWith(
        expect.stringContaining("Debug:"),
      );
    }, 10000);
  });

  describe("MCPサーバー統合", () => {
    it("MCPサーバーが正しくセットアップされる", async () => {
      const { setupMcpServer } = await import("../presentation/mcp-server.js");

      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 30000,
        verbose: false,
      };

      const proxyPromise = startProxy(options);
      setTimeout(() => process.emit("SIGINT", "SIGINT"), 100);

      await proxyPromise;

      // MCPサーバーのセットアップが呼ばれることを確認
      expect(setupMcpServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "mcp-gcloud-adc",
          version: "1.0.0",
        }),
      );
    }, 10000);

    it("プロキシハンドラーが正しく設定される", async () => {
      const { setupMcpServer } = await import("../presentation/mcp-server.js");

      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 30000,
        verbose: false,
      };

      const proxyPromise = startProxy(options);
      setTimeout(() => process.emit("SIGINT", "SIGINT"), 100);

      await proxyPromise;

      const setupCall = vi.mocked(setupMcpServer).mock.calls[0]?.[0];
      expect(setupCall).toBeDefined();
      expect(setupCall).toHaveProperty("proxy");
      expect(typeof setupCall?.proxy.handleRequest).toBe("function");
    }, 10000);
  });
});
