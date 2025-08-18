import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import type { AuthClient } from "../../libs/auth/types.js";
import type { HttpClient } from "../../libs/http/types.js";

export type McpProxy = {
  handleRequest: (request: JSONRPCRequest) => Promise<JSONRPCResponse>;
  handleMessage: (message: JSONRPCMessage) => Promise<JSONRPCMessage>;
};

export type ProxyConfig = {
  targetUrl: string;
  timeout: number;
  authClient: AuthClient;
  httpClient: HttpClient;
  verbose?: boolean;
};

export type ProxyOptions = {
  url: string;
  timeout: number;
  verbose?: boolean;
};

export type ProxyError = {
  code: number;
  message: string;
  data?: unknown;
};

export type ProxyResult<T = unknown> =
  | { type: "success"; data: T }
  | { type: "error"; error: ProxyError };

export type RequestContext = {
  requestId: string | number | null;
  method: string;
  timestamp: Date;
};
