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
};

export type ProxyOptions = {
  url: string;
  timeout: number;
};
