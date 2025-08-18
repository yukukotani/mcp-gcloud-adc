import type { 
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  SetLevelRequestSchema,
  JSONRPCRequest,
  JSONRPCResponse
} from '@modelcontextprotocol/sdk/types.js';
import type { McpProxy } from '../../usecase/mcp-proxy/types.js';

export type RequestHandlerFactory = {
  createInitializeHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createToolsListHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createToolsCallHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createResourcesListHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createResourcesReadHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createPromptsListHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createPromptsGetHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  createLoggingSetLevelHandler: (proxy: McpProxy) => (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
};

export const requestHandlerFactory: RequestHandlerFactory = {
  createInitializeHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createToolsListHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createToolsCallHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createResourcesListHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createResourcesReadHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createPromptsListHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createPromptsGetHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },

  createLoggingSetLevelHandler: (proxy: McpProxy) => {
    return async (request: JSONRPCRequest): Promise<JSONRPCResponse> => {
      return await proxy.handleRequest(request);
    };
  },
};

export type NotificationHandlerFactory = {
  createCancelledHandler: (proxy: McpProxy) => (notification: any) => Promise<void>;
  createProgressHandler: (proxy: McpProxy) => (notification: any) => Promise<void>;
};

export const notificationHandlerFactory: NotificationHandlerFactory = {
  createCancelledHandler: (proxy: McpProxy) => {
    return async (notification: any): Promise<void> => {
      await proxy.handleMessage(notification);
    };
  },

  createProgressHandler: (proxy: McpProxy) => {
    return async (notification: any): Promise<void> => {
      await proxy.handleMessage(notification);
    };
  },
};

export type HandlerRegistrationConfig = {
  proxy: McpProxy;
  verbose?: boolean;
};

export function createAllHandlers(config: HandlerRegistrationConfig) {
  return {
    initialize: requestHandlerFactory.createInitializeHandler(config.proxy),
    'tools/list': requestHandlerFactory.createToolsListHandler(config.proxy),
    'tools/call': requestHandlerFactory.createToolsCallHandler(config.proxy),
    'resources/list': requestHandlerFactory.createResourcesListHandler(config.proxy),
    'resources/read': requestHandlerFactory.createResourcesReadHandler(config.proxy),
    'prompts/list': requestHandlerFactory.createPromptsListHandler(config.proxy),
    'prompts/get': requestHandlerFactory.createPromptsGetHandler(config.proxy),
    'logging/setLevel': requestHandlerFactory.createLoggingSetLevelHandler(config.proxy),
  };
}

export function createAllNotificationHandlers(config: HandlerRegistrationConfig) {
  return {
    'notifications/cancelled': notificationHandlerFactory.createCancelledHandler(config.proxy),
    'notifications/progress': notificationHandlerFactory.createProgressHandler(config.proxy),
  };
}