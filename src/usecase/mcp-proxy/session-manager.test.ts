import { beforeEach, describe, expect, it } from "vitest";
import { createSessionManager } from "./session-manager.js";
import type { SessionManager } from "./types.js";

describe("SessionManager", () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = createSessionManager();
  });

  it("初期状態ではセッションIDがnull", () => {
    expect(sessionManager.getSessionId()).toBeNull();
  });

  it("セッションIDを設定・取得できる", () => {
    const sessionId = "test-session-123";
    sessionManager.setSessionId(sessionId);
    expect(sessionManager.getSessionId()).toBe(sessionId);
  });

  it("セッションIDを更新できる", () => {
    const firstSessionId = "session-1";
    const secondSessionId = "session-2";

    sessionManager.setSessionId(firstSessionId);
    expect(sessionManager.getSessionId()).toBe(firstSessionId);

    sessionManager.setSessionId(secondSessionId);
    expect(sessionManager.getSessionId()).toBe(secondSessionId);
  });

  it("セッションをクリアできる", () => {
    const sessionId = "test-session-456";
    sessionManager.setSessionId(sessionId);
    expect(sessionManager.getSessionId()).toBe(sessionId);

    sessionManager.clearSession();
    expect(sessionManager.getSessionId()).toBeNull();
  });

  it("空文字のセッションIDを設定できる", () => {
    sessionManager.setSessionId("");
    expect(sessionManager.getSessionId()).toBe("");
  });

  it("複数回クリアを呼んでもエラーにならない", () => {
    sessionManager.setSessionId("test-session");
    sessionManager.clearSession();
    sessionManager.clearSession();
    expect(sessionManager.getSessionId()).toBeNull();
  });
});
