import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createAuthErrorResponse,
  createErrorResponseFromHttpError,
  createInternalErrorResponse,
  createInvalidResponseErrorResponse,
  isJSONRPCNotification,
  isJSONRPCRequest,
  validateJSONRPCResponse,
} from "../../presentation/mcp-proxy-handlers.js";
import type { McpProxy, ProxyConfig } from "./types.js";

const handleRequest = async (
  config: ProxyConfig,
  request: JSONRPCRequest,
): Promise<JSONRPCResponse> => {
  try {
    // HTTP URL（主にテスト用）の場合は認証をスキップ
    const isHttpUrl = config.targetUrl.startsWith("http://");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    if (!isHttpUrl) {
      const tokenResult = await config.authClient.getIdToken(config.targetUrl);

      if (tokenResult.type === "error") {
        return createAuthErrorResponse(
          request.id,
          tokenResult.error.message,
          tokenResult.error,
        );
      }

      headers.Authorization = `Bearer ${tokenResult.token}`;
    }

    const httpResponse = await config.httpClient.post({
      url: config.targetUrl,
      headers,
      body: request,
      timeout: config.timeout,
    });

    if (httpResponse.type === "error") {
      return createErrorResponseFromHttpError(request.id, httpResponse.error);
    }

    const responseData = httpResponse.data;

    const validatedResponse = validateJSONRPCResponse(responseData);
    if (!validatedResponse) {
      return createInvalidResponseErrorResponse(request.id, responseData);
    }

    return validatedResponse;
  } catch (error) {
    return createInternalErrorResponse(request.id, error);
  }
};

const handleMessage = async (
  config: ProxyConfig,
  message: JSONRPCMessage,
): Promise<JSONRPCMessage> => {
  if (isJSONRPCRequest(message)) {
    return await handleRequest(config, message);
  }

  if (isJSONRPCNotification(message)) {
    try {
      // HTTP URL（主にテスト用）の場合は認証をスキップ
      const isHttpUrl = config.targetUrl.startsWith("http://");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };

      if (!isHttpUrl) {
        const tokenResult = await config.authClient.getIdToken(
          config.targetUrl,
        );

        if (tokenResult.type === "error") {
          return message;
        }

        headers.Authorization = `Bearer ${tokenResult.token}`;
      }

      await config.httpClient.post({
        url: config.targetUrl,
        headers,
        body: message,
        timeout: config.timeout,
      });

      return message;
    } catch (_error) {
      return message;
    }
  }

  return message;
};

export function createMcpProxy(config: ProxyConfig): McpProxy {
  return {
    handleRequest: (request: JSONRPCRequest) => handleRequest(config, request),
    handleMessage: (message: JSONRPCMessage) => handleMessage(config, message),
  };
}
