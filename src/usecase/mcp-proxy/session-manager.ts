import { logger } from "../../libs/logging/logger.js";
import type { SessionManager } from "./types.js";

export function createSessionManager(): SessionManager {
  let sessionId: string | null = null;

  return {
    getSessionId(): string | null {
      return sessionId;
    },

    setSessionId(newSessionId: string): void {
      logger.debug({ sessionId: newSessionId }, "セッションIDを設定");
      sessionId = newSessionId;
    },

    clearSession(): void {
      logger.debug({ sessionId }, "セッションをクリア");
      sessionId = null;
    },
  };
}
