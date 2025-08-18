import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupMcpServer, connectStdioTransport } from './server-setup.js';
import type { McpProxy } from '../../usecase/mcp-proxy/types.js';
import type { JSONRPCRequest, JSONRPCResponse } from '@modelcontextprotocol/sdk/types.js';

// MCPサーバーのモック
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

describe('server-setup', () => {
  let mockProxy: McpProxy;
  let mockServer: any;
  let mockTransport: any;

  beforeEach(() => {
    mockProxy = {
      handleRequest: vi.fn(),
      handleMessage: vi.fn(),
    };

    mockServer = {
      setRequestHandler: vi.fn(),
      setNotificationHandler: vi.fn(),
      connect: vi.fn(),
    };

    mockTransport = {};

    vi.mocked(Server).mockImplementation(() => mockServer);
    vi.mocked(StdioServerTransport).mockImplementation(() => mockTransport);
    vi.clearAllMocks();
  });

  describe('setupMcpServer', () => {
    it('MCPサーバーを正しく設定する', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        proxy: mockProxy,
        verbose: false,
      };

      const server = await setupMcpServer(config);

      expect(Server).toHaveBeenCalledWith(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
            logging: {},
          },
        }
      );

      expect(server).toBe(mockServer);

      // リクエストハンドラーが設定されているか確認
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('initialize', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('tools/list', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('tools/call', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('resources/list', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('resources/read', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('prompts/list', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('prompts/get', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('logging/setLevel', expect.any(Function));

      // 通知ハンドラーが設定されているか確認
      expect(mockServer.setNotificationHandler).toHaveBeenCalledWith('notifications/cancelled', expect.any(Function));
      expect(mockServer.setNotificationHandler).toHaveBeenCalledWith('notifications/progress', expect.any(Function));
    });

    it('verboseモードでログを出力する', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        proxy: mockProxy,
        verbose: true,
      };

      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await setupMcpServer(config);

      expect(mockStderr).toHaveBeenCalledWith('Initializing MCP server: test-server v1.0.0\n');
    });

    it('initializeハンドラーがプロキシを呼び出す', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        proxy: mockProxy,
      };

      await setupMcpServer(config);

      const initializeHandler = mockServer.setRequestHandler.mock.calls
        .find(([method]) => method === 'initialize')?.[1];

      expect(initializeHandler).toBeDefined();

      const mockRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };

      const mockResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {},
      };

      vi.mocked(mockProxy.handleRequest).mockResolvedValue(mockResponse);

      const result = await initializeHandler(mockRequest);

      expect(mockProxy.handleRequest).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });

    it('tools/listハンドラーがプロキシを呼び出す', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        proxy: mockProxy,
        verbose: true,
      };

      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await setupMcpServer(config);

      const toolsListHandler = mockServer.setRequestHandler.mock.calls
        .find(([method]) => method === 'tools/list')?.[1];

      expect(toolsListHandler).toBeDefined();

      const mockRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      const mockResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [] },
      };

      vi.mocked(mockProxy.handleRequest).mockResolvedValue(mockResponse);

      const result = await toolsListHandler(mockRequest);

      expect(mockProxy.handleRequest).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
      expect(mockStderr).toHaveBeenCalledWith('Received tools/list request\n');
    });

    it('tools/callハンドラーがプロキシを呼び出す', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        proxy: mockProxy,
        verbose: true,
      };

      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await setupMcpServer(config);

      const toolsCallHandler = mockServer.setRequestHandler.mock.calls
        .find(([method]) => method === 'tools/call')?.[1];

      expect(toolsCallHandler).toBeDefined();

      const mockRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'test-tool' },
      };

      const mockResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { content: [] },
      };

      vi.mocked(mockProxy.handleRequest).mockResolvedValue(mockResponse);

      const result = await toolsCallHandler(mockRequest);

      expect(mockProxy.handleRequest).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
      expect(mockStderr).toHaveBeenCalledWith('Received tools/call request: test-tool\n');
    });

    it('通知ハンドラーがプロキシを呼び出す', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        proxy: mockProxy,
        verbose: true,
      };

      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await setupMcpServer(config);

      const cancelledHandler = mockServer.setNotificationHandler.mock.calls
        .find(([method]) => method === 'notifications/cancelled')?.[1];

      expect(cancelledHandler).toBeDefined();

      const mockNotification = {
        jsonrpc: '2.0',
        method: 'notifications/cancelled',
        params: {},
      };

      vi.mocked(mockProxy.handleMessage).mockResolvedValue(mockNotification);

      await cancelledHandler(mockNotification);

      expect(mockProxy.handleMessage).toHaveBeenCalledWith(mockNotification);
      expect(mockStderr).toHaveBeenCalledWith('Received cancelled notification\n');
    });
  });

  describe('connectStdioTransport', () => {
    it('サーバーをstdioトランスポートに接続する', async () => {
      await connectStdioTransport(mockServer, false);

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it('verboseモードでログを出力する', async () => {
      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await connectStdioTransport(mockServer, true);

      expect(mockStderr).toHaveBeenCalledWith('Connecting to stdio transport\n');
      expect(mockStderr).toHaveBeenCalledWith('MCP server connected and ready\n');
    });
  });
});