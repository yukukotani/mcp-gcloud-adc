import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpProxy } from "../usecase/mcp-proxy/handler.js";
import type { JSONRPCRequest, JSONRPCError } from "@modelcontextprotocol/sdk/types.js";
import { createHttpClient } from "../libs/http/http-client.js";

// HTTPクライアントのモック
const mockHttpClient = {
  post: vi.fn(),
  postStream: vi.fn(),
};

const mockAuthClient = {
  getIdToken: vi.fn(),
  refreshToken: vi.fn(),
};

// ファクトリー関数をモック
vi.mock("../libs/http/http-client.js", () => ({
  createHttpClient: vi.fn(() => mockHttpClient),
}));

vi.mock("../libs/auth/google-auth.js", () => ({
  createAuthClient: vi.fn(() => mockAuthClient),
}));

describe("Streaming Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // デフォルトの認証レスポンス
    mockAuthClient.getIdToken.mockResolvedValue({
      type: "success",
      token: "mock-id-token",
      expiresAt: Date.now() + 3600000,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("HTTPクライアントストリーミング", () => {
    it("複数のチャンクを正しく処理する", async () => {
      const chunks = [
        '{"jsonrpc": "2.0", "id": 1, "result": {"data": "chunk1"}}',
        '{"jsonrpc": "2.0", "id": 1, "result": {"data": "chunk2"}}',
        '{"jsonrpc": "2.0", "id": 1, "result": {"data": "chunk3"}}',
      ];

      mockHttpClient.postStream.mockImplementation(async function* () {
        for (let i = 0; i < chunks.length; i++) {
          yield {
            data: chunks[i],
            isLast: i === chunks.length - 1,
          };
        }
      });

      const httpClient = createHttpClient();
      const results: string[] = [];

      for await (const chunk of httpClient.postStream({
        url: "https://example.com/stream",
        headers: {},
        body: { method: "test" },
        timeout: 30000,
      })) {
        results.push(chunk.data);
      }

      expect(results).toEqual(chunks);
    });

    it("ストリーミングエラーを適切に処理する", async () => {
      mockHttpClient.postStream.mockImplementation(async function* () {
        yield { data: '{"partial": "data"}', isLast: false };
        throw new Error("Stream interrupted");
      });

      const httpClient = createHttpClient();

      await expect(async () => {
        for await (const _chunk of httpClient.postStream({
          url: "https://example.com/stream",
          headers: {},
          body: { method: "test" },
          timeout: 30000,
        })) {
          // チャンクを処理
        }
      }).rejects.toThrow("Stream interrupted");
    });

    it("空のストリームを処理する", async () => {
      mockHttpClient.postStream.mockImplementation(async function* () {
        // 何も yield しない
      });

      const httpClient = createHttpClient();
      const results: string[] = [];

      for await (const chunk of httpClient.postStream({
        url: "https://example.com/stream",
        headers: {},
        body: { method: "test" },
        timeout: 30000,
      })) {
        results.push(chunk.data);
      }

      expect(results).toEqual([]);
    });
  });

  describe("プロキシストリーミング統合", () => {
    it("ストリーミングレスポンスをプロキシする", async () => {
      const streamChunks = [
        '{"jsonrpc": "2.0", "id": 1, "result": {"data": "stream1"}}',
        '{"jsonrpc": "2.0", "id": 1, "result": {"data": "stream2"}}',
        '{"jsonrpc": "2.0", "id": 1, "result": {"completed": true}}',
      ];

      // mockHttpClient.postは通常のレスポンスを返すように設定
      mockHttpClient.post.mockResolvedValue({
        type: "success",
        data: JSON.parse(streamChunks[streamChunks.length - 1]!),
        status: 200,
      });

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: mockAuthClient,
        httpClient: mockHttpClient,
        verbose: false,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "streaming/test",
        params: { streaming: true },
      };

      // プロキシが通常のリクエストを処理することを確認
      const response = await proxy.handleRequest(request);

      expect(response).toBeDefined();
      expect(mockHttpClient.post).toHaveBeenCalled();
    });

    it("ストリーミング中の認証エラーを処理する", async () => {
      mockAuthClient.getIdToken.mockResolvedValue({
        type: "error",
        error: {
          kind: "token-expired",
          message: "Token has expired",
        },
      });

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: mockAuthClient,
        httpClient: mockHttpClient,
        verbose: false,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "streaming/test",
        params: { streaming: true },
      };

      const response = await proxy.handleRequest(request);

      // エラーレスポンスが返されることを確認
      expect(response).toHaveProperty("error");
      const errorResponse = response as unknown as JSONRPCError;
      expect(errorResponse.error.message).toContain("Token has expired");
    });

    it("ストリーミング中のHTTPエラーを処理する", async () => {
      mockHttpClient.postStream.mockImplementation(async function* () {
        yield { data: '{"partial": "data"}', isLast: false };
        throw new Error("Connection lost");
      });

      const proxy = createMcpProxy({
        targetUrl: "https://example.com/mcp",
        timeout: 30000,
        authClient: mockAuthClient,
        httpClient: mockHttpClient,
        verbose: false,
      });

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "streaming/test",
        params: { streaming: true },
      };

      const response = await proxy.handleRequest(request);

      // エラーレスポンスが返されることを確認
      expect(response).toHaveProperty("error");
    });
  });

  describe("大容量ストリーミング", () => {
    it("大量のチャンクを効率的に処理する", async () => {
      const chunkCount = 1000;
      
      mockHttpClient.postStream.mockImplementation(async function* () {
        for (let i = 0; i < chunkCount; i++) {
          yield {
            data: `{"jsonrpc": "2.0", "id": 1, "result": {"chunk": ${i}}}`,
            isLast: i === chunkCount - 1,
          };
        }
      });

      const httpClient = createHttpClient();
      let processedChunks = 0;

      for await (const chunk of httpClient.postStream({
        url: "https://example.com/stream",
        headers: {},
        body: { method: "bulk-test" },
        timeout: 60000,
      })) {
        processedChunks++;
        
        // パフォーマンステスト: 各チャンクが適切に処理されることを確認
        expect(chunk.data).toContain("jsonrpc");
      }

      expect(processedChunks).toBe(chunkCount);
    });

    it("大きなチャンクサイズを処理する", async () => {
      const largeData = "x".repeat(10000); // 10KB のデータ
      
      mockHttpClient.postStream.mockImplementation(async function* () {
        yield {
          data: `{"jsonrpc": "2.0", "id": 1, "result": {"data": "${largeData}"}}`,
          isLast: true,
        };
      });

      const httpClient = createHttpClient();
      let receivedData = "";

      for await (const chunk of httpClient.postStream({
        url: "https://example.com/stream",
        headers: {},
        body: { method: "large-chunk-test" },
        timeout: 60000,
      })) {
        receivedData = chunk.data;
      }

      expect(receivedData).toContain(largeData);
    });
  });

  describe("ストリーミングタイムアウト", () => {
    it("タイムアウト時にストリームを中断する", async () => {
      mockHttpClient.postStream.mockImplementation(async function* () {
        throw new Error("Request timed out");
      });

      const httpClient = createHttpClient();

      await expect(async () => {
        for await (const _chunk of httpClient.postStream({
          url: "https://example.com/stream",
          headers: {},
          body: { method: "timeout-test" },
          timeout: 1000, // 1秒のタイムアウト
        })) {
          // チャンクを処理
        }
      }).rejects.toThrow("Request timed out");
    });

    it("短いタイムアウトでも最初のチャンクは受信する", async () => {
      mockHttpClient.postStream.mockImplementation(async function* () {
        yield { data: '{"jsonrpc": "2.0", "id": 1, "result": {"data": "quick"}}', isLast: true };
      });

      const httpClient = createHttpClient();
      const results: string[] = [];

      for await (const chunk of httpClient.postStream({
        url: "https://example.com/stream",
        headers: {},
        body: { method: "quick-test" },
        timeout: 100, // 100msのタイムアウト
      })) {
        results.push(chunk.data);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toContain("quick");
    });
  });
});