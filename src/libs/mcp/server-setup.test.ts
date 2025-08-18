import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpProxy } from "../../usecase/mcp-proxy/types.js";
import { setupMcpServer } from "./server-setup.js";

// Stdioトランスポートのモック
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}));

describe("server-setup", () => {
  let mockProxy: McpProxy;
  let mockTransport: any;
  let mockStderr: any;

  beforeEach(() => {
    mockProxy = {
      handleRequest: vi.fn() as any,
      handleMessage: vi.fn() as any,
    };

    mockTransport = {
      onmessage: vi.fn(),
      onerror: vi.fn(),
      onclose: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    };

    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    vi.mocked(StdioServerTransport).mockImplementation(() => mockTransport);
    vi.clearAllMocks();
  });

  describe("setupMcpServer", () => {
    it("プロキシサーバーを正しく設定する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: false,
      };

      await setupMcpServer(config);

      expect(StdioServerTransport).toHaveBeenCalledOnce();
      expect(mockTransport.onmessage).toBeDefined();
      expect(mockTransport.onerror).toBeDefined();
      expect(mockTransport.onclose).toBeDefined();
    });

    it("verboseモードで適切なログを出力する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      await setupMcpServer(config);

      expect(mockStderr).toHaveBeenCalledWith(
        "Initializing MCP proxy server: test-server v1.0.0\n",
      );
      expect(mockStderr).toHaveBeenCalledWith("MCP proxy server ready\n");
    });

    it("メッセージを適切にプロキシする", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      const testMessage: JSONRPCMessage = {
        jsonrpc: "2.0" as const,
        method: "tools/list",
        id: 1,
      };

      const testResponse: JSONRPCMessage = {
        jsonrpc: "2.0" as const,
        id: 1,
        result: { tools: [] },
      };

      (mockProxy.handleMessage as any).mockResolvedValue(testResponse);

      await setupMcpServer(config);

      // onmessageハンドラーを取得して実行
      const onmessageHandler = mockTransport.onmessage;
      await onmessageHandler(testMessage);

      expect(mockProxy.handleMessage).toHaveBeenCalledWith(testMessage);
      expect(mockTransport.send).toHaveBeenCalledWith(testResponse);
    });

    it("プロキシエラーを適切に処理する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      const testMessage: JSONRPCMessage = {
        jsonrpc: "2.0" as const,
        method: "tools/list",
        id: 1,
      };

      const error = new Error("Proxy error");
      (mockProxy.handleMessage as any).mockRejectedValue(error);

      await setupMcpServer(config);

      // onmessageハンドラーを取得して実行
      const onmessageHandler = mockTransport.onmessage;
      await onmessageHandler(testMessage);

      expect(mockProxy.handleMessage).toHaveBeenCalledWith(testMessage);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32603,
          message: "Proxy error: Proxy error",
        },
      });
    });

    it("通知メッセージを適切に処理する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: false,
      };

      const notificationMessage: JSONRPCMessage = {
        jsonrpc: "2.0" as const,
        method: "notifications/initialized",
      };

      (mockProxy.handleMessage as any).mockResolvedValue(null);

      await setupMcpServer(config);

      // onmessageハンドラーを取得して実行
      const onmessageHandler = mockTransport.onmessage;
      await onmessageHandler(notificationMessage);

      expect(mockProxy.handleMessage).toHaveBeenCalledWith(notificationMessage);
      expect(mockTransport.send).not.toHaveBeenCalled(); // 通知にはレスポンスしない
    });

    it("トランスポートエラーを適切に処理する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      await setupMcpServer(config);

      const error = new Error("Transport error");
      const onerrorHandler = mockTransport.onerror;
      onerrorHandler(error);

      expect(mockStderr).toHaveBeenCalledWith(
        "[Proxy] Transport error: Transport error\n",
      );
    });

    it("トランスポートクローズを適切に処理する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      await setupMcpServer(config);

      const oncloseHandler = mockTransport.onclose;
      oncloseHandler();

      expect(mockStderr).toHaveBeenCalledWith("[Proxy] Transport closed\n");
    });
  });
});
