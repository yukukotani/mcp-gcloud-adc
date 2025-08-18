import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpProxy } from "../../usecase/mcp-proxy/types.js";
import { setupMcpServer } from "./server-setup.js";

// SDK のモック
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}));

describe("server-setup", () => {
  let mockProxy: McpProxy;
  let mockTransport: any;
  let mockServer: any;
  let mockStderr: any;

  beforeEach(() => {
    mockProxy = {
      handleRequest: vi.fn() as any,
      handleMessage: vi.fn() as any,
    };

    mockTransport = {
      onmessage: undefined,
      send: vi.fn(),
      close: vi.fn(),
    };

    mockServer = {
      connect: vi.fn(),
    };

    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    vi.mocked(Server).mockImplementation(() => mockServer);
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

      expect(Server).toHaveBeenCalledWith(
        {
          name: "test-server",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
            resources: {
              subscribe: true,
              listChanged: true,
            },
            prompts: {},
            sampling: {},
          },
        },
      );
      expect(StdioServerTransport).toHaveBeenCalledOnce();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockTransport.onmessage).toBeDefined();
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

    it("リクエストメッセージを適切にプロキシする", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      const testRequest: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        method: "tools/list",
        id: 1,
        params: {},
      };

      const testResponse: JSONRPCMessage = {
        jsonrpc: "2.0" as const,
        id: 1,
        result: { tools: [] },
      };

      (mockProxy.handleRequest as any).mockResolvedValue(testResponse);

      await setupMcpServer(config);

      // onmessageハンドラーを取得して実行
      const onmessageHandler = mockTransport.onmessage;
      await onmessageHandler(testRequest);

      expect(mockProxy.handleRequest).toHaveBeenCalledWith(testRequest);
      expect(mockTransport.send).toHaveBeenCalledWith(testResponse);
      expect(mockStderr).toHaveBeenCalledWith("[Proxy] Handling: tools/list\n");
    });

    it("プロキシエラーを適切に処理する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      const testRequest: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        method: "tools/list",
        id: 1,
        params: {},
      };

      const error = new Error("Proxy error");
      (mockProxy.handleRequest as any).mockRejectedValue(error);

      await setupMcpServer(config);

      // onmessageハンドラーを取得して実行
      const onmessageHandler = mockTransport.onmessage;
      await onmessageHandler(testRequest);

      expect(mockProxy.handleRequest).toHaveBeenCalledWith(testRequest);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32603,
          message: "Proxy error: Proxy error",
        },
      });
      expect(mockStderr).toHaveBeenCalledWith(
        "[Proxy] Error: Proxy error\n",
      );
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

    it("プロキシエラー時にverboseメッセージを出力する", async () => {
      const config = {
        name: "test-server",
        version: "1.0.0",
        proxy: mockProxy,
        verbose: true,
      };

      const testRequest: JSONRPCRequest = {
        jsonrpc: "2.0" as const,
        method: "tools/list",
        id: 1,
        params: {},
      };

      const error = new Error("Test error");
      (mockProxy.handleRequest as any).mockRejectedValue(error);

      await setupMcpServer(config);

      const onmessageHandler = mockTransport.onmessage;
      await onmessageHandler(testRequest);

      expect(mockStderr).toHaveBeenCalledWith(
        "[Proxy] Handling: tools/list\n",
      );
      expect(mockStderr).toHaveBeenCalledWith(
        "[Proxy] Error: Test error\n",
      );
    });
  });
});