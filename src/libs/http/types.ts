export type HttpClient = {
  post: (config: HttpRequestConfig) => Promise<HttpResponse>;
  postStream: (config: HttpRequestConfig) => AsyncIterable<StreamChunk>;
};

export type HttpRequestConfig = {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeout: number;
};

export type HttpResponse =
  | {
      type: "success";
      data: unknown;
      status: number;
      headers: Record<string, string>;
    }
  | { type: "error"; error: HttpError };

export type HttpError =
  | { kind: "network-error"; message: string; originalError?: unknown }
  | { kind: "timeout"; message: string }
  | { kind: "http-error"; status: number; message: string; body?: string }
  | {
      kind: "parse-error";
      message: string;
      originalError?: unknown;
      body?: string;
      parseError?: string;
    };

export type StreamChunk = {
  data: string;
  isLast: boolean;
};

export type HttpRequestInit = {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};
