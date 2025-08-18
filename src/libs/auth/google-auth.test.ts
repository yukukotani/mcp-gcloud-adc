import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleAuthClient, createAuthClient } from './google-auth.js';
import type { AuthConfig } from './types.js';

// Google Auth Libraryのモック
const mockFetchIdToken = vi.fn();
const mockGetClient = vi.fn();

vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({
    getClient: mockGetClient,
  })),
}));

describe('GoogleAuthClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getIdToken', () => {
    it('有効なaudienceでIDトークンを取得する', async () => {
      const mockClient = {
        fetchIdToken: mockFetchIdToken,
      };
      
      const expiration = Math.floor((Date.now() + 3600000) / 1000); // 1時間後
      const mockToken = `header.${Buffer.from(JSON.stringify({ exp: expiration })).toString('base64')}.signature`;
      
      mockGetClient.mockResolvedValue(mockClient);
      mockFetchIdToken.mockResolvedValue(mockToken);

      const authClient = new GoogleAuthClient();
      const result = await authClient.getIdToken('https://example.com');

      expect(result.type).toBe('success');
      if (result.type === 'success') {
        expect(result.token).toBe(mockToken);
        expect(result.expiresAt).toBeInstanceOf(Date);
      }
    });

    it('無効なaudienceを拒否する', async () => {
      const authClient = new GoogleAuthClient();
      
      const invalidAudiences = [
        'http://example.com',
        'not-a-url',
        'ftp://example.com',
      ];

      for (const audience of invalidAudiences) {
        const result = await authClient.getIdToken(audience);
        expect(result.type).toBe('error');
        if (result.type === 'error') {
          expect(result.error.kind).toBe('invalid-audience');
        }
      }
    });

    it('クレデンシャルがない場合にエラーを返す', async () => {
      mockGetClient.mockResolvedValue(null);

      const authClient = new GoogleAuthClient();
      const result = await authClient.getIdToken('https://example.com');

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.error.kind).toBe('no-credentials');
        expect(result.error.message).toContain('No credentials found');
      }
    });

    it('fetchIdTokenをサポートしないクライアントでエラーを返す', async () => {
      const mockClient = {}; // fetchIdTokenメソッドなし
      mockGetClient.mockResolvedValue(mockClient);

      const authClient = new GoogleAuthClient();
      const result = await authClient.getIdToken('https://example.com');

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.error.kind).toBe('no-credentials');
        expect(result.error.message).toContain('does not support ID token generation');
      }
    });

    it('トークン取得が失敗した場合にエラーを返す', async () => {
      const mockClient = {
        fetchIdToken: mockFetchIdToken,
      };
      
      mockGetClient.mockResolvedValue(mockClient);
      mockFetchIdToken.mockRejectedValue(new Error('Network error'));

      const authClient = new GoogleAuthClient();
      const result = await authClient.getIdToken('https://example.com');

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.error.kind).toBe('token-fetch-failed');
        expect(result.error.message).toContain('Network error');
      }
    });

    it('キャッシュされたトークンを再利用する', async () => {
      const mockClient = {
        fetchIdToken: mockFetchIdToken,
      };
      
      const expiration = Math.floor((Date.now() + 3600000) / 1000); // 1時間後
      const mockToken = `header.${Buffer.from(JSON.stringify({ exp: expiration })).toString('base64')}.signature`;
      
      mockGetClient.mockResolvedValue(mockClient);
      mockFetchIdToken.mockResolvedValue(mockToken);

      const authClient = new GoogleAuthClient();
      
      // 最初の呼び出し
      const result1 = await authClient.getIdToken('https://example.com');
      expect(result1.type).toBe('success');
      expect(mockFetchIdToken).toHaveBeenCalledTimes(1);

      // 2回目の呼び出し（キャッシュから取得）
      const result2 = await authClient.getIdToken('https://example.com');
      expect(result2.type).toBe('success');
      expect(mockFetchIdToken).toHaveBeenCalledTimes(1); // 増えない
    });

    it('期限切れのキャッシュを無視して新しいトークンを取得する', async () => {
      const mockClient = {
        fetchIdToken: mockFetchIdToken,
      };
      
      // 過去の有効期限
      const pastExpiration = Math.floor((Date.now() - 1000) / 1000);
      const expiredToken = `header.${Buffer.from(JSON.stringify({ exp: pastExpiration })).toString('base64')}.signature`;
      
      // 新しい有効期限
      const futureExpiration = Math.floor((Date.now() + 3600000) / 1000);
      const newToken = `header.${Buffer.from(JSON.stringify({ exp: futureExpiration })).toString('base64')}.signature`;
      
      mockGetClient.mockResolvedValue(mockClient);
      mockFetchIdToken.mockResolvedValueOnce(expiredToken).mockResolvedValueOnce(newToken);

      const authClient = new GoogleAuthClient();
      
      // 最初の呼び出し（期限切れトークン）
      await authClient.getIdToken('https://example.com');
      
      // 時間を進める
      vi.advanceTimersByTime(1000);
      
      // 2回目の呼び出し（新しいトークンを取得）
      const result = await authClient.getIdToken('https://example.com');
      expect(result.type).toBe('success');
      if (result.type === 'success') {
        expect(result.token).toBe(newToken);
      }
      expect(mockFetchIdToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshToken', () => {
    it('キャッシュをクリアして新しいトークンを取得する', async () => {
      const mockClient = {
        fetchIdToken: mockFetchIdToken,
      };
      
      const expiration = Math.floor((Date.now() + 3600000) / 1000);
      const token1 = `header.${Buffer.from(JSON.stringify({ exp: expiration })).toString('base64')}.signature1`;
      const token2 = `header.${Buffer.from(JSON.stringify({ exp: expiration })).toString('base64')}.signature2`;
      
      mockGetClient.mockResolvedValue(mockClient);
      mockFetchIdToken.mockResolvedValueOnce(token1).mockResolvedValueOnce(token2);

      const authClient = new GoogleAuthClient();
      
      // 最初にトークンを取得
      await authClient.getIdToken('https://example.com');
      
      // リフレッシュ
      const result = await authClient.refreshToken('https://example.com');
      expect(result.type).toBe('success');
      if (result.type === 'success') {
        expect(result.token).toBe(token2);
      }
      expect(mockFetchIdToken).toHaveBeenCalledTimes(2);
    });
  });
});

describe('createAuthClient', () => {
  it('GoogleAuthClientのインスタンスを作成する', () => {
    const config: AuthConfig = {
      credentialsPath: '/path/to/credentials.json',
      projectId: 'my-project',
    };
    
    const client = createAuthClient(config);
    expect(client).toBeInstanceOf(GoogleAuthClient);
  });

  it('設定なしでクライアントを作成する', () => {
    const client = createAuthClient();
    expect(client).toBeInstanceOf(GoogleAuthClient);
  });
});