import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { McpProxy } from '../../usecase/mcp-proxy/types.js';

export type ServerSetupConfig = {
  name: string;
  version: string;
  proxy: McpProxy;
  verbose?: boolean;
};

export async function setupMcpServer(config: ServerSetupConfig): Promise<Server> {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
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

  if (config.verbose) {
    process.stderr.write(`Initializing MCP server: ${config.name} v${config.version}\n`);
  }

  server.setRequestHandler(
    'initialize',
    async (request) => {
      if (config.verbose) {
        process.stderr.write('Received initialize request\n');
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'tools/list',
    async (request) => {
      if (config.verbose) {
        process.stderr.write('Received tools/list request\n');
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'tools/call',
    async (request) => {
      if (config.verbose) {
        process.stderr.write(`Received tools/call request: ${request.params?.name || 'unknown'}\n`);
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'resources/list',
    async (request) => {
      if (config.verbose) {
        process.stderr.write('Received resources/list request\n');
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'resources/read',
    async (request) => {
      if (config.verbose) {
        process.stderr.write(`Received resources/read request: ${request.params?.uri || 'unknown'}\n`);
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'prompts/list',
    async (request) => {
      if (config.verbose) {
        process.stderr.write('Received prompts/list request\n');
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'prompts/get',
    async (request) => {
      if (config.verbose) {
        process.stderr.write(`Received prompts/get request: ${request.params?.name || 'unknown'}\n`);
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setRequestHandler(
    'logging/setLevel',
    async (request) => {
      if (config.verbose) {
        process.stderr.write(`Received logging/setLevel request: ${request.params?.level || 'unknown'}\n`);
      }
      return await config.proxy.handleRequest(request);
    }
  );

  server.setNotificationHandler(
    'notifications/cancelled',
    async (notification) => {
      if (config.verbose) {
        process.stderr.write('Received cancelled notification\n');
      }
      await config.proxy.handleMessage(notification);
    }
  );

  server.setNotificationHandler(
    'notifications/progress',
    async (notification) => {
      if (config.verbose) {
        process.stderr.write('Received progress notification\n');
      }
      await config.proxy.handleMessage(notification);
    }
  );

  return server;
}

export async function connectStdioTransport(server: Server, verbose?: boolean): Promise<void> {
  const transport = new StdioServerTransport();
  
  if (verbose) {
    process.stderr.write('Connecting to stdio transport\n');
  }
  
  await server.connect(transport);
  
  if (verbose) {
    process.stderr.write('MCP server connected and ready\n');
  }
}