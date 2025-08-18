import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { McpProxy } from "../../usecase/mcp-proxy/types.js";

export type ServerSetupConfig = {
  name: string;
  version: string;
  proxy: McpProxy;
  verbose?: boolean;
};

// 簡素化されたプロキシサーバー - すべてのメッセージを直接転送
class ProxyMcpServer {
  constructor(private config: ServerSetupConfig) {}

  async handleMessage(message: JSONRPCMessage): Promise<JSONRPCMessage | null> {
    if (this.config.verbose && "method" in message) {
      process.stderr.write(`[Proxy] Handling: ${message.method}\n`);
    }

    try {
      return await this.config.proxy.handleMessage(message);
    } catch (error) {
      if (this.config.verbose) {
        process.stderr.write(
          `[Proxy] Error: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }

      // エラーレスポンスを作成（リクエストの場合のみ）
      if ("id" in message && message.id !== undefined) {
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: `Proxy error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        } as JSONRPCMessage;
      }

      return null;
    }
  }
}

export async function setupMcpServer(config: ServerSetupConfig): Promise<void> {
  if (config.verbose) {
    process.stderr.write(
      `Initializing MCP proxy server: ${config.name} v${config.version}\n`,
    );
  }

  const proxyServer = new ProxyMcpServer(config);
  const transport = new StdioServerTransport();

  // stdioトランスポートのメッセージハンドリング
  transport.onmessage = async (message: JSONRPCMessage) => {
    const response = await proxyServer.handleMessage(message);
    if (response && "id" in message && message.id !== undefined) {
      transport.send(response);
    }
  };

  transport.onerror = (error: Error) => {
    if (config.verbose) {
      process.stderr.write(`[Proxy] Transport error: ${error.message}\n`);
    }
  };

  transport.onclose = () => {
    if (config.verbose) {
      process.stderr.write("[Proxy] Transport closed\n");
    }
  };

  if (config.verbose) {
    process.stderr.write("MCP proxy server ready\n");
  }

  // プロセス終了時のクリーンアップ
  process.on("SIGINT", () => {
    if (config.verbose) {
      process.stderr.write("\n[Proxy] Shutting down...\n");
    }
    transport.close?.();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (config.verbose) {
      process.stderr.write("[Proxy] Terminating...\n");
    }
    transport.close?.();
    process.exit(0);
  });
}

// 後方互換性のため
export async function connectStdioTransport(
  _server: unknown,
  verbose?: boolean,
): Promise<void> {
  if (verbose) {
    process.stderr.write(
      "Legacy connectStdioTransport called - use setupMcpServer instead\n",
    );
  }
}
