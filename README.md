# mcp-gcloud-adc

Google Cloud Application Default Credentials (ADC) を使用して MCP サーバーにアクセスするためのプロキシツール

## 概要

このツールは Google Cloud Application Default Credentials (ADC) を使用して認証を行い、Model Context Protocol (MCP) サーバーへのリクエストをプロキシします。特に Cloud Run などの Google Cloud サービス上で動作する MCP サーバーへのアクセスに便利です。

## 主な機能

- **ADC 認証**: Google Cloud Application Default Credentials を自動的に使用
- **MCP プロキシ**: JSON-RPC 形式の MCP リクエストを透過的にプロキシ
- **エラーハンドリング**: 認証エラー、ネットワークエラー、HTTP エラーを適切に処理
- **CLI インターフェース**: シンプルなコマンドライン操作

## インストール

```bash
npm install -g mcp-gcloud-adc
```

## 使い方

### 前提条件

Google Cloud の認証情報を設定する必要があります。以下のいずれかの方法で設定してください：

```bash
# 方法1: gcloud CLI を使用したユーザー認証
gcloud auth application-default login

# 方法2: サービスアカウントキーを使用
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### 基本的な使い方

```bash
# MCP プロキシを起動
mcp-gcloud-adc --url https://your-cloud-run-service.run.app --timeout 30000
```

### パラメータ

- `--url`: ターゲット MCP サーバーの URL（必須）
- `--timeout`: リクエストタイムアウト（ミリ秒）（デフォルト: 30000）

### 使用例

```bash
# Cloud Run サービスへのプロキシ
mcp-gcloud-adc --url https://mcp-server-abcd1234-uw.a.run.app --timeout 10000

# ローカル HTTP サーバーへのプロキシ（認証なし）
mcp-gcloud-adc --url http://localhost:3000 --timeout 5000
```

## Claude Desktop での設定

Claude Desktop の設定ファイル（`claude_desktop_config.json`）に以下のように追加します：

```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "npx",
      "args": [
        "mcp-gcloud-adc",
        "--url",
        "https://your-cloud-run-service.run.app"
      ]
    }
  }
}
```

## 認証について

このツールは Google Cloud Application Default Credentials (ADC) を使用します。ADC は以下の順序で認証情報を検索します：

1. `GOOGLE_APPLICATION_CREDENTIALS` 環境変数で指定されたサービスアカウントキー
2. gcloud CLI で設定されたユーザー認証情報
3. Google Cloud 環境（Compute Engine、Cloud Run など）のメタデータサーバー

詳細については [Google Cloud のドキュメント](https://cloud.google.com/docs/authentication/application-default-credentials) を参照してください。

## エラーハンドリング

以下のエラーが適切に処理されます：

- **認証エラー**: ADC 認証情報が見つからない、または無効なトークン
- **ネットワークエラー**: 接続失敗、タイムアウト
- **HTTP エラー**: 4xx、5xx ステータスコード
- **JSON-RPC エラー**: 無効なリクエスト/レスポンス形式

## トラブルシューティング

### 認証エラーが発生する場合

```bash
# ADC が正しく設定されているか確認
gcloud auth application-default print-access-token

# 再度ログイン
gcloud auth application-default login
```

### タイムアウトが発生する場合

`--timeout` パラメータの値を増やしてください：

```bash
mcp-gcloud-adc --url https://your-service.run.app --timeout 60000
```

## ライセンス

MIT License

## 貢献

Issue や Pull Request を歓迎します。[GitHub リポジトリ](https://github.com/yukukotani/mcp-gcloud-adc) をご覧ください。