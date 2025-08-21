import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
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

  server.fallbackRequestHandler = async (request, _) => {
    const proxyResponse = await proxy.handleRequest({
      jsonrpc: "2.0",
      id: idGenerator(),
      method: request.method,
      params: request.params,
    });
    return proxyResponse.result || {};
  };
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
