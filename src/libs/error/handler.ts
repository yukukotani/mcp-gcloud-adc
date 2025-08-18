import type { JSONRPCResponse } from "@modelcontextprotocol/sdk/types.js";

export type ErrorKind =
  | "parse-error"
  | "invalid-request"
  | "method-not-found"
  | "invalid-params"
  | "internal-error"
  | "auth-error"
  | "network-error"
  | "timeout-error"
  | "http-error";

export type ApplicationError = {
  kind: ErrorKind;
  message: string;
  details?: unknown;
  originalError?: unknown;
};

export type ErrorHandler = {
  createErrorResponse: (
    id: string | number | null,
    error: ApplicationError,
  ) => JSONRPCResponse;

  mapHttpErrorToAppError: (httpError: any) => ApplicationError;
  mapAuthErrorToAppError: (authError: any) => ApplicationError;
  logError: (error: ApplicationError, context?: string) => void;
  handleUnexpectedError: (error: unknown, context?: string) => ApplicationError;
};

export class DefaultErrorHandler implements ErrorHandler {
  constructor() {}

  createErrorResponse(
    id: string | number | null,
    error: ApplicationError,
  ): any {
    const jsonrpcError: any = {
      code: this.mapErrorKindToCode(error.kind),
      message: error.message,
    };

    if (error.details) {
      jsonrpcError.data = error.details;
    }

    return {
      jsonrpc: "2.0",
      id: id as string | number,
      error: jsonrpcError,
    };
  }

  mapHttpErrorToAppError(httpError: any): ApplicationError {
    switch (httpError.kind) {
      case "network-error":
        return {
          kind: "network-error",
          message: `Network connection failed: ${httpError.message}`,
          details: {
            originalKind: httpError.kind,
          },
          originalError: httpError.originalError,
        };

      case "timeout":
        return {
          kind: "timeout-error",
          message: `Request timed out: ${httpError.message}`,
          details: {
            originalKind: httpError.kind,
          },
        };

      case "http-error":
        return {
          kind: "http-error",
          message: this.createHttpErrorMessage(
            httpError.status,
            httpError.message,
          ),
          details: {
            status: httpError.status,
            body: httpError.body,
            originalKind: httpError.kind,
          },
        };

      case "parse-error":
        return {
          kind: "parse-error",
          message: `Response parsing failed: ${httpError.message}`,
          details: {
            originalKind: httpError.kind,
          },
          originalError: httpError.originalError,
        };

      default:
        return {
          kind: "internal-error",
          message: `Unknown HTTP error: ${httpError.message || "Unknown error"}`,
          details: httpError,
        };
    }
  }

  mapAuthErrorToAppError(authError: any): ApplicationError {
    switch (authError.kind) {
      case "no-credentials":
        return {
          kind: "auth-error",
          message:
            'Authentication credentials not found. Please run "gcloud auth application-default login" or set GOOGLE_APPLICATION_CREDENTIALS environment variable.',
          details: {
            originalKind: authError.kind,
            suggestion:
              'Run "gcloud auth application-default login" to authenticate',
          },
        };

      case "invalid-audience":
        return {
          kind: "auth-error",
          message: `Invalid target URL: ${authError.message}`,
          details: {
            originalKind: authError.kind,
            suggestion: "Ensure the URL is a valid HTTPS endpoint",
          },
        };

      case "token-fetch-failed":
        return {
          kind: "auth-error",
          message: `Failed to obtain authentication token: ${authError.message}`,
          details: {
            originalKind: authError.kind,
            suggestion: "Check your Google Cloud credentials and permissions",
          },
        };

      case "invalid-token":
        return {
          kind: "auth-error",
          message: `Invalid authentication token: ${authError.message}`,
          details: {
            originalKind: authError.kind,
            suggestion: "Try refreshing your authentication credentials",
          },
        };

      default:
        return {
          kind: "auth-error",
          message: `Authentication error: ${authError.message || "Unknown authentication error"}`,
          details: authError,
        };
    }
  }

  logError(error: ApplicationError, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : "";

    process.stderr.write(
      `[${timestamp}]${contextStr} ERROR: ${error.message}\n`,
    );
  }

  handleUnexpectedError(error: unknown, context?: string): ApplicationError {
    const appError: ApplicationError = {
      kind: "internal-error",
      message: "An unexpected error occurred",
      originalError: error,
    };

    if (error instanceof Error) {
      appError.message = `Unexpected error: ${error.message}`;
      appError.details = {
        name: error.name,
        stack: error.stack,
      };
    } else if (typeof error === "string") {
      appError.message = `Unexpected error: ${error}`;
    } else {
      appError.details = error;
    }

    this.logError(appError, context);
    return appError;
  }

  private mapErrorKindToCode(kind: ErrorKind): number {
    switch (kind) {
      case "parse-error":
        return -32700;
      case "invalid-request":
        return -32600;
      case "method-not-found":
        return -32601;
      case "invalid-params":
        return -32602;
      case "internal-error":
        return -32603;
      case "auth-error":
        return -32002; // Invalid params (authentication/authorization)
      case "network-error":
      case "timeout-error":
      case "http-error":
        return -32603; // Internal error
      default:
        return -32603; // Default to internal error
    }
  }

  private createHttpErrorMessage(status: number, message: string): string {
    const statusMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized - Check your authentication credentials",
      403: "Forbidden - Insufficient permissions",
      404: "Not Found - The requested resource does not exist",
      429: "Too Many Requests - Rate limit exceeded",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };

    const statusMessage = statusMessages[status] || message;
    return `HTTP ${status}: ${statusMessage}`;
  }
}

export function createErrorHandler(): ErrorHandler {
  return new DefaultErrorHandler();
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    "message" in error &&
    typeof (error as any).kind === "string" &&
    typeof (error as any).message === "string"
  );
}
