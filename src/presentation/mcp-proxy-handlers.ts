import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import type { HttpError } from "../libs/http/types.js";

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

export const createErrorResponseFromHttpError = (
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

export const createInternalErrorResponse = (
  id: string | number | null,
  error: unknown,
): JSONRPCResponse => {
  return createErrorResponse(
    id,
    -32603,
    `Internal error: ${error instanceof Error ? error.message : "Unknown error"}`,
    error,
  );
};

export const createAuthErrorResponse = (
  id: string | number | null,
  message: string,
  error?: unknown,
): JSONRPCResponse => {
  return createErrorResponse(
    id,
    -32603,
    `Authentication failed: ${message}`,
    error,
  );
};

export const createInvalidResponseErrorResponse = (
  id: string | number | null,
  responseData: unknown,
): JSONRPCResponse => {
  return createErrorResponse(
    id,
    -32603,
    "Invalid response format from target server",
    { received: responseData },
  );
};

export const validateJSONRPCResponse = (
  data: unknown,
): JSONRPCResponse | null => {
  if (!isValidJSONRPCResponse(data)) {
    return null;
  }
  return data as JSONRPCResponse;
};

export const isJSONRPCRequest = (
  message: JSONRPCMessage,
): message is JSONRPCRequest => {
  return "method" in message && "id" in message;
};

export const isJSONRPCNotification = (message: JSONRPCMessage): boolean => {
  return "method" in message && !("id" in message);
};
