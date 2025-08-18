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

export type SimpleServerSetupConfig = {
  name: string;
  version: string;
  proxy: McpProxy;
};

export async function setupSimpleMcpServer(config: SimpleServerSetupConfig): Promise<void> {

  // シンプルなSDK標準のサーバーセットアップ
  const server = new Server(
    {
      name: config.name,
      version: config.version,
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


  // プロキシハンドラを設定
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const proxyRequest = {
        jsonrpc: "2.0" as const,
        id: "proxy-tools-list",
        method: "tools/list" as const,
      };
      
      const response = await config.proxy.handleRequest(proxyRequest);
      
      return response.result || { tools: [] };
    } catch (error) {
      return { tools: [] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-tools-call",
        method: "tools/call",
        params: request.params,
      });
      
      return response.result || {};
    } catch (error) {
      throw error;
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-resources-list",
        method: "resources/list",
      });
      
      return response.result || { resources: [] };
    } catch (error) {
      return { resources: [] };
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-resources-read",
        method: "resources/read",
        params: request.params,
      });
      
      return response.result || {};
    } catch (error) {
      throw error;
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-prompts-list",
        method: "prompts/list",
      });
      
      return response.result || { prompts: [] };
    } catch (error) {
      return { prompts: [] };
    }
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-prompts-get",
        method: "prompts/get",
        params: request.params,
      });
      
      return response.result || {};
    } catch (error) {
      throw error;
    }
  });

  // stdio transport で接続
  const transport = new StdioServerTransport();
  
  await server.connect(transport);

  // グレースフルシャットダウン
  process.on("SIGINT", () => {
    transport.close?.();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    transport.close?.();
    process.exit(0);
  });
}