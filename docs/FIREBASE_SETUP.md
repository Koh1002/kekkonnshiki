# Firebase セットアップ手順書

このアプリは Firebase の **Firestore**（データベース＆リアルタイム配信）を使います。作業は **10〜15分** ほどで完了します。

> 料金：**Spark プラン（無料）** で十分です。クレジットカード登録も不要。

---

## 0. 事前準備

- Google アカウント（Firebase のログインに使います）

---

## 1. プロジェクト作成

1. <https://console.firebase.google.com> にアクセスし、Googleでログイン
2. **"プロジェクトを作成"** をクリック
3. プロジェクト名（例：`kekkonnshiki`）を入力して続行
4. **Google アナリティクス**：今回は不要なので **無効** でOK
5. **"プロジェクトを作成"** 完了まで1〜2分待ちます

---

## 2. Firestore の有効化

1. 左サイドバー **"ビルド → Firestore Database"** を開く
2. **"データベースを作成"** をクリック
3. セキュリティルール：**本番環境モード** を選択（どちらでも書き換えるのでOK）
4. ロケーション：**"asia-northeast1"（東京）** を選択。**一度選ぶと変更不可**なので注意
5. **"有効にする"** をクリック

---

## 3. Web アプリの登録（クライアント用キー取得）

1. 左上の歯車アイコン → **"プロジェクトの設定"**
2. 「マイアプリ」セクションで **Webマーク `</>`** をクリック
3. アプリのニックネーム（例：`kekkonnshiki-web`）を入力 → **"アプリを登録"**
4. 表示される `firebaseConfig` から以下をメモ：

| 取得値 | 環境変数名 |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

> `storageBucket` や `messagingSenderId` は本アプリでは使いません。

---

## 4. サービスアカウント JSON（サーバー専用キー）の取得

1. **"プロジェクトの設定 → サービス アカウント"** タブを開く
2. 下部の **"新しい秘密鍵を生成"** → **"キーを生成"**
3. `xxxxx-firebase-adminsdk-xxxxx.json` がダウンロードされる
4. このファイルの中身を `FIREBASE_SERVICE_ACCOUNT_KEY` として Vercel に貼り付けます

### 一番簡単な方法（推奨）

ダウンロードした JSON ファイルを **メモ帳（Notepad）/ TextEdit / VS Code** などで開き、`Ctrl+A` で全選択 → `Ctrl+C` でコピー → Vercel の環境変数欄に **改行ごとそのまま貼り付け** で OK です。

サーバー側の実装は改行入り JSON も正しく解釈します（`private_key` 内部の `\n` も自動復元）。

### 1行化したい場合（任意）

#### Mac / Linux
```bash
cat ~/Downloads/xxxxx-firebase-adminsdk-xxxxx.json | tr -d '\n'
```

#### Windows PowerShell（バージョン3以降）
```powershell
(Get-Content "$HOME\Downloads\xxxxx-firebase-adminsdk-xxxxx.json" -Raw) -replace "`r`n",""
```

#### Windows PowerShell（古いバージョン／`-Raw` が使えない場合）
```powershell
[System.IO.File]::ReadAllText("$HOME\Downloads\xxxxx-firebase-adminsdk-xxxxx.json") -replace "`r`n",""
```
※ パスは絶対パスでもOK。ファイル名と日本語ユーザー名を含むパスでも動きます。

#### コマンドを使いたくない場合
<https://jsonformatter.org/json-minify> に JSON を貼り付け → **Minify** ボタンで1行化。

> ⚠️ **このJSONは絶対に GitHub にコミットしないでください**。漏洩すると Firestore を第三者に読み書きされます。

---

## 5. セキュリティルールの反映

1. Firestore コンソールの **"ルール"** タブを開く
2. エディタの内容をすべて削除
3. リポジトリの [`firebase/firestore.rules`](../firebase/firestore.rules) の中身をコピー＆ペースト
4. **"公開"** をクリック

### このルールの意味
- `gameState` / `participants` / `answers`：誰でも **読み取り可**（Realtime 購読に必要）
- `questions`：読み書き不可（正解データを守るため／APIのAdmin SDK経由でのみアクセス）
- **書き込みはすべて禁止**：すべての変更は Next.js の API Routes（Admin SDK）を経由するため安全

---

## 6. 仮問題の投入（任意）

デプロイ後、`/admin/console` にログインすると「**仮問題5問を一括投入**」ボタンが表示されます。クリックすれば初期の仮問題が入ります。

自作する場合は「＋ 新しい問題を追加」フォームから追加してください。

---

## 7. 動作確認（コンソール画面）

Firestore コンソールの **"データ"** タブで以下のコレクションが自動生成されていることを確認：
- `gameState`（doc: `current`、`phase: "LOBBY"`）
- `questions`（仮問題を投入した場合のみ）
- `participants`（まだ空）
- `answers`（まだ空）

> `gameState/current` はアプリから最初にアクセスがあった時点で自動的に初期化されます。手動作成は不要。

---

## 8. 画像を使う場合（Firebase Storage）

### 8-a. Storage バケットを作成
1. 左サイドバー **"ビルド → Storage"** → **"始める"**
2. セキュリティルール：**本番環境モード** → **"次へ"**
3. ロケーション：Firestore と同じ **`asia-northeast1`** を選択

### 8-b. 画像のアップロードと公開
1. Storage コンソールの **"ファイル"** タブを開く
2. **"ファイルをアップロード"** で画像を選択
3. アップロード後、ファイルをクリックして右側のパネルから **"アクセストークン" と一緒の URL** をコピー
    - 形式: `https://firebasestorage.googleapis.com/v0/b/xxxxx.appspot.com/o/xxx.jpg?alt=media&token=xxxx`

### 8-c. 問題に貼る
管理コンソールの「新しい問題を追加」フォームで `Ａの画像URL` / `Ｂの画像URL` にそのURLを貼り付け。

### 8-d. Storage セキュリティルール（必要なら）
デフォルトでは本番モードだと他人に読まれないので、画像を参加者にも見せるには：
1. Storage コンソール → **"ルール"**
2. 以下に置き換えて公開：
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;   // 全員が読める（画像配信のため）
      allow write: if false; // 書き込みはコンソールからのみ
    }
  }
}
```

---

## 9. ハマりどころ集

| 症状 | 対処 |
|---|---|
| 参加者追加後、/screen に反映されない | Firestore ルールを公開し直す、または `/gameState/current` の存在を確認 |
| `/admin/console` で「認証必要」エラー | Vercel に `ADMIN_PASSWORD` と `ADMIN_COOKIE_SECRET` が設定されているか確認 |
| 回答送信で 500 | `FIREBASE_SERVICE_ACCOUNT_KEY` の JSON が壊れていないか（1行化の失敗や改行混入に注意） |
| Vercel で `FIREBASE_SERVICE_ACCOUNT_KEY が有効な JSON ではありません` | JSON ファイルの改行がうまく潰せていない。上記 "1行化の方法" を再実行 |
| 画像が 403 で表示されない | Storage のセキュリティルールが本番モードのまま。上記 8-d を適用 |

---

## 10. リセット方法

本番前にテストプレイして、すべてクリーンにしたい場合：

- 管理コンソールの「ゲームをリセット」ボタン（参加者・回答が全消去）
- または Firestore コンソールで `participants` と `answers` の各ドキュメントを手動削除

---

次は [`VERCEL_SETUP.md`](./VERCEL_SETUP.md) で Vercel デプロイに進みます。
