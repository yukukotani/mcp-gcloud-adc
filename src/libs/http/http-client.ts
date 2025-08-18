import type { HttpClient, HttpRequestConfig, HttpResponse, StreamChunk } from './types.js';

export class FetchHttpClient implements HttpClient {
  async post(config: HttpRequestConfig): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(config.body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseHeaders = this.extractHeaders(response.headers);

      if (!response.ok) {
        const errorBody = await this.safeReadResponseText(response);
        return {
          type: 'error',
          error: {
            kind: 'http-error',
            status: response.status,
            message: `HTTP ${response.status} ${response.statusText}`,
            body: errorBody,
          },
        };
      }

      const data = await this.parseJsonResponse(response);
      if (data === null) {
        return {
          type: 'error',
          error: {
            kind: 'parse-error',
            message: 'Failed to parse response as JSON',
          },
        };
      }

      return {
        type: 'success',
        data,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            type: 'error',
            error: {
              kind: 'timeout',
              message: `Request timed out after ${config.timeout}ms`,
            },
          };
        }

        return {
          type: 'error',
          error: {
            kind: 'network-error',
            message: error.message,
            originalError: error,
          },
        };
      }

      return {
        type: 'error',
        error: {
          kind: 'network-error',
          message: 'Unknown network error',
          originalError: error,
        },
      };
    }
  }

  async* postStream(config: HttpRequestConfig): AsyncIterable<StreamChunk> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(config.body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await this.safeReadResponseText(response);
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (buffer.trim()) {
              yield {
                data: buffer,
                isLast: true,
              };
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // 行ごとに分割してストリーミング
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 最後の不完全な行は保持

          for (const line of lines) {
            if (line.trim()) {
              yield {
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

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${config.timeout}ms`);
      }

      throw error;
    }
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async safeReadResponseText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  private async parseJsonResponse(response: Response): Promise<unknown | null> {
    try {
      const text = await response.text();
      if (!text.trim()) {
        return null;
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

export function createHttpClient(): HttpClient {
  return new FetchHttpClient();
}