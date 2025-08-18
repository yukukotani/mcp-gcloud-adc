import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationError } from "./handler.js";
import {
  createErrorHandler,
  DefaultErrorHandler,
  isApplicationError,
} from "./handler.js";

describe("DefaultErrorHandler", () => {
  let errorHandler: DefaultErrorHandler;
  let mockStderr: any;

  beforeEach(() => {
    errorHandler = new DefaultErrorHandler(false);
    mockStderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  describe("createErrorResponse", () => {
    it("JSONRPCエラーレスポンスを作成する", () => {
      const error: ApplicationError = {
        kind: "auth-error",
        message: "Authentication failed",
        details: { reason: "no-credentials" },
      };

      const response = errorHandler.createErrorResponse(1, error);

      expect(response).toEqual({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32002,
          message: "Authentication failed",
          data: { reason: "no-credentials" },
        },
      });
    });

    it("詳細なしのエラーレスポンスを作成する", () => {
      const error: ApplicationError = {
        kind: "internal-error",
        message: "Something went wrong",
      };

      const response = errorHandler.createErrorResponse(null, error);

      expect(response).toEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: "Something went wrong",
        },
      });
    });
  });

  describe("mapHttpErrorToAppError", () => {
    it("ネットワークエラーをマップする", () => {
      const httpError = {
        kind: "network-error",
        message: "Connection refused",
        originalError: new Error("ECONNREFUSED"),
      };

      const appError = errorHandler.mapHttpErrorToAppError(httpError);

      expect(appError).toEqual({
        kind: "network-error",
        message: "Network connection failed: Connection refused",
        details: { originalKind: "network-error" },
        originalError: httpError.originalError,
      });
    });

    it("タイムアウトエラーをマップする", () => {
      const httpError = {
        kind: "timeout",
        message: "Request timed out after 5000ms",
      };

      const appError = errorHandler.mapHttpErrorToAppError(httpError);

      expect(appError).toEqual({
        kind: "timeout-error",
        message: "Request timed out: Request timed out after 5000ms",
        details: { originalKind: "timeout" },
      });
    });

    it("HTTPエラーをマップする", () => {
      const httpError = {
        kind: "http-error",
        status: 404,
        message: "Not Found",
        body: "Resource not found",
      };

      const appError = errorHandler.mapHttpErrorToAppError(httpError);

      expect(appError).toEqual({
        kind: "http-error",
        message: "HTTP 404: Not Found - The requested resource does not exist",
        details: {
          status: 404,
          body: "Resource not found",
          originalKind: "http-error",
        },
      });
    });

    it("認証関連のHTTPエラーをマップする", () => {
      const httpError = {
        kind: "http-error",
        status: 401,
        message: "Unauthorized",
      };

      const appError = errorHandler.mapHttpErrorToAppError(httpError);

      expect(appError.message).toContain(
        "Unauthorized - Check your authentication credentials",
      );
    });

    it("パースエラーをマップする", () => {
      const httpError = {
        kind: "parse-error",
        message: "Invalid JSON",
        originalError: new SyntaxError("Unexpected token"),
      };

      const appError = errorHandler.mapHttpErrorToAppError(httpError);

      expect(appError).toEqual({
        kind: "parse-error",
        message: "Response parsing failed: Invalid JSON",
        details: { originalKind: "parse-error" },
        originalError: httpError.originalError,
      });
    });

    it("不明なHTTPエラーをマップする", () => {
      const httpError = {
        kind: "unknown-error",
        message: "Something strange happened",
      };

      const appError = errorHandler.mapHttpErrorToAppError(httpError);

      expect(appError).toEqual({
        kind: "internal-error",
        message: "Unknown HTTP error: Something strange happened",
        details: httpError,
      });
    });
  });

  describe("mapAuthErrorToAppError", () => {
    it("no-credentialsエラーをマップする", () => {
      const authError = {
        kind: "no-credentials",
        message: "No credentials found",
      };

      const appError = errorHandler.mapAuthErrorToAppError(authError);

      expect(appError).toEqual({
        kind: "auth-error",
        message:
          'Authentication credentials not found. Please run "gcloud auth application-default login" or set GOOGLE_APPLICATION_CREDENTIALS environment variable.',
        details: {
          originalKind: "no-credentials",
          suggestion:
            'Run "gcloud auth application-default login" to authenticate',
        },
      });
    });

    it("invalid-audienceエラーをマップする", () => {
      const authError = {
        kind: "invalid-audience",
        message: "Invalid URL format",
      };

      const appError = errorHandler.mapAuthErrorToAppError(authError);

      expect(appError).toEqual({
        kind: "auth-error",
        message: "Invalid target URL: Invalid URL format",
        details: {
          originalKind: "invalid-audience",
          suggestion: "Ensure the URL is a valid HTTPS endpoint",
        },
      });
    });

    it("token-fetch-failedエラーをマップする", () => {
      const authError = {
        kind: "token-fetch-failed",
        message: "Failed to get token",
      };

      const appError = errorHandler.mapAuthErrorToAppError(authError);

      expect(appError).toEqual({
        kind: "auth-error",
        message: "Failed to obtain authentication token: Failed to get token",
        details: {
          originalKind: "token-fetch-failed",
          suggestion: "Check your Google Cloud credentials and permissions",
        },
      });
    });

    it("不明な認証エラーをマップする", () => {
      const authError = {
        kind: "unknown-auth-error",
        message: "Unknown error",
      };

      const appError = errorHandler.mapAuthErrorToAppError(authError);

      expect(appError).toEqual({
        kind: "auth-error",
        message: "Authentication error: Unknown error",
        details: authError,
      });
    });
  });

  describe("logError", () => {
    it("基本的なエラーをログ出力する", () => {
      const error: ApplicationError = {
        kind: "network-error",
        message: "Connection failed",
      };

      errorHandler.logError(error);

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: Connection failed\n/,
        ),
      );
    });

    it("コンテキスト付きでエラーをログ出力する", () => {
      const error: ApplicationError = {
        kind: "auth-error",
        message: "Authentication failed",
      };

      errorHandler.logError(error, "proxy-handler");

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[proxy-handler\] ERROR: Authentication failed\n/,
        ),
      );
    });

    it("verboseモードで詳細をログ出力する", () => {
      const verboseHandler = new DefaultErrorHandler(true);
      const error: ApplicationError = {
        kind: "http-error",
        message: "HTTP 404",
        details: { status: 404, body: "Not found" },
        originalError: new Error("Original error"),
      };

      verboseHandler.logError(error);

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR: HTTP 404/),
      );
      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/Details:/),
      );
      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(/Original error:/),
      );
    });
  });

  describe("handleUnexpectedError", () => {
    it("Errorオブジェクトを処理する", () => {
      const originalError = new Error("Unexpected error");
      originalError.stack = "Error: Unexpected error\n    at test";

      const appError = errorHandler.handleUnexpectedError(
        originalError,
        "test-context",
      );

      expect(appError).toEqual({
        kind: "internal-error",
        message: "Unexpected error: Unexpected error",
        originalError,
        details: {
          name: "Error",
          stack: originalError.stack,
        },
      });

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[test-context\] ERROR: Unexpected error: Unexpected error/,
        ),
      );
    });

    it("文字列エラーを処理する", () => {
      const appError = errorHandler.handleUnexpectedError("String error");

      expect(appError).toEqual({
        kind: "internal-error",
        message: "Unexpected error: String error",
        originalError: "String error",
      });
    });

    it("不明なエラータイプを処理する", () => {
      const unknownError = { custom: "error" };
      const appError = errorHandler.handleUnexpectedError(unknownError);

      expect(appError).toEqual({
        kind: "internal-error",
        message: "An unexpected error occurred",
        originalError: unknownError,
        details: unknownError,
      });
    });
  });
});

describe("createErrorHandler", () => {
  it("DefaultErrorHandlerのインスタンスを作成する", () => {
    const handler = createErrorHandler(true);
    expect(handler).toBeInstanceOf(DefaultErrorHandler);
  });
});

describe("isApplicationError", () => {
  it("有効なApplicationErrorを識別する", () => {
    const error: ApplicationError = {
      kind: "auth-error",
      message: "Authentication failed",
    };

    expect(isApplicationError(error)).toBe(true);
  });

  it("無効なオブジェクトを拒否する", () => {
    expect(isApplicationError(null)).toBe(false);
    expect(isApplicationError(undefined)).toBe(false);
    expect(isApplicationError({})).toBe(false);
    expect(isApplicationError({ kind: "auth-error" })).toBe(false);
    expect(isApplicationError({ message: "error" })).toBe(false);
    expect(isApplicationError({ kind: 123, message: "error" })).toBe(false);
    expect(isApplicationError({ kind: "auth-error", message: 123 })).toBe(
      false,
    );
  });
});
