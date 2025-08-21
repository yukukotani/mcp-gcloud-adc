import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpProxy } from "../usecase/mcp-proxy/types.js";

type IdGeneratorFn = () => string | number;

type HandlerConfig = {
  proxy: McpProxy;
  idGenerator: IdGeneratorFn;
};

export function registerProxyHandlers(
  server: Server,
  config: HandlerConfig,
): void {
  const { proxy, idGenerator } = config;

  server.setRequestHandler(InitializeRequestSchema, async (request) => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: "initialize",
      params: request.params,
    });
    return proxyResponse.result || {};
  });

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

export function setupGracefulShutdown(transport: StdioServerTransport): void {
  process.on("SIGINT", () => {
    transport.close?.();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    transport.close?.();
    process.exit(0);
  });
}
