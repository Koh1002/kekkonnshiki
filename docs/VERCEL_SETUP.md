# Vercel デプロイ手順書

Vercel は Next.js の制作元が運営するホスティングサービス。このアプリを **無料** で世界中に公開できます。作業は **10〜15分**。

前提：[Firebase のセットアップ](./FIREBASE_SETUP.md) が完了し、Web 用の設定値とサービスアカウント JSON を取得済みであること。

---

## 0. 事前準備

- GitHub アカウント（リポジトリを Vercel に連携させるため）
- このリポジトリが自分の GitHub にあること（fork でもOK）

---

## 1. Vercel アカウント作成

1. <https://vercel.com> にアクセス
2. 右上 **"Sign Up"** → **"Continue with GitHub"** を選択
3. GitHub との連携を許可

---

## 2. プロジェクトのインポート

1. ダッシュボード右上 **"Add New..." → "Project"**
2. GitHub リポジトリ一覧から `kekkonnshiki` を選択し **"Import"**
3. 次の画面では以下のみ確認、他はデフォルトで OK：

| 項目 | 値 |
|---|---|
| Framework Preset | `Next.js`（自動検出） |
| Root Directory | `./`（変更しない） |
| Build Command | `next build`（空欄のままで自動） |
| Output Directory | `.next`（自動） |

---

## 3. 環境変数の設定 ⭐最重要⭐

同じ画面の **"Environment Variables"** セクションを開き、以下9つをすべて登録します。

| Name | Value | 取得元 |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase `firebaseConfig.apiKey` | FIREBASE_SETUP §3 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase `firebaseConfig.authDomain` | 同上 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase `firebaseConfig.projectId` | 同上 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase `firebaseConfig.appId` | 同上 |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | サービスアカウント JSON を **1行化** したもの | FIREBASE_SETUP §4 |
| `ADMIN_PASSWORD` | 自分で決める管理者パスワード | 任意（例 `wedding-0925-secret`） |
| `ADMIN_COOKIE_SECRET` | 32文字以上のランダム文字列 | 下記コマンドで生成 |
| `ADMIN_ACCOUNT_NAME` | 司会用アカウント名（たまたま当たらない名前） | 任意（例 `master-9gkq3z-wedding`） |
| `SCREEN_ACCOUNT_NAME` | 会場スクリーン用アカウント名 | 任意（例 `screen-7hf2p1-wedding`） |

> 💡 `FIREBASE_SERVICE_ACCOUNT_KEY` は長い JSON ですが、Vercel の Value 欄にそのまま1行で貼り付けて問題ありません。改行が入らないよう注意。

### ロール分岐について

**同じ `/join` フォーム** にアカウント名を入れることで画面が分岐します：

- `ADMIN_ACCOUNT_NAME` と一致 → `/admin`（パスワード入力画面）へ誘導
- `SCREEN_ACCOUNT_NAME` と一致 → `/screen`（会場プロジェクタ画面）へ誘導
- それ以外 → 通常の参加者として `/play`

推測されにくい長めの文字列を使ってください。参加者が偶然入力しても当たらないよう、英数混在の15文字以上を推奨。

### `ADMIN_COOKIE_SECRET` の作り方

ターミナルで：
```bash
openssl rand -hex 32
# 例: 3f9c2e1a77b8c4f5e6d7a8b9c0d1e2f3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9
```

または <https://1password.com/jp/password-generator/> で長めのパスワードを作って貼り付けでもOK。

### `NEXT_PUBLIC_APP_URL` は後回し

あと1つ必要ですが、この時点ではまだ本番URLが確定していないので**後で**設定します。

> ⚠️ **環境変数の Environment は `Production / Preview / Development` すべてにチェック** を入れること（デフォルト）。

---

## 4. 初回デプロイ

1. 画面下部 **"Deploy"** ボタンを押す
2. 1〜3分ビルドが走ります
3. 🎉 **"Congratulations!"** が出たらデプロイ成功
4. 発行されたURL（例：`https://kekkonnshiki-xxxx.vercel.app`）を**コピー**

---

## 5. `NEXT_PUBLIC_APP_URL` の登録と再デプロイ

1. プロジェクトの **Settings → Environment Variables** を開く
2. **Add New**：
   - Name: `NEXT_PUBLIC_APP_URL`
   - Value: 先ほどコピーしたURL（末尾のスラッシュなし）
     - 例：`https://kekkonnshiki-xxxx.vercel.app`
   - Environment: Production / Preview / Development すべてチェック
3. **Save**
4. 上部タブ **Deployments** → 最新デプロイの **⋯ メニュー → "Redeploy"**
5. 「Use existing Build Cache」のチェックを**外して** Redeploy（環境変数を反映させるため）

---

## 6. 動作確認

### 6-a. 司会者ログイン
1. `https://<あなたのURL>/admin` にアクセス
2. `ADMIN_PASSWORD` に設定した合言葉でログイン
3. `/admin/console` に遷移すれば OK

### 6-b. 会場スクリーン
1. 同じブラウザの**別タブ**で `https://<あなたのURL>/screen` を開く
2. QRコードが表示され、下にURLが出れば OK

### 6-c. 参加登録
1. スマホでQRコードを読み取る
2. 名前を入力して「お席につく」
3. スクリーンのロビーに自分の名前が出ることを確認

### 6-d. ゲーム進行テスト
1. 管理コンソールで「ゲーム開始」
2. スマホで A/B を選択
3. コンソールで「回答を締め切る」→「答えを表示する」→「格変動を表示する」→「次の問題へ」を順に押していく
4. 最後まで行ったら「最終結果を発表」
5. 「ゲームをリセット」で LOBBY に戻る

---

## 7. カスタムドメイン（任意）

もし `wedding.example.com` のような独自ドメインを使いたい場合：

1. **Settings → Domains** を開く
2. 使いたいドメインを入力し、表示される DNS 設定を契約中のドメイン業者（お名前.com 等）に反映
3. 反映後、そのドメインで動くことを確認
4. `NEXT_PUBLIC_APP_URL` をそのドメインに変更し再デプロイ

---

## 8. 本番当日までのチェックリスト

- [ ] `/admin/console` で **「本番5問に差し替え（既存削除）」** を実行し、5問入っている
- [ ] 各問題の **画像URL** を貼り付け（または `public/questions/` に画像をコミット済み）
- [ ] 各問題の **正解（A/B）と解説文** を本番内容に更新
- [ ] `/admin/console` の問題管理で、当日出題する問題のみ「有効」✔
- [ ] `/admin/console` で「ゲームをリセット」してクリーンな状態にしてある
- [ ] 会場のプロジェクタに `/screen` を全画面表示できるノートPCを準備
- [ ] 司会者スマホ/PC で `/admin/console` にログインできる（開きっぱなしに）
- [ ] QRコードが参加者の席から読み取れる距離に投影される
- [ ] Wi-Fi 回線が会場で使える（参加者数分）
- [ ] 予備のバッテリー / 電源タップ / LANケーブル
- [ ] 当日朝に [`当日ガイド.md`](../当日ガイド.md) をもう一度確認

---

## 9. 当日の進行手順（司会者向けチートシート）

### セットアップ（開宴前）
1. 会場ノートPCで `https://<あなたのURL>/` にアクセス → 「参加のお手続きへ」
2. 名前欄に **`SCREEN_ACCOUNT_NAME` の値** を入力 → `/screen` へ自動遷移。フルスクリーン化してプロジェクタに投影
3. 司会者の端末で同じく `/` → 名前欄に **`ADMIN_ACCOUNT_NAME` の値** を入力 → `/admin` へ誘導 → パスワード入力 → `/admin/console`
4. 参加者はプロジェクタのQRコードを読み取って自分の名前で参加

### 進行
> **コンソールの大きなボタンを上から順に押すだけ** です。制限時間が来たら自動で締め切りますが、早めに締め切りたい時は手動でもOK。

| 現在の画面 | 押すボタン |
|---|---|
| LOBBY（参加受付中） | **ゲーム開始（第一問へ）** |
| 問題出題中（タイマー表示） | （制限時間で自動締切、または）**回答を締め切る** |
| 回答締切 | **答えを表示する** |
| 答え表示中（解説読み上げ） | **格変動を表示する** |
| 格変動ピラミッド表示中 | **次の問題へ**（最終問題後は **最終結果を発表**） |
| 最終結果（王族発表） | **ゲームをリセット**（終了） |

**大事なこと**：参加者のスマホは自動では進みません。司会者がボタンを押すまで画面は動かないので、余興の「タメ」を作れます。

---

## 10. トラブル対応

| 症状 | 対処 |
|---|---|
| `/admin` でログインできない | Vercel の `ADMIN_PASSWORD` と `ADMIN_COOKIE_SECRET` を再確認し **Redeploy** |
| スクリーンに参加者が表示されない | Firestore のセキュリティルールが正しく公開されているか確認 |
| QRコードを読んでも `localhost` に飛ぶ | `NEXT_PUBLIC_APP_URL` が本番URLになっているか確認、未反映なら Redeploy |
| 回答したのに反映されない | ブラウザのコンソールを開いて赤いエラーを確認。`FIREBASE_SERVICE_ACCOUNT_KEY` 未設定 or JSON壊れが多い |
| 画像が表示されない | Firebase Storage のセキュリティルールで `allow read: if true` にしているか確認 |

---

## 11. 費用について

- **Vercel Hobby プラン**：無料。100 GB帯域/月まで。結婚式余興では全く問題なし
- **Firebase Spark プラン**：無料。Firestore 1 GB / 50,000 reads・20,000 writes・20,000 deletes 毎日、Storage 5GB。余興では全く問題なし
- 合計：**ゼロ円** で運用可能

---

以上でデプロイ完了です。当日までに必ずテストプレイしておくことをおすすめします。
