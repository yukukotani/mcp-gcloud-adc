import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpProxy } from "../usecase/mcp-proxy/types.js";
import { registerProxyHandlers, setupGracefulShutdown } from "./mcp-server-handlers.js";

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

  registerProxyHandlers(server, {
    proxy: config.proxy,
    idGenerator: () => Math.random(),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (config.verbose) {
    process.stderr.write("MCP proxy server ready\n");
  }

  setupGracefulShutdown(transport, { verbose: config.verbose });
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
