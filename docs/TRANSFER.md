# 現場ボイスアプリ 引き継ぎマニュアル（AIサポート対応・完全版）

このドキュメントは、現場ボイスアプリの運用・保守を新たに担当される方が「AI（ChatGPT等）に説明させながら」最短・確実にセットアップできるよう、全ての手順・注意点・FAQを網羅しています。

---

## 目次
1. 必要ファイル一覧と構成
2. セットアップ全体フロー
3. .envファイルの作成・設定
4. Google Apps Script（GAS）導入・カスタマイズ手順
5. 画像・音声・テキストデータの扱い
6. よくあるトラブルと解決法
7. よくある質問（FAQ）
8. 注意事項・セキュリティ

---

## 1. 必要ファイル一覧と構成

- `.env` … 環境変数ファイル（APIキーやGASエンドポイントを設定）
- `.env.example` … 上記のサンプル。これをコピーして使う
- `gas/GAS_upload_image.gs` … 画像アップロード用GASコード
- `gas/GAS_write_sheet.gs` … シート書き込み用GASコード
- `docs/TRANSFER.md` … このマニュアル

```
whisper-voice/
├── .env.example
├── .env（自分で作成）
├── gas/
│   ├── GAS_upload_image.gs
│   └── GAS_write_sheet.gs
├── docs/
│   └── TRANSFER.md
...
```

---

## 2. セットアップ全体フロー

1. `.env.example`をコピーし`.env`を作成、APIキーやGASエンドポイントを記入
2. Google Apps Script（GAS）で新規プロジェクトを作成し、`gas/`内のコードを貼り付け
3. GASでDriveやSpreadsheetの保存先IDを自分用に変更
4. GASを「ウェブアプリとしてデプロイ」し、公開URLを`.env`に記載
5. アプリを起動し、動作確認

---

## 3. .envファイルの作成・設定

`.env.example`をコピーして`.env`を作成し、下記4項目を必ず設定してください。

| 変数名                  | 用途                              | 例・取得方法                   |
|------------------------|-----------------------------------|-------------------------------|
| PORT                   | サーバのポート番号（任意）        | 3001                          |
| OPENAI_API_KEY         | OpenAI APIキー（Whisper/GPT用）   | OpenAIで取得                  |
| GAS_SHEETS_SAVE_URL    | GAS（シート書込）エンドポイント   | GASデプロイURL                |
| GAS_IMAGE_UPLOAD_URL   | GAS（画像アップロード）エンドポイント | GASデプロイURL            |

- **APIキー取得方法**: [OpenAI](https://platform.openai.com/) でAPIキーを発行
- **GASエンドポイント**: GASを「ウェブアプリとしてデプロイ」し、公開URLを取得

> ⚠️ `.env`は絶対にGitHubなどに公開しないでください

---

## 4. Google Apps Script（GAS）導入・カスタマイズ手順

### 4.1 GASコードの場所と役割
- `gas/GAS_upload_image.gs` … 画像ファイルをGoogle Driveに保存し、公開URLを返す
- `gas/GAS_write_sheet.gs` … 音声→テキスト変換後のデータ等をスプレッドシートに保存

### 4.2 新規GASプロジェクトの作成・設定
1. [Google Apps Script](https://script.google.com/) で新規プロジェクトを作成
2. `gas/`内の各`.gs`ファイルの内容を同名または分かりやすいファイル名で貼り付け
3. コード先頭付近の`FOLDER_ID`（Drive保存先）や`SPREADSHEET_ID`（シート保存先）を自分の環境に合わせて書き換え
4. 「ウェブアプリとしてデプロイ」し、アクセス権限を「全員（匿名ユーザー）」に設定
5. デプロイURLを`.env`の該当項目に記入

#### 4.3 画像URLの仕様について
- `GAS_upload_image.gs`内の
  ```js
  const imageUrl = `https://drive.google.com/uc?id=${file.getId()}&export=view`;
  ```
  はGoogle Driveのファイルを公開URLで返す標準仕様です。Drive以外のストレージを使う場合のみ書き換えが必要ですが、**通常はこのままでOK**です。

#### 4.4 保存先の変更方法
- DriveやSpreadsheetの保存先を変更したい場合は、GASコード内の`FOLDER_ID`や`SPREADSHEET_ID`の値を差し替えてください。

---

## 5. 画像・音声・テキストデータの扱い
- 画像ファイル名は`report_YYYYMMDD_shipXXX_blockYYY_reporter.jpg`形式で保存
- 音声はWhisper APIで文字起こしし、GPT-3.5で要約。**変換後のテキストのみ保存、音声ファイル自体は保存しません**
- 画像・音声は必須ではなく、テキストデータが最重要

---

## 6. よくあるトラブルと解決法
- **GASでエラーが出る**
  - エンドポイントURLやIDの設定ミスが多い。`.env`とGASコードを再確認
  - GASの公開権限が「全員」になっているか確認
- **画像のURLにアクセスできない**
  - Driveの共有設定を「リンクを知っている全員が閲覧可」にする
- **OpenAI APIでエラー**
  - APIキーの有効期限や課金状況を確認
- **Google認証や権限エラー**
  - GASプロジェクトのオーナー権限・Drive/Spreadsheetの共有設定を再確認

---

## 7. よくある質問（FAQ）
- **Q. WhisperやGPTのAPI設定は難しい？**
  - A. `.env`にAPIキーを入力するだけでOKです
- **Q. GASのデプロイURLが分からない**
  - A. GASの「デプロイ」→「新しいデプロイ」→「ウェブアプリ」→「URLをコピー」で取得
- **Q. 画像やテキストの保存先を途中で変えたい**
  - A. GASコード内のIDを書き換えて再デプロイすればOK

---

## 8. 注意事項・セキュリティ
- `.env`やAPIキーは絶対に外部公開しない
- GASの公開設定は「全員（匿名ユーザー）」に必ず設定
- Google DriveやSpreadsheetの管理権限は運用者自身で管理
- 不明点・トラブルは前管理者かAIサポートに相談

---

**このマニュアルはAIによる自動解説にも完全対応しています。分からない点は「このTRANSFER.mdを読んで」とAIに指示すれば、手順や注意点を一つずつ解説できます。**

---

これで引き継ぎは完了です。安心してご利用ください！

