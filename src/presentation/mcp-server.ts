import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  JSONRPCMessage,
  JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpProxy } from "../usecase/mcp-proxy/types.js";

export type ServerSetupConfig = {
  name: string;
  version: string;
  proxy: McpProxy;
  verbose?: boolean;
};

export async function setupMcpServer(config: ServerSetupConfig): Promise<void> {
  if (config.verbose) {
    process.stderr.write(
      `Initializing MCP proxy server: ${config.name} v${config.version}\n`,
    );
  }

  // SDKのServerクラスを使用してプロキシサーバーを作成
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        // プロキシサーバーとして、全ての機能をサポート
        tools: {},
        resources: {
          subscribe: true,
          listChanged: true,
        },
        prompts: {},
        sampling: {},
      },
    },
  );

  const transport = new StdioServerTransport();
  
  // 低レベルアプローチ: 直接メッセージハンドリングを行う
  const originalOnMessage = transport.onmessage;
  transport.onmessage = async (message: JSONRPCMessage) => {
    if (config.verbose && "method" in message) {
      process.stderr.write(`[Proxy] Handling: ${message.method}\n`);
    }

    try {
      // リクエストかどうかを確認
      if ("method" in message && "id" in message) {
        const request = message as JSONRPCRequest;
        const response = await config.proxy.handleRequest(request);
        
        // レスポンスを送信
        if (transport.send) {
          transport.send(response);
        }
        return;
      }
      
      // 通知の場合はプロキシに転送
      if ("method" in message && !("id" in message)) {
        await config.proxy.handleMessage(message);
        return;
      }
      
      // その他のメッセージはサーバーに渡す
      if (originalOnMessage) {
        await originalOnMessage.call(transport, message);
      }
    } catch (error) {
      if (config.verbose) {
        process.stderr.write(
          `[Proxy] Error: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
      
      // エラーレスポンスを送信（リクエストの場合のみ）
      if ("id" in message && transport.send) {
        transport.send({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: `Proxy error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        } as JSONRPCMessage);
      }
    }
  };

  await server.connect(transport);

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
