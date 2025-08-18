import { GoogleAuth } from "google-auth-library";
import type {
  AuthClient,
  AuthConfig,
  GetIdTokenResult,
  TokenCache,
} from "./types.js";

type GoogleAuthState = {
  googleAuth: GoogleAuth;
  tokenCache: TokenCache;
};

const isValidAudience = (audience: string): boolean => {
  try {
    const url = new URL(audience);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

const getCachedToken = (state: GoogleAuthState, audience: string) => {
  return state.tokenCache[audience];
};

const isTokenValid = (expiresAt: Date): boolean => {
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5分のバッファ
  return expiresAt.getTime() - now.getTime() > buffer;
};

const extractTokenExpiration = (token: string): Date => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
      return new Date(Date.now() + 60 * 60 * 1000);
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
};

const fetchNewToken = async (
  state: GoogleAuthState,
  audience: string,
): Promise<GetIdTokenResult> => {
  try {
    const client = await state.googleAuth.getClient();

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

    const idToken = await (
      client as { fetchIdToken: (audience: string) => Promise<string> }
    ).fetchIdToken(audience);

    if (!idToken || typeof idToken !== "string") {
      return {
        type: "error",
        error: {
          kind: "invalid-token",
          message: "Failed to retrieve a valid ID token.",
        },
      };
    }

    const expiresAt = extractTokenExpiration(idToken);

    state.tokenCache[audience] = {
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
};

const getIdToken = async (
  state: GoogleAuthState,
  audience: string,
): Promise<GetIdTokenResult> => {
  if (!isValidAudience(audience)) {
    return {
      type: "error",
      error: {
        kind: "invalid-audience",
        message: `Invalid audience: ${audience}. Must be a valid HTTPS URL.`,
      },
    };
  }

  const cached = getCachedToken(state, audience);
  if (cached && isTokenValid(cached.expiresAt)) {
    return {
      type: "success",
      token: cached.token,
      expiresAt: cached.expiresAt,
    };
  }

  return fetchNewToken(state, audience);
};

const refreshToken = async (
  state: GoogleAuthState,
  audience: string,
): Promise<GetIdTokenResult> => {
  delete state.tokenCache[audience];
  return getIdToken(state, audience);
};

const createGoogleAuthState = (config: AuthConfig = {}): GoogleAuthState => {
  const authOptions: {
    scopes: string[];
    keyFilename?: string;
    projectId?: string;
  } = {
    scopes: [], // IDトークンには不要
  };

  if (config.credentialsPath) {
    authOptions.keyFilename = config.credentialsPath;
  }

  if (config.projectId) {
    authOptions.projectId = config.projectId;
  }

  return {
    googleAuth: new GoogleAuth(authOptions),
    tokenCache: {},
  };
};

export function createAuthClient(config: AuthConfig = {}): AuthClient {
  const state = createGoogleAuthState(config);

  return {
    getIdToken: (audience: string) => getIdToken(state, audience),
    refreshToken: (audience: string) => refreshToken(state, audience),
  };
}
