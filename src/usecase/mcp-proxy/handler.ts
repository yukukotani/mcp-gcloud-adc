import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../../libs/logging/logger.js";
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
  logger.debug(
    { method: request.method, id: request.id },
    "Handling JSONRPC request",
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    // セッションIDが存在する場合はヘッダーに追加
    const sessionId = config.sessionManager.getSessionId();
    if (sessionId) {
      headers["Mcp-Session-Id"] = sessionId;
      logger.debug({ sessionId }, "リクエストにセッションIDを追加");
    }

    const tokenResult = await config.authClient.getIdToken(config.targetUrl);

    if (tokenResult.type === "error") {
      logger.warn(
        { method: request.method, id: request.id, error: tokenResult.error },
        "Authentication failed for request",
      );
      return createAuthErrorResponse(
        request.id,
        tokenResult.error.message,
        tokenResult.error,
      );
    }

    headers.Authorization = `Bearer ${tokenResult.token}`;

    const httpResponse = await config.httpClient.post({
      url: config.targetUrl,
      headers,
      body: request,
      timeout: config.timeout,
    });

    if (httpResponse.type === "error") {
      // HTTP 404はセッション終了を意味する
      if (
        httpResponse.error.kind === "http-error" &&
        httpResponse.error.status === 404
      ) {
        logger.debug("HTTP 404受信、セッションをクリア");
        config.sessionManager.clearSession();
      }

      logger.warn(
        { method: request.method, id: request.id, error: httpResponse.error },
        "HTTP request failed",
      );
      return createErrorResponseFromHttpError(request.id, httpResponse.error);
    }

    // initializeリクエストの時のみMcp-Session-Idヘッダーを確認
    if (request.method === "initialize") {
      const responseSessionId =
        httpResponse.headers["mcp-session-id"] ||
        httpResponse.headers["Mcp-Session-Id"];
      if (responseSessionId) {
        logger.debug(
          { responseSessionId },
          "initializeレスポンスからセッションIDを受信",
        );
        config.sessionManager.setSessionId(responseSessionId);
      }
    }

    const responseData = httpResponse.data;

    const validatedResponse = validateJSONRPCResponse(responseData);
    if (!validatedResponse) {
      logger.warn(
        { method: request.method, id: request.id },
        "Invalid JSONRPC response received",
      );
      return createInvalidResponseErrorResponse(request.id, responseData);
    }

    logger.debug(
      { method: request.method, id: request.id },
      "Successfully handled JSONRPC request",
    );
    return validatedResponse;
  } catch (error) {
    logger.error(
      {
        method: request.method,
        id: request.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Unexpected error handling request",
    );
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
    const method = "method" in message ? message.method : "unknown";
    logger.debug({ method }, "Handling JSONRPC notification");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };

      // セッションIDが存在する場合はヘッダーに追加
      const sessionId = config.sessionManager.getSessionId();
      if (sessionId) {
        headers["Mcp-Session-Id"] = sessionId;
        logger.debug({ sessionId }, "通知にセッションIDを追加");
      }

      const tokenResult = await config.authClient.getIdToken(config.targetUrl);

      if (tokenResult.type === "error") {
        logger.warn(
          { method, error: tokenResult.error },
          "Authentication failed for notification",
        );
        return message;
      }

      headers.Authorization = `Bearer ${tokenResult.token}`;

      const httpResponse = await config.httpClient.post({
        url: config.targetUrl,
        headers,
        body: message,
        timeout: config.timeout,
      });

      // 通知でもセッション終了を検知
      if (
        httpResponse.type === "error" &&
        httpResponse.error.kind === "http-error" &&
        httpResponse.error.status === 404
      ) {
        logger.debug("通知でHTTP 404受信、セッションをクリア");
        config.sessionManager.clearSession();
      }

      logger.debug({ method }, "Successfully handled JSONRPC notification");
      return message;
    } catch (error) {
      logger.warn(
        {
          method,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Error handling notification",
      );
      return message;
    }
  }

  logger.debug("Received unknown message type, passing through");
  return message;
};

export function createMcpProxy(config: ProxyConfig): McpProxy {
  logger.debug(
    { targetUrl: config.targetUrl, timeout: config.timeout },
    "Creating MCP proxy",
  );

  return {
    handleRequest: (request: JSONRPCRequest) => handleRequest(config, request),
    handleMessage: (message: JSONRPCMessage) => handleMessage(config, message),
  };
}
