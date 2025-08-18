import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpProxy } from "../usecase/mcp-proxy/types.js";

export type IdGeneratorFn = () => string | number;

type HandlerConfig = {
  proxy: McpProxy;
  idGenerator: IdGeneratorFn;
};

export function registerProxyHandlers(server: Server, config: HandlerConfig): void {
  const { proxy, idGenerator } = config;

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "tools/list",
    });
    return proxyResponse.result || { tools: [] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "tools/call",
      params: request.params,
    });
    return proxyResponse.result || {};
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "resources/list",
    });
    return proxyResponse.result || { resources: [] };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "resources/read",
      params: request.params,
    });
    return proxyResponse.result || {};
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "prompts/list",
    });
    return proxyResponse.result || { prompts: [] };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "prompts/get",
      params: request.params,
    });
    return proxyResponse.result || {};
  });
}

export function setupGracefulShutdown(
  transport: StdioServerTransport,
  options?: { verbose?: boolean },
): void {
  process.on("SIGINT", () => {
    if (options?.verbose) {
      process.stderr.write("\n[Proxy] Shutting down...\n");
    }
    transport.close?.();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (options?.verbose) {
      process.stderr.write("[Proxy] Terminating...\n");
    }
    transport.close?.();
    process.exit(0);
  });
}