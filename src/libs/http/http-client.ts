import type {
  HttpClient,
  HttpRequestConfig,
  HttpResponse,
  StreamChunk,
} from "./types.js";

const extractHeaders = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const safeReadResponseText = async (response: Response): Promise<string> => {
  try {
    return await response.text();
  } catch {
    return "";
  }
};

const post = async (config: HttpRequestConfig): Promise<HttpResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: JSON.stringify(config.body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseHeaders = extractHeaders(response.headers);

    if (!response.ok) {
      const errorBody = await safeReadResponseText(response);
      return {
        type: "error",
        error: {
          kind: "http-error",
          status: response.status,
          message: `HTTP ${response.status} ${response.statusText}`,
          body: errorBody,
        },
      };
    }

    const responseText = await response.text();
    let data: unknown;

    try {
      // SSE形式のレスポンスをチェック（MCP over HTTP）
      if (responseText.includes("event: message\ndata: ")) {
        const dataMatch = responseText.match(/data: (.+)/);
        if (dataMatch?.[1]) {
          data = JSON.parse(dataMatch[1]);
        } else {
          return {
            type: "error",
            error: {
              kind: "parse-error",
              message: "SSE format but no data found",
              body: responseText,
            },
          };
        }
      } else {
        data = JSON.parse(responseText);
      }
    } catch (parseError) {
      return {
        type: "error",
        error: {
          kind: "parse-error",
          message: "Failed to parse response as JSON",
          body: responseText,
          parseError:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        },
      };
    }

    return {
      type: "success",
      data,
      status: response.status,
      headers: responseHeaders,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          type: "error",
          error: {
            kind: "timeout",
            message: `Request timed out after ${config.timeout}ms`,
          },
        };
      }

      return {
        type: "error",
        error: {
          kind: "network-error",
          message: error.message,
          originalError: error,
        },
      };
    }

    return {
      type: "error",
      error: {
        kind: "network-error",
        message: "Unknown network error",
        originalError: error,
      },
    };
  }
};

async function* postStream(
  config: HttpRequestConfig,
): AsyncIterable<StreamChunk> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: JSON.stringify(config.body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await safeReadResponseText(response);
      yield {
        type: "error",
        error: {
          kind: "http-error",
          status: response.status,
          message: `HTTP ${response.status} ${response.statusText}`,
          body: errorBody,
        },
      };
      return;
    }

    if (!response.body) {
      yield {
        type: "error",
        error: {
          kind: "network-error",
          message: "Response body is null",
        },
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            yield {
              type: "data",
              data: buffer,
              isLast: true,
            };
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 行ごとに分割してストリーミング
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 最後の不完全な行は保持

        for (const line of lines) {
          if (line.trim()) {
            yield {
              type: "data",
              data: line,
              isLast: false,
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      yield {
        type: "error",
        error: {
          kind: "timeout",
          message: `Request timed out after ${config.timeout}ms`,
        },
      };
      return;
    }

    yield {
      type: "error",
      error: {
        kind: "network-error",
        message:
          error instanceof Error ? error.message : "Unknown network error",
        originalError: error,
      },
    };
  }
}

export function createHttpClient(): HttpClient {
  return {
    post,
    postStream,
  };
}
