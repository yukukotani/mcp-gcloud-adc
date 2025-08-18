import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpProxy, ProxyConfig, RequestContext } from "./types.js";

export class McpProxyHandler implements McpProxy {
  constructor(private config: ProxyConfig) {}

  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const context: RequestContext = {
      requestId: request.id,
      method: request.method,
      timestamp: new Date(),
    };

    if (this.config.verbose) {
      process.stderr.write(
        `[${context.timestamp.toISOString()}] Proxying request: ${context.method}\n`,
      );
    }

    try {
      // HTTP URL（主にテスト用）の場合は認証をスキップ
      const isHttpUrl = this.config.targetUrl.startsWith("http://");
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      };

      if (!isHttpUrl) {
        if (this.config.verbose) {
          process.stderr.write(`[DEBUG] Getting auth token for ${this.config.targetUrl}\n`);
        }
        
        const tokenResult = await this.config.authClient.getIdToken(
          this.config.targetUrl,
        );

        if (tokenResult.type === "error") {
          if (this.config.verbose) {
            process.stderr.write(`[DEBUG] Auth token failed: ${tokenResult.error.message}\n`);
          }
          return this.createErrorResponse(
            request.id,
            -32603,
            `Authentication failed: ${tokenResult.error.message}`,
            tokenResult.error,
          );
        }

        headers.Authorization = `Bearer ${tokenResult.token}`;
        
        if (this.config.verbose) {
          process.stderr.write(`[DEBUG] Auth token obtained\n`);
        }
      } else {
        if (this.config.verbose) {
          process.stderr.write(`[DEBUG] HTTP URL detected, skipping authentication\n`);
        }
      }

      if (this.config.verbose) {
        process.stderr.write(`[DEBUG] Sending HTTP request to ${this.config.targetUrl}\n`);
        process.stderr.write(`[DEBUG] Request body: ${JSON.stringify(request)}\n`);
      }

      const httpResponse = await this.config.httpClient.post({
        url: this.config.targetUrl,
        headers,
        body: request,
        timeout: this.config.timeout,
      });

      if (this.config.verbose) {
        process.stderr.write(`[DEBUG] HTTP response type: ${httpResponse.type}\n`);
      }

      if (httpResponse.type === "error") {
        if (this.config.verbose) {
          process.stderr.write(`[DEBUG] HTTP error: ${JSON.stringify(httpResponse.error)}\n`);
        }
        return this.createErrorResponseFromHttpError(
          request.id,
          httpResponse.error,
        );
      }

      const responseData = httpResponse.data;

      if (this.config.verbose) {
        process.stderr.write(`[DEBUG] HTTP response data received: ${JSON.stringify(responseData)}\n`);
      }

      if (!this.isValidJSONRPCResponse(responseData)) {
        if (this.config.verbose) {
          process.stderr.write(`[DEBUG] Invalid JSON-RPC response: ${JSON.stringify(responseData)}\n`);
        }
        return this.createErrorResponse(
          request.id,
          -32603,
          "Invalid response format from target server",
          { received: responseData },
        );
      }

      if (this.config.verbose) {
        process.stderr.write(
          `[${new Date().toISOString()}] Response received for: ${context.method}\n`,
        );
      }

      return responseData as JSONRPCResponse;
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32603,
        `Internal error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  async handleMessage(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    if ("method" in message && "id" in message) {
      return await this.handleRequest(message as JSONRPCRequest);
    }

    if ("method" in message && !("id" in message)) {
      if (this.config.verbose) {
        process.stderr.write(
          `[${new Date().toISOString()}] Notification: ${message.method}\n`,
        );
      }

      try {
        // HTTP URL（主にテスト用）の場合は認証をスキップ
        const isHttpUrl = this.config.targetUrl.startsWith("http://");
        let headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
        };

        if (!isHttpUrl) {
          const tokenResult = await this.config.authClient.getIdToken(
            this.config.targetUrl,
          );

          if (tokenResult.type === "error") {
            if (this.config.verbose) {
              process.stderr.write(
                `Authentication failed for notification: ${tokenResult.error.message}\n`,
              );
            }
            return message;
          }

          headers.Authorization = `Bearer ${tokenResult.token}`;
        }

        await this.config.httpClient.post({
          url: this.config.targetUrl,
          headers,
          body: message,
          timeout: this.config.timeout,
        });

        return message;
      } catch (error) {
        if (this.config.verbose) {
          process.stderr.write(
            `Failed to forward notification: ${error instanceof Error ? error.message : "Unknown error"}\n`,
          );
        }
        return message;
      }
    }

    return message;
  }

  private isValidJSONRPCResponse(data: unknown): data is JSONRPCResponse {
    if (!data || typeof data !== "object") {
      return false;
    }

    const obj = data as any;

    if (obj.jsonrpc !== "2.0") {
      return false;
    }

    if (!("id" in obj)) {
      return false;
    }

    return "result" in obj || "error" in obj;
  }

  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown,
  ): any {
    const error: any = {
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
    };
  }

  private createErrorResponseFromHttpError(
    id: string | number | null,
    httpError: any,
  ): JSONRPCResponse {
    switch (httpError.kind) {
      case "network-error":
        return this.createErrorResponse(
          id,
          -32603,
          `Network error: ${httpError.message}`,
          { kind: httpError.kind },
        );

      case "timeout":
        return this.createErrorResponse(
          id,
          -32603,
          `Request timeout: ${httpError.message}`,
          { kind: httpError.kind },
        );

      case "http-error": {
        const code = this.mapHttpStatusToJsonRpcCode(httpError.status);
        return this.createErrorResponse(
          id,
          code,
          `HTTP error: ${httpError.message}`,
          {
            kind: httpError.kind,
            status: httpError.status,
            body: httpError.body,
          },
        );
      }

      case "parse-error":
        return this.createErrorResponse(
          id,
          -32700,
          `Parse error: ${httpError.message}`,
          { kind: httpError.kind },
        );

      default:
        return this.createErrorResponse(
          id,
          -32603,
          `Unknown HTTP error: ${httpError.message}`,
          httpError,
        );
    }
  }

  private mapHttpStatusToJsonRpcCode(status: number): number {
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
  }
}

export function createMcpProxy(config: ProxyConfig): McpProxy {
  return new McpProxyHandler(config);
}
