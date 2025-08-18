import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCli } from './cli.js';

// モジュールのモック
const mockStartProxy = vi.fn();
vi.mock('../usecase/start-proxy.js', () => ({
  startProxy: mockStartProxy,
}));

describe('CLI', () => {
  let originalArgv: string[];
  let mockStderr: any;
  let mockExit: any;

  beforeEach(() => {
    originalArgv = process.argv;
    mockStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe('引数解析', () => {
    it('有効な引数でstartProxyを呼び出す', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com', '--timeout', '60000', '--verbose'];
      mockStartProxy.mockResolvedValue(undefined);

      await runCli();

      expect(mockStartProxy).toHaveBeenCalledWith({
        url: 'https://example.com',
        timeout: 60000,
        verbose: true,
      });
    });

    it('短縮形のオプションを処理する', async () => {
      process.argv = ['node', 'cli.js', '-u', 'https://example.com', '-t', '30000', '-v'];
      mockStartProxy.mockResolvedValue(undefined);

      await runCli();

      expect(mockStartProxy).toHaveBeenCalledWith({
        url: 'https://example.com',
        timeout: 30000,
        verbose: true,
      });
    });

    it('デフォルト値を使用する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com'];
      mockStartProxy.mockResolvedValue(undefined);

      await runCli();

      expect(mockStartProxy).toHaveBeenCalledWith({
        url: 'https://example.com',
        timeout: 120000,
        verbose: false,
      });
    });
  });

  describe('バリデーション', () => {
    it('URLが未指定の場合エラーを出力する', async () => {
      process.argv = ['node', 'cli.js'];

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith(
        'Error: URL is required. Use --url or -u to specify the Cloud Run service URL.\n'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('非HTTPSのURLを拒否する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'http://example.com'];

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Error: URL must be HTTPS\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('無効なURL形式を拒否する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'not-a-url'];

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Error: Invalid URL format\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('負のタイムアウトを拒否する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com', '--timeout', '-1'];

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Error: Timeout must be positive\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('大きすぎるタイムアウトを拒否する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com', '--timeout', '700000'];

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Error: Timeout cannot exceed 10 minutes (600000ms)\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('verboseモード', () => {
    it('verboseモードでログを出力する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com', '--verbose'];
      mockStartProxy.mockResolvedValue(undefined);

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Starting MCP proxy for https://example.com\n');
      expect(mockStderr).toHaveBeenCalledWith('Timeout: 120000ms\n');
    });
  });

  describe('エラーハンドリング', () => {
    it('startProxyのエラーを処理する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com'];
      mockStartProxy.mockRejectedValue(new Error('Connection failed'));

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Error: Connection failed\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('予期しないエラーを処理する', async () => {
      process.argv = ['node', 'cli.js', '--url', 'https://example.com'];
      mockStartProxy.mockRejectedValue('string error');

      await runCli();

      expect(mockStderr).toHaveBeenCalledWith('Error: Unknown error\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});