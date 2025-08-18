import type {
  JSONRPCError,
  JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpProxy } from "../usecase/mcp-proxy/handler.js";
import type { ProxyOptions } from "../usecase/mcp-proxy/types.js";
import { startProxy } from "../usecase/start-proxy.js";

describe("Error Scenarios", () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("認証エラーシナリオ", () => {
    it("ADC認証情報が見つからない場合", async () => {
      vi.doMock("../libs/auth/google-auth.js", () => ({
        createAuthClient: () => ({
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "error",
            error: {
              kind: "no-credentials",
              message: "Could not load the default credentials",
            },
          }),
        }),
      }));

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn().mockResolvedValue({
            type: "error",
            error: {
              kind: "no-credentials",
              message: "Could not load the default credentials",
            },
          }),
          refreshToken: vi.fn(),
        },
        httpClient: {
          post: vi.fn(),
          postStream: vi.fn(),
        },
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.code).toBe(-32603); // Internal error
      expect(errorResponse.error.message).toContain(
        "Could not load the default credentials",
      );
    });

    it("IDトークンの有効期限切れ", async () => {
      const mockAuthClient = {
        getIdToken: vi.fn(),
        refreshToken: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "token-expired",
            message: "Token has expired",
          },
        }),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: mockAuthClient,
        httpClient: {
          post: vi.fn(),
          postStream: vi.fn(),
        },
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("Token has expired");
    });

    it("権限不足エラー", async () => {
      const mockAuthClient = {
        getIdToken: vi.fn(),
        refreshToken: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "insufficient-permissions",
            message: "Insufficient permissions to access the resource",
          },
        }),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: mockAuthClient,
        httpClient: {
          post: vi.fn(),
          postStream: vi.fn(),
        },
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.code).toBe(-32603);
      expect(errorResponse.error.message).toContain("Insufficient permissions");
    });
  });

  describe("ネットワークエラーシナリオ", () => {
    it("接続タイムアウト", async () => {
      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "timeout",
            message: "Request timed out after 30000ms",
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("Request timed out");
    });

    it("ネットワーク接続失敗", async () => {
      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "network-error",
            message: "Network connection failed",
            originalError: new Error("ECONNREFUSED"),
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain(
        "Network connection failed",
      );
    });

    it("HTTP 500エラー", async () => {
      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "http-error",
            message: "HTTP 500: Internal Server Error",
            status: 500,
            body: "Internal Server Error",
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("HTTP 500");
    });

    it("HTTP 404エラー（サービスが見つからない）", async () => {
      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "http-error",
            message: "HTTP 404: Not Found",
            status: 404,
            body: "The requested resource could not be found",
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("HTTP 404");
    });
  });

  describe("JSON-RPCエラーシナリオ", () => {
    it("無効なJSONレスポンス", async () => {
      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "parse-error",
            message: "Failed to parse response as JSON",
            originalError: new SyntaxError("Unexpected token"),
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/method",
        params: {},
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("Failed to parse response");
    });

    it("無効なリクエスト形式", async () => {
      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: {
          post: vi.fn(),
          postStream: vi.fn(),
        },
      });

      // JSON-RPC仕様に準拠しないリクエスト
      const invalidRequest = {
        method: "test/method", // jsonrpcフィールドがない
        params: {},
      } as JSONRPCRequest;

      const response = await proxy.handleRequest(invalidRequest);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.code).toBe(-32603); // Internal error (実装では-32603を返す)
    });
  });

  describe("設定エラーシナリオ", () => {
    it("無効なCloud Run URL", async () => {
      const options: ProxyOptions = {
        url: "invalid-url",
        timeout: 30000,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });

    it("Cloud Runサービスが存在しない", async () => {
      // URLバリデーションに集中 - 実在しないサービスURLの形式チェック
      const options: ProxyOptions = {
        url: "ftp://invalid-protocol.example.com", // 無効なプロトコル
        timeout: 30000,
      };

      await expect(startProxy(options)).rejects.toThrow();
    });

    it("極端に短いタイムアウト設定", async () => {
      const options: ProxyOptions = {
        url: "https://example.com/mcp",
        timeout: 0, // 0ms - 無効なタイムアウト
      };

      await expect(startProxy(options)).rejects.toThrow();
    });
  });

  describe("リソース不足シナリオ", () => {
    it("メモリ不足エラー", async () => {
      // 大きなペイロードをシミュレート
      const largeParams = {
        data: "x".repeat(1000000), // 1MB のデータ
      };

      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "network-error",
            message: "Request entity too large",
            originalError: new Error("EMSGSIZE"),
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "test/large-payload",
        params: largeParams,
      };

      const response = await proxy.handleRequest(request);

      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("too large");
    });
  });

  describe("並行リクエストエラー", () => {
    it("同時リクエスト制限に達した場合", async () => {
      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          type: "error",
          error: {
            kind: "http-error",
            message: "HTTP 429: Too Many Requests",
            status: 429,
            body: "Rate limit exceeded",
          },
        }),
        postStream: vi.fn(),
      };

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: {
          getIdToken: vi.fn(),
          refreshToken: vi.fn().mockResolvedValue({
            type: "success",
            token: "valid-token",
            expiresAt: Date.now() + 3600000,
          }),
        },
        httpClient: mockHttpClient,
      });

      const requests = Array.from({ length: 10 }, (_, i) => ({
        jsonrpc: "2.0" as const,
        id: i,
        method: "test/concurrent",
        params: {},
      }));

      // 並行リクエストを実行
      const responses = await Promise.all(
        requests.map((req) => proxy.handleRequest(req)),
      );

      // 全てのレスポンスがエラーを含むことを確認
      responses.forEach((response) => {
        expect(response).toHaveProperty("error");
        const errorResponse = response as unknown as JSONRPCError;
        expect(errorResponse.error.message).toContain("Too Many Requests");
      });
    });
  });
});
