# mcp-gcloud-adc

Google Cloud Application Default Credentials (ADC) を使用してリモートMCPサーバーにアクセスするための認証プロキシ

## 概要

このツールはstdio MCPサーバーとして動作し、全てのリクエストをリモートMCPサーバーに転送します。その際、Google Cloud Application Default Credentials (ADC) トークンを含む`Authorization`ヘッダーを自動的に付与します。

Cloud RunなどのIAMで保護されたサービス上でホストされているリモートMCPサーバーへの接続を可能にします。

## 使用方法

### 前提条件

Google Cloudの認証を設定する必要があります。以下のいずれかの方法を選択してください：

```bash
# 方法1: gcloud CLIを使用したユーザー認証
gcloud auth application-default login

# 方法2: サービスアカウントキーを使用
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

詳細は[Google Cloudのドキュメント](https://cloud.google.com/docs/authentication/provide-credentials-adc)を参照してください。

### 基本的な使用方法

```bash
# MCPプロキシを起動
mcp-gcloud-adc --url https://your-cloud-run-service.run.app
```

### Claude Codeへの設定

```bash
# ユーザースコープに追加（全プロジェクトで利用可能）
claude mcp add foobar -s user -- npx -y mcp-gcloud-adc -u https://foobar.run.app

# またはプロジェクトスコープに追加してチームと共有
claude mcp add foobar -s project -- npx -y mcp-gcloud-adc -u https://foobar.run.app
```

## ライセンス

Apache 2.0 License