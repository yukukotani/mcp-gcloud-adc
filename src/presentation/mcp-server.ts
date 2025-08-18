import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpProxy } from "../usecase/mcp-proxy/types.js";

export type ServerSetupConfig = {
  name: string;
  version: string;
  proxy: McpProxy;
  verbose?: boolean;
};

export async function setupMcpServer(config: ServerSetupConfig): Promise<void> {
  if (config.verbose) {
    process.stderr.write(
      `Initializing MCP proxy server: ${config.name} v${config.version}\n`,
    );
  }

  // SDKのServerクラスを使用してプロキシサーバーを作成
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        // プロキシサーバーとして、全ての機能をサポート
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

  const transport = new StdioServerTransport();

  // まずサーバーを接続してから、カスタムメッセージハンドリングを追加
  await server.connect(transport);

  // MCP プロトコルに準拠したハンドラを追加
  // initialize メッセージなど標準的なMCPメッセージは標準処理に任せ、
  // tools/, resources/, prompts/ のみプロキシに転送

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const proxyResponse = await config.proxy.handleRequest({
      jsonrpc: "2.0", 
      id: Math.random(),
      method: "tools/list",
    });
    return proxyResponse.result || { tools: [] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const proxyResponse = await config.proxy.handleRequest({
      jsonrpc: "2.0",
      id: Math.random(),
      method: "tools/call",
      params: request.params,
    });
    return proxyResponse.result || {};
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const proxyResponse = await config.proxy.handleRequest({
      jsonrpc: "2.0",
      id: Math.random(),
      method: "resources/list",
    });
    return proxyResponse.result || { resources: [] };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const proxyResponse = await config.proxy.handleRequest({
      jsonrpc: "2.0",
      id: Math.random(),
      method: "resources/read",
      params: request.params,
    });
    return proxyResponse.result || {};
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const proxyResponse = await config.proxy.handleRequest({
      jsonrpc: "2.0",
      id: Math.random(),
      method: "prompts/list",
    });
    return proxyResponse.result || { prompts: [] };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const proxyResponse = await config.proxy.handleRequest({
      jsonrpc: "2.0",
      id: Math.random(),
      method: "prompts/get",
      params: request.params,
    });
    return proxyResponse.result || {};
  });

  if (config.verbose) {
    process.stderr.write("MCP proxy server ready\n");
  }

  // プロセス終了時のクリーンアップ
  process.on("SIGINT", () => {
    if (config.verbose) {
      process.stderr.write("\n[Proxy] Shutting down...\n");
    }
    transport.close?.();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (config.verbose) {
      process.stderr.write("[Proxy] Terminating...\n");
    }
    transport.close?.();
    process.exit(0);
  });
}

// 後方互換性のため
export async function connectStdioTransport(
  _server: unknown,
  verbose?: boolean,
): Promise<void> {
  if (verbose) {
    process.stderr.write(
      "Legacy connectStdioTransport called - use setupMcpServer instead\n",
    );
  }
}
