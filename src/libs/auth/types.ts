export type AuthClient = {
  getIdToken: (audience: string) => Promise<GetIdTokenResult>;
  refreshToken: (audience: string) => Promise<GetIdTokenResult>;
};

export type GetIdTokenResult =
  | { type: "success"; token: string; expiresAt: Date }
  | { type: "error"; error: AuthError };

type AuthError =
  | { kind: "no-credentials"; message: string }
  | { kind: "invalid-audience"; message: string }
  | { kind: "token-fetch-failed"; message: string }
  | { kind: "invalid-token"; message: string };

export type TokenCache = {
  [audience: string]: {
    token: string;
    expiresAt: Date;
  };
};

export type AuthConfig = {
  credentialsPath?: string;
  projectId?: string;
};
