import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpProxy } from "../usecase/mcp-proxy/types.js";
import { registerProxyHandlers, setupGracefulShutdown } from "./mcp-server-handlers.js";

export type SimpleServerSetupConfig = {
  name: string;
  version: string;
  proxy: McpProxy;
};

export async function setupSimpleMcpServer(config: SimpleServerSetupConfig): Promise<void> {
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

  let idCounter = 0;
  const idGenerator = () => `proxy-${++idCounter}`;

  registerProxyHandlers(server, {
    proxy: config.proxy,
    idGenerator,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  setupGracefulShutdown(transport);
}