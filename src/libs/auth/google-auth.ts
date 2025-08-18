import { GoogleAuth } from "google-auth-library";
import type {
  AuthClient,
  AuthConfig,
  GetIdTokenResult,
  TokenCache,
} from "./types.js";

export class GoogleAuthClient implements AuthClient {
  private googleAuth: GoogleAuth;
  private tokenCache: TokenCache = {};

  constructor(config: AuthConfig = {}) {
    const authOptions: any = {
      scopes: [], // IDトークンには不要
    };

    if (config.credentialsPath) {
      authOptions.keyFilename = config.credentialsPath;
    }

    if (config.projectId) {
      authOptions.projectId = config.projectId;
    }

    this.googleAuth = new GoogleAuth(authOptions);
  }

  async getIdToken(audience: string): Promise<GetIdTokenResult> {
    if (!this.isValidAudience(audience)) {
      return {
        type: "error",
        error: {
          kind: "invalid-audience",
          message: `Invalid audience: ${audience}. Must be a valid HTTPS URL.`,
        },
      };
    }

    const cached = this.getCachedToken(audience);
    if (cached && this.isTokenValid(cached.expiresAt)) {
      return {
        type: "success",
        token: cached.token,
        expiresAt: cached.expiresAt,
      };
    }

    return this.fetchNewToken(audience);
  }

  async refreshToken(audience: string): Promise<GetIdTokenResult> {
    delete this.tokenCache[audience];
    return this.getIdToken(audience);
  }

  private isValidAudience(audience: string): boolean {
    try {
      const url = new URL(audience);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private getCachedToken(audience: string) {
    return this.tokenCache[audience];
  }

  private isTokenValid(expiresAt: Date): boolean {
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5分のバッファ
    return expiresAt.getTime() - now.getTime() > buffer;
  }

  private async fetchNewToken(audience: string): Promise<GetIdTokenResult> {
    try {
      const client = await this.googleAuth.getClient();

      if (!client) {
        return {
          type: "error",
          error: {
            kind: "no-credentials",
            message:
              'No credentials found. Please run "gcloud auth application-default login" or set GOOGLE_APPLICATION_CREDENTIALS environment variable.',
          },
        };
      }

      if (!("fetchIdToken" in client)) {
        return {
          type: "error",
          error: {
            kind: "no-credentials",
            message:
              "The authenticated client does not support ID token generation.",
          },
        };
      }

      const idToken = await (client as any).fetchIdToken(audience);

      if (!idToken || typeof idToken !== "string") {
        return {
          type: "error",
          error: {
            kind: "invalid-token",
            message: "Failed to retrieve a valid ID token.",
          },
        };
      }

      const expiresAt = this.extractTokenExpiration(idToken);

      this.tokenCache[audience] = {
        token: idToken,
        expiresAt,
      };

      return {
        type: "success",
        token: idToken,
        expiresAt,
      };
    } catch (error) {
      return {
        type: "error",
        error: {
          kind: "token-fetch-failed",
          message: `Failed to fetch ID token: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      };
    }
  }

  private extractTokenExpiration(token: string): Date {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payloadPart = parts[1];
      if (!payloadPart) {
        throw new Error("Invalid JWT: missing payload");
      }

      const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());
      const exp = payload.exp;
      if (typeof exp === "number") {
        return new Date(exp * 1000);
      }
    } catch {
      // JWTの解析に失敗した場合はデフォルトの有効期限を設定
    }

    // デフォルトで1時間の有効期限
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

export function createAuthClient(config: AuthConfig = {}): AuthClient {
  return new GoogleAuthClient(config);
}
