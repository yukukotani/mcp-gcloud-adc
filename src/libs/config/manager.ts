import type { ProxyOptions } from "../../usecase/mcp-proxy/types.js";
import type { AuthConfig } from "../auth/types.js";

export type AppConfig = {
  server: {
    name: string;
    version: string;
  };
  proxy: ProxyOptions;
  auth: AuthConfig;
  logging: {
    level: "debug" | "info" | "warn" | "error";
    type: "console" | "structured";
    verbose: boolean;
  };
};

export type EnvironmentVariables = {
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  MCP_PROXY_LOG_LEVEL?: string;
  MCP_PROXY_LOG_TYPE?: string;
  MCP_PROXY_TIMEOUT?: string;
  HOSTNAME?: string;
};

export type ConfigManager = {
  loadConfig: (cliOptions: ProxyOptions) => AppConfig;
  validateConfig: (config: AppConfig) => ConfigValidationResult;
  getEnvironmentVariables: () => EnvironmentVariables;
};

export type ConfigValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export class DefaultConfigManager implements ConfigManager {
  constructor(private packageInfo: { name: string; version: string }) {}

  loadConfig(cliOptions: ProxyOptions): AppConfig {
    const env = this.getEnvironmentVariables();

    return {
      server: {
        name: this.packageInfo.name,
        version: this.packageInfo.version,
      },
      proxy: {
        url: cliOptions.url,
        timeout: this.parseTimeout(env.MCP_PROXY_TIMEOUT) || cliOptions.timeout,
        verbose: cliOptions.verbose,
      },
      auth: {
        ...(env.GOOGLE_APPLICATION_CREDENTIALS && {
          credentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS,
        }),
        ...(env.GOOGLE_CLOUD_PROJECT && {
          projectId: env.GOOGLE_CLOUD_PROJECT,
        }),
      },
      logging: {
        level:
          this.parseLogLevel(env.MCP_PROXY_LOG_LEVEL) ||
          (cliOptions.verbose ? "debug" : "info"),
        type: this.parseLogType(env.MCP_PROXY_LOG_TYPE) || "console",
        verbose: cliOptions.verbose,
      },
    };
  }

  validateConfig(config: AppConfig): ConfigValidationResult {
    const errors: string[] = [];

    // URLの検証
    try {
      const url = new URL(config.proxy.url);
      if (url.protocol !== "https:") {
        errors.push("Proxy URL must use HTTPS protocol");
      }
    } catch {
      errors.push("Invalid proxy URL format");
    }

    // タイムアウトの検証
    if (config.proxy.timeout <= 0) {
      errors.push("Proxy timeout must be positive");
    }
    if (config.proxy.timeout > 600000) {
      errors.push("Proxy timeout cannot exceed 10 minutes (600000ms)");
    }

    // サーバー情報の検証
    if (!config.server.name || config.server.name.trim() === "") {
      errors.push("Server name cannot be empty");
    }
    if (!config.server.version || config.server.version.trim() === "") {
      errors.push("Server version cannot be empty");
    }

    // 認証設定の検証（警告レベル）
    if (
      config.auth.credentialsPath &&
      !this.isValidPath(config.auth.credentialsPath)
    ) {
      errors.push(`Invalid credentials path: ${config.auth.credentialsPath}`);
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  getEnvironmentVariables(): EnvironmentVariables {
    const env: EnvironmentVariables = {};

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      env.GOOGLE_APPLICATION_CREDENTIALS =
        process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
    }
    if (process.env.MCP_PROXY_LOG_LEVEL) {
      env.MCP_PROXY_LOG_LEVEL = process.env.MCP_PROXY_LOG_LEVEL;
    }
    if (process.env.MCP_PROXY_LOG_TYPE) {
      env.MCP_PROXY_LOG_TYPE = process.env.MCP_PROXY_LOG_TYPE;
    }
    if (process.env.MCP_PROXY_TIMEOUT) {
      env.MCP_PROXY_TIMEOUT = process.env.MCP_PROXY_TIMEOUT;
    }
    if (process.env.HOSTNAME) {
      env.HOSTNAME = process.env.HOSTNAME;
    }

    return env;
  }

  private parseTimeout(value?: string): number | null {
    if (!value) return null;

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private parseLogLevel(
    value?: string,
  ): "debug" | "info" | "warn" | "error" | null {
    if (!value) return null;

    const lowercased = value.toLowerCase();
    if (["debug", "info", "warn", "error"].includes(lowercased)) {
      return lowercased as "debug" | "info" | "warn" | "error";
    }

    return null;
  }

  private parseLogType(value?: string): "console" | "structured" | null {
    if (!value) return null;

    const lowercased = value.toLowerCase();
    if (["console", "structured"].includes(lowercased)) {
      return lowercased as "console" | "structured";
    }

    return null;
  }

  private isValidPath(path: string): boolean {
    try {
      // 基本的なパス検証（存在チェックはしない）
      return path.trim().length > 0 && !path.includes("\0");
    } catch {
      return false;
    }
  }
}

export function createConfigManager(packageInfo: {
  name: string;
  version: string;
}): ConfigManager {
  return new DefaultConfigManager(packageInfo);
}

export function getPackageInfo(): { name: string; version: string } {
  try {
    // package.jsonから情報を読み取る
    // 実際の実装では import.meta.resolve や fs.readFileSync を使用する可能性があるが、
    // ここではハードコードされた値を使用
    return {
      name: "mcp-gcloud-adc",
      version: "1.0.0",
    };
  } catch {
    return {
      name: "mcp-gcloud-proxy",
      version: "0.0.0",
    };
  }
}
