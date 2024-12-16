# README - スマートフォームフィラー拡張機能

## 概要

**スマートフォームフィラー**は、ChatGPT APIを活用したブラウザ拡張機能で、現在閲覧中のウェブページ上のフォーム入力フィールドを自動的に検出し、ユーザーが定義した情報で自動入力します。

ユーザーは拡張機能の設定画面で、自由にキーと値のペア（例：名前、住所、メールアドレスなど）を定義できます。フィールドの識別には、OpenAIのChatGPT APIを使用しており、高度な自然言語処理により、フォームの各入力欄に適切な情報を入力します。

## 特徴

- **カスタマイズ可能なキーと値のペア**：ユーザーは入力したい情報を自由に設定できます。
- **高度なフィールド識別**：ChatGPT APIを使用して、フォームフィールドの目的を正確に理解し、自動入力します。
- **シンプルな操作**：ワンクリックでフォームに自動入力できます。
- **日本語対応**：日本語のフォームにも対応しています。

## インストール方法

1. このリポジトリをクローン、またはZIPファイルをダウンロードして解凍します。
2. ブラウザ（Google Chromeなど）で「拡張機能管理画面」を開きます。
   - `chrome://extensions/` にアクセスします。
3. 右上の「デベロッパーモード」をオンにします。
4. 「パッケージ化されていない拡張機能を読み込む」または「Load unpacked」をクリックします。
5. ダウンロードした拡張機能のフォルダを選択し、読み込みます。

## 使い方

1. **APIキーの設定**
   - ブラウザのツールバーに表示される拡張機能のアイコンをクリックし、設定画面を開きます。
   - 「APIキー設定」セクションで、OpenAIのAPIキーを入力し、「保存」ボタンをクリックします。
   - *APIキーは[OpenAIのアカウントページ](https://platform.openai.com/account/api-keys)から取得できます。*

2. **入力項目の設定**
   - 「入力項目設定」セクションで、「＋ 新規項目追加」ボタンをクリックします。
   - 「フィールド名」欄にフォームフィールドの名前を入力し、「入力値」欄に自動入力したい値を入力します。
   - 必要に応じて、複数の項目を追加できます。

3. **フォームへの自動入力**
   - 自動入力を行いたいウェブページを開きます。
   - 拡張機能の設定画面で「フォームに自動入力」ボタンをクリックします。
   - フォームフィールドに自動的にデータが入力されます。

## 注意事項

- **APIキーの安全な取り扱い**：APIキーは個人情報です。他人と共有しないでください。
- **利用制限**：OpenAI APIには利用制限があります。大量のリクエストを行うと、制限に達する可能性があります。
- **データのプライバシー**：この拡張機能は、入力データとフォームフィールド情報をOpenAI APIに送信します。個人情報の取り扱いにご注意ください。

## 開発者向け情報

### 使用技術

- **言語**：JavaScript、HTML、CSS
- **フレームワーク**：なし（純粋なJavaScript）
- **API**：OpenAI ChatGPT API
- **ブラウザAPI**：Chrome Extensions API (Manifest V3)

### ファイル構成

- `manifest.json`：拡張機能の設定ファイル
- `popup.html`：拡張機能の設定画面のHTML
- `popup.js`：設定画面の動作を制御するスクリプト
- `background.js`：サービスワーカーとして動作し、OpenAI APIとの通信を行います
- `content.js`：ウェブページ上でフォームフィールドを検出し、入力を行います
- `styles.css`：拡張機能のスタイルシート
- `utils/`：補助的なスクリプト（例：`fieldMatcher.js`）

### ローカルでの実行方法

1. **リポジトリのクローンまたはダウンロード**
   ```bash
   git clone https://github.com/Shigeto-Amatake/AutoFieldDetect.git   ```

2. **ブラウザへの読み込み**

   - ブラウザの拡張機能管理画面で「パッケージ化されていない拡張機能を読み込む」を選択し、クローンまたは解凍したフォルダを指定します。

3. **開発用デバッグ**

   - コンソールログは拡張機能のポップアップ内やブラウザのデベロッパーツールで確認できます。

### 貢献方法

- **バグ報告**：Issueを作成して詳細を記入してください。
- **機能追加の提案**：Issueで提案内容を共有してください。
- **プルリクエスト**：新しいブランチを作成し、変更内容をプルリクエストとして提出してください。

---

ご不明な点や問題がありましたら、お気軽にお問い合わせください。 