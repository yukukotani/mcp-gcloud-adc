import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CliArgs } from './cli.js';

describe('CLI Command Definition', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL validation', () => {
    it('HTTPSのURLを受け入れる', async () => {
      const validUrls = [
        'https://example.com',
        'https://my-service-abc123-uc.a.run.app',
        'https://api.example.com:8080/path',
      ];

      const { proxyCommand } = await import('./cli.js');
      
      for (const url of validUrls) {
        const validation = proxyCommand.args.url.validate?.(url);
        expect(validation).toBe(true);
      }
    });

    it('非HTTPSのURLを拒否する', async () => {
      const invalidUrls = [
        'http://example.com',
        'ftp://example.com',
        'ws://example.com',
      ];

      const { proxyCommand } = await import('./cli.js');
      
      for (const url of invalidUrls) {
        const validation = proxyCommand.args.url.validate?.(url);
        expect(validation).toBe('URL must be HTTPS');
      }
    });

    it('無効なURL形式を拒否する', async () => {
      const invalidUrls = [
        'not-a-url',
        'https://',
        '//example.com',
        'https://[invalid',
      ];

      const { proxyCommand } = await import('./cli.js');
      
      for (const url of invalidUrls) {
        const validation = proxyCommand.args.url.validate?.(url);
        expect(validation).toBe('Invalid URL format');
      }
    });
  });

  describe('Timeout validation', () => {
    it('有効なタイムアウト値を受け入れる', async () => {
      const validTimeouts = [1, 1000, 60000, 120000, 600000];

      const { proxyCommand } = await import('./cli.js');
      
      for (const timeout of validTimeouts) {
        const validation = proxyCommand.args.timeout.validate?.(timeout);
        expect(validation).toBe(true);
      }
    });

    it('無効なタイムアウト値を拒否する', async () => {
      const { proxyCommand } = await import('./cli.js');
      
      expect(proxyCommand.args.timeout.validate?.(0)).toBe('Timeout must be positive');
      expect(proxyCommand.args.timeout.validate?.(-1)).toBe('Timeout must be positive');
      expect(proxyCommand.args.timeout.validate?.(600001)).toBe('Timeout cannot exceed 10 minutes (600000ms)');
      expect(proxyCommand.args.timeout.validate?.(1000000)).toBe('Timeout cannot exceed 10 minutes (600000ms)');
    });
  });

  describe('Default values', () => {
    it('デフォルトのタイムアウト値が120000msである', async () => {
      const { proxyCommand } = await import('./cli.js');
      expect(proxyCommand.args.timeout.default).toBe(120000);
    });

    it('verboseのデフォルト値がundefinedである', async () => {
      const { proxyCommand } = await import('./cli.js');
      expect(proxyCommand.args.verbose.default).toBeUndefined();
    });
  });

  describe('Command execution', () => {
    it('有効な引数でstartProxyを呼び出す', async () => {
      const mockStartProxy = vi.fn().mockResolvedValue(undefined);
      vi.doMock('../usecase/start-proxy.js', () => ({
        startProxy: mockStartProxy,
      }));

      const { proxyCommand } = await import('./cli.js');
      
      const ctx = {
        values: {
          url: 'https://example.com',
          timeout: 60000,
          verbose: true,
        },
      };

      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      
      await proxyCommand.run(ctx as any);

      expect(mockStartProxy).toHaveBeenCalledWith({
        url: 'https://example.com',
        timeout: 60000,
        verbose: true,
      });

      expect(mockStderr).toHaveBeenCalledWith('Starting MCP proxy for https://example.com\n');
      expect(mockStderr).toHaveBeenCalledWith('Timeout: 60000ms\n');
    });

    it('エラー時に適切なメッセージを出力する', async () => {
      const mockStartProxy = vi.fn().mockRejectedValue(new Error('Connection failed'));
      vi.doMock('../usecase/start-proxy.js', () => ({
        startProxy: mockStartProxy,
      }));

      const { proxyCommand } = await import('./cli.js');
      
      const ctx = {
        values: {
          url: 'https://example.com',
          timeout: 60000,
          verbose: false,
        },
      };

      const mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      await proxyCommand.run(ctx as any);

      expect(mockStderr).toHaveBeenCalledWith('Failed to start proxy: Connection failed\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});