import type {
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../../libs/auth/types.js";
import type { HttpClient } from "../../libs/http/types.js";
import { createMcpProxy } from "./handler.js";
import type { ProxyConfig } from "./types.js";

describe("McpProxy", () => {
  let mockAuthClient: AuthClient;
  let mockHttpClient: HttpClient;
  let config: ProxyConfig;
  let proxy: ReturnType<typeof createMcpProxy>;

  beforeEach(() => {
    mockAuthClient = {
      getIdToken: vi.fn(),
      refreshToken: vi.fn(),
    };

    mockHttpClient = {
      post: vi.fn(),
      postStream: vi.fn(),
    };

    config = {
      targetUrl: "https://example.com/api",
      timeout: 5000,
      authClient: mockAuthClient,
      httpClient: mockHttpClient,
    };

    proxy = createMcpProxy(config);
  });

  describe("handleRequest", () => {
    it("成功したリクエストを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      const expectedResponse: JSONRPCResponse = {
        jsonrpc: "2.0" as const,
        id: 1,
        result: { tools: [] },
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "success",
        data: expectedResponse,
        status: 200,
        headers: {},
      });

      const result = await proxy.handleRequest(request);

      expect(mockAuthClient.getIdToken).toHaveBeenCalledWith(
        "https://example.com/api",
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith({
        url: "https://example.com/api",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: request,
        timeout: 5000,
      });
      expect(result).toEqual(expectedResponse);
    });

    it("認証エラーを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "error",
        error: {
          kind: "no-credentials",
          message: "No credentials found",
        },
      });

      const result = await proxy.handleRequest(request);

      expect(result).toEqual({
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32603,
          message: "Authentication failed: No credentials found",
          data: {
            kind: "no-credentials",
            message: "No credentials found",
          },
        },
      });
    });

    it("HTTPエラーを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "error",
        error: {
          kind: "http-error",
          status: 404,
          message: "Not Found",
          body: "Resource not found",
        },
      });

      const result = await proxy.handleRequest(request);

      expect(result).toEqual({
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32601,
          message: "HTTP error: Not Found",
          data: {
            kind: "http-error",
            status: 404,
            body: "Resource not found",
          },
        },
      });
    });

    it("ネットワークエラーを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "error",
        error: {
          kind: "network-error",
          message: "Connection failed",
        },
      });

      const result = await proxy.handleRequest(request);

      expect(result).toEqual({
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32603,
          message: "Network error: Connection failed",
          data: {
            kind: "network-error",
          },
        },
      });
    });

    it("タイムアウトエラーを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "error",
        error: {
          kind: "timeout",
          message: "Request timed out after 5000ms",
        },
      });

      const result = await proxy.handleRequest(request);

      expect(result).toEqual({
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32603,
          message: "Request timeout: Request timed out after 5000ms",
          data: {
            kind: "timeout",
          },
        },
      });
    });

    it("無効なレスポンス形式を処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "success",
        data: { invalid: "response" },
        status: 200,
        headers: {},
      });

      const result = await proxy.handleRequest(request);

      expect(result).toEqual({
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32603,
          message: "Invalid response format from target server",
          data: {
            received: { invalid: "response" },
          },
        },
      });
    });

    it("予期しないエラーを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const result = await proxy.handleRequest(request);

      expect(result).toEqual({
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32603,
          message: "Internal error: Unexpected error",
          data: expect.any(Error),
        },
      });
    });
  });

  describe("handleMessage", () => {
    it("リクエストメッセージを処理する", async () => {
      const request: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        id: 1,
        method: "tools/list",
        params: {},
      };

      const expectedResponse: JSONRPCResponse = {
        jsonrpc: "2.0" as const,
        id: 1,
        result: { tools: [] },
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "success",
        data: expectedResponse,
        status: 200,
        headers: {},
      });

      const result = await proxy.handleMessage(request);

      expect(result).toEqual(expectedResponse);
    });

    it("通知メッセージを処理する", async () => {
      const notification = {
        jsonrpc: "2.0" as const,
        method: "notifications/cancelled",
        params: {},
      };

      vi.mocked(mockAuthClient.getIdToken).mockResolvedValue({
        type: "success",
        token: "mock-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      vi.mocked(mockHttpClient.post).mockResolvedValue({
        type: "success",
        data: null,
        status: 200,
        headers: {},
      });

      const result = await proxy.handleMessage(notification);

      expect(result).toEqual(notification);
      expect(mockHttpClient.post).toHaveBeenCalledWith({
        url: "https://example.com/api",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: notification,
        timeout: 5000,
      });
    });
  });
});

describe("createMcpProxy", () => {
  it("McpProxyのインスタンスを作成する", () => {
    const config: ProxyConfig = {
      targetUrl: "https://example.com/api",
      timeout: 5000,
      authClient: {} as AuthClient,
      httpClient: {} as HttpClient,
    };

    const proxy = createMcpProxy(config);
    expect(proxy).toBeTruthy();
    expect(typeof proxy.handleRequest).toBe("function");
    expect(typeof proxy.handleMessage).toBe("function");
  });
});
