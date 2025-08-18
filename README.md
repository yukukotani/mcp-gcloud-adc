# mcp-gcloud-adc

Google Cloud Application Default Credentials (ADC) を使用して MCP サーバーにアクセスするためのプロキシツール

## 概要

このツールは、Google Cloud の Application Default Credentials (ADC) を使用して認証を行い、Model Context Protocol (MCP) サーバーへのリクエストをプロキシします。Cloud Run などの Google Cloud サービスで動作する MCP サーバーにアクセスする際に便利です。

## 機能

- **ADC 認証**: Google Cloud の Application Default Credentials を自動的に使用
- **MCP プロキシ**: JSON-RPC 形式の MCP リクエストを透明にプロキシ
- **エラーハンドリング**: 認証エラー、ネットワークエラー、HTTP エラーを適切に処理
- **CLI インターフェース**: シンプルなコマンドライン操作

## セットアップ

### 1. 依存関係のインストール

```bash
bun install
```

### 2. Google Cloud 認証の設定

以下のいずれかの方法で ADC を設定してください：

```bash
# 方法1: gcloud CLI を使用してユーザー認証
gcloud auth application-default login

# 方法2: サービスアカウントキーを使用
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### 3. ビルド

```bash
bun run build
```

## 使用方法

### 基本的な使用法

```bash
# MCP プロキシを起動
bun run start --url https://your-cloud-run-service.run.app --timeout 30000

# または、ビルド済みバイナリを使用
node dist/index.js --url https://your-cloud-run-service.run.app --timeout 30000
```

### パラメータ

- `--url`: プロキシ先の MCP サーバーの URL（必須）
- `--timeout`: リクエストのタイムアウト時間（ミリ秒、デフォルト: 30000）

### 使用例

```bash
# Cloud Run サービスにプロキシする例
bun run start --url https://mcp-server-abcd1234-uw.a.run.app --timeout 10000

# ローカルの HTTP サーバーにプロキシする例（認証なし）
bun run start --url http://localhost:3000 --timeout 5000
```

## アーキテクチャ

### ディレクトリ構造

```
src/
├── presentation/     # プレゼンテーション層
│   ├── cli.ts       # CLI インターフェース
│   └── mcp-proxy-handlers.ts  # HTTP/JSON-RPC 変換
├── usecase/         # ユースケース層
│   └── mcp-proxy/   # プロキシのビジネスロジック
└── libs/           # ライブラリ層
    ├── auth/       # Google Cloud 認証
    └── http/       # HTTP クライント
```

### 主要コンポーネント

- **CLI (`presentation/cli.ts`)**: コマンドライン引数の処理とアプリケーションの起動
- **MCP Proxy (`usecase/mcp-proxy/`)**: 認証付きリクエストの処理とアップストリームへの転送
- **Auth Client (`libs/auth/`)**: Google Cloud ADC を使用したID トークンの取得
- **HTTP Client (`libs/http/`)**: HTTP リクエストの送信とエラーハンドリング

## 開発

### テストの実行

```bash
# 全てのテストを実行
bun test

# 特定のテストファイルを実行
bun test src/usecase/mcp-proxy/handler.test.ts

# Vitest を直接使用
bunx vitest
```

### リントとフォーマット

```bash
# リントとタイプチェックを実行
bun lint

# フォーマットを修正
bun run biome check . --fix
```

### ビルド

```bash
# TypeScript をコンパイル
bun run build

# 開発モードで監視
bun run dev
```

## 認証について

このツールは Google Cloud の Application Default Credentials (ADC) を使用します。ADC は以下の順序で認証情報を検索します：

1. `GOOGLE_APPLICATION_CREDENTIALS` 環境変数で指定されたサービスアカウントキー
2. gcloud CLI で設定されたユーザー認証情報
3. Google Cloud 環境（Compute Engine、Cloud Run など）のメタデータサーバー

詳細は [Google Cloud のドキュメント](https://cloud.google.com/docs/authentication/application-default-credentials) を参照してください。

## エラーハンドリング

以下のエラーが適切にハンドリングされます：

- **認証エラー**: ADC 認証情報が見つからない、またはトークンが無効
- **ネットワークエラー**: 接続失敗、タイムアウト
- **HTTP エラー**: 4xx、5xx ステータスコード
- **JSON-RPC エラー**: 無効なリクエスト/レスポンス形式

## ライセンス

MIT License

## 開発者向け情報

### コミット規則

- 小さく、頻繁なコミットを推奨
- コミットメッセージは日本語で記述
- 各タスクごとに個別にコミット

### テスト駆動開発

- 新機能の実装前にテストを作成
- power-assert を使用したアサーション
- vitest を使用したテスト実行

### コーディング規則

- 関数型プログラミングスタイル
- エラーハンドリングにはtagged unionを使用
- クラスよりも関数を優先