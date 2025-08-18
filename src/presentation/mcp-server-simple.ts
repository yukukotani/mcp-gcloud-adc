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
  verbose?: boolean;
};

export async function setupSimpleMcpServer(config: SimpleServerSetupConfig): Promise<void> {
  if (config.verbose) {
    process.stderr.write(
      `Setting up simple MCP proxy server: ${config.name} v${config.version}\n`,
    );
  }

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

  // すべてのリクエストを詳細にログ出力するためのハンドラー
  if (config.verbose) {
    const originalSetRequestHandler = server.setRequestHandler.bind(server);
    server.setRequestHandler = (schema: any, handler: any) => {
      const wrappedHandler = async (request: any) => {
        process.stderr.write(`[DEBUG] Incoming request: ${schema.properties?.method?.const || 'unknown'}\n`);
        process.stderr.write(`[DEBUG] Request details: ${JSON.stringify(request, null, 2)}\n`);
        const result = await handler(request);
        process.stderr.write(`[DEBUG] Response: ${JSON.stringify(result, null, 2)}\n`);
        return result;
      };
      return originalSetRequestHandler(schema, wrappedHandler);
    };
  }

  // プロキシハンドラを設定
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    if (config.verbose) {
      process.stderr.write(`[DEBUG] tools/list request received\n`);
    }
    try {
      const proxyRequest = {
        jsonrpc: "2.0" as const,
        id: "proxy-tools-list",
        method: "tools/list" as const,
      };
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] Sending proxy request: ${JSON.stringify(proxyRequest)}\n`);
      }
      
      const response = await config.proxy.handleRequest(proxyRequest);
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] Proxy response: ${JSON.stringify(response)}\n`);
      }
      
      return response.result || { tools: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ERROR] tools/list failed: ${errorMessage}\n`);
      if (error instanceof Error && error.stack) {
        process.stderr.write(`[ERROR] Stack trace: ${error.stack}\n`);
      }
      return { tools: [] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (config.verbose) {
      process.stderr.write(`[DEBUG] tools/call request received: ${JSON.stringify(request.params)}\n`);
    }
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-tools-call",
        method: "tools/call",
        params: request.params,
      });
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] tools/call response: ${JSON.stringify(response)}\n`);
      }
      
      return response.result || {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ERROR] tools/call failed: ${errorMessage}\n`);
      throw error;
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    if (config.verbose) {
      process.stderr.write(`[DEBUG] resources/list request received\n`);
    }
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-resources-list",
        method: "resources/list",
      });
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] resources/list response: ${JSON.stringify(response)}\n`);
      }
      
      return response.result || { resources: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ERROR] resources/list failed: ${errorMessage}\n`);
      return { resources: [] };
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (config.verbose) {
      process.stderr.write(`[DEBUG] resources/read request received: ${JSON.stringify(request.params)}\n`);
    }
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-resources-read",
        method: "resources/read",
        params: request.params,
      });
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] resources/read response: ${JSON.stringify(response)}\n`);
      }
      
      return response.result || {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ERROR] resources/read failed: ${errorMessage}\n`);
      throw error;
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    if (config.verbose) {
      process.stderr.write(`[DEBUG] prompts/list request received\n`);
    }
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-prompts-list",
        method: "prompts/list",
      });
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] prompts/list response: ${JSON.stringify(response)}\n`);
      }
      
      return response.result || { prompts: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ERROR] prompts/list failed: ${errorMessage}\n`);
      return { prompts: [] };
    }
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (config.verbose) {
      process.stderr.write(`[DEBUG] prompts/get request received: ${JSON.stringify(request.params)}\n`);
    }
    try {
      const response = await config.proxy.handleRequest({
        jsonrpc: "2.0",
        id: "proxy-prompts-get",
        method: "prompts/get",
        params: request.params,
      });
      
      if (config.verbose) {
        process.stderr.write(`[DEBUG] prompts/get response: ${JSON.stringify(response)}\n`);
      }
      
      return response.result || {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ERROR] prompts/get failed: ${errorMessage}\n`);
      throw error;
    }
  });

  // stdio transport で接続
  const transport = new StdioServerTransport();
  
  if (config.verbose) {
    process.stderr.write("Connecting to stdio transport...\n");
  }
  
  await server.connect(transport);

  if (config.verbose) {
    process.stderr.write("Simple MCP proxy server ready for connections\n");
    process.stderr.write("Listening for JSON-RPC messages on stdin/stdout\n");
  }

  // グレースフルシャットダウン
  process.on("SIGINT", () => {
    if (config.verbose) {
      process.stderr.write("Shutting down MCP server...\n");
    }
    transport.close?.();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (config.verbose) {
      process.stderr.write("Terminating MCP server...\n");
    }
    transport.close?.();
    process.exit(0);
  });
}