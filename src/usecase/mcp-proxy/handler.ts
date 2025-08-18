import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import type { HttpError } from "../../libs/http/types.js";
import type { McpProxy, ProxyConfig } from "./types.js";

const isValidJSONRPCResponse = (data: unknown): data is JSONRPCResponse => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as {
    jsonrpc?: string;
    id?: unknown;
    result?: unknown;
    error?: unknown;
  };

  if (obj.jsonrpc !== "2.0") {
    return false;
  }

  if (!("id" in obj)) {
    return false;
  }

  return "result" in obj || "error" in obj;
};

const createErrorResponse = (
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JSONRPCResponse => {
  const error: {
    code: number;
    message: string;
    data?: unknown;
  } = {
    code,
    message,
  };

  if (data) {
    error.data = data;
  }

  return {
    jsonrpc: "2.0",
    id: id as string | number,
    error,
    // biome-ignore lint/suspicious/noExplicitAny: JSONRPCResponseの型がエラーレスポンスをうまく表現できないため必要
  } as any;
};

const mapHttpStatusToJsonRpcCode = (status: number): number => {
  if (status === 401 || status === 403) {
    return -32002; // Invalid params (authentication/authorization)
  }
  if (status === 404) {
    return -32601; // Method not found
  }
  if (status >= 400 && status < 500) {
    return -32602; // Invalid params
  }
  if (status >= 500) {
    return -32603; // Internal error
  }
  return -32603; // Default to internal error
};

const createErrorResponseFromHttpError = (
  id: string | number | null,
  httpError: HttpError,
): JSONRPCResponse => {
  switch (httpError.kind) {
    case "network-error":
      return createErrorResponse(
        id,
        -32603,
        `Network error: ${httpError.message}`,
        { kind: httpError.kind },
      );

    case "timeout":
      return createErrorResponse(
        id,
        -32603,
        `Request timeout: ${httpError.message}`,
        { kind: httpError.kind },
      );

    case "http-error": {
      const code = mapHttpStatusToJsonRpcCode(httpError.status);
      return createErrorResponse(id, code, `HTTP error: ${httpError.message}`, {
        kind: httpError.kind,
        status: httpError.status,
        body: httpError.body,
      });
    }

    case "parse-error":
      return createErrorResponse(
        id,
        -32700,
        `Parse error: ${httpError.message}`,
        { kind: httpError.kind },
      );

    default:
      return createErrorResponse(
        id,
        -32603,
        `Unknown HTTP error: ${(httpError as { message?: string }).message || "Unknown error"}`,
        httpError,
      );
  }
};

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
        return createErrorResponse(
          request.id,
          -32603,
          `Authentication failed: ${tokenResult.error.message}`,
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

    if (!isValidJSONRPCResponse(responseData)) {
      return createErrorResponse(
        request.id,
        -32603,
        "Invalid response format from target server",
        { received: responseData },
      );
    }

    return responseData as JSONRPCResponse;
  } catch (error) {
    return createErrorResponse(
      request.id,
      -32603,
      `Internal error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error,
    );
  }
};

const handleMessage = async (
  config: ProxyConfig,
  message: JSONRPCMessage,
): Promise<JSONRPCMessage> => {
  if ("method" in message && "id" in message) {
    return await handleRequest(config, message as JSONRPCRequest);
  }

  if ("method" in message && !("id" in message)) {
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
