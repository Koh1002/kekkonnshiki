# 宮廷 格付け会 🏰

結婚式余興用の **A/B 二択 格付けゲーム** アプリ。中世写本風UIで、司会者（管理者）が進行を完全同期制御。Next.js(App Router) + Supabase(Realtime) + Vercel。

## 主な機能

- 参加者はQRコードから名前だけで参加（メールや電話番号不要）
- 問題は最大5問まで可変。管理画面でON/OFFと並び替え
- フェーズ同期：LOBBY → QUESTION → LOCKED → REVEAL → RANK_UPDATE →（次の問題 or FINAL）
- 参加者画面は自分の格に応じてテーマカラーが変化（5段階）
- 会場スクリーン（`/screen`）でQR表示・問題大写し・リアルタイム投票バー・格ピラミッド・最終王族発表
- 格は 王族 / 一流貴族 / 二流貴族 / 三流貴族 / ご愛敬枠 の5段階
- お年寄り配慮：巨大ボタン、常時「次に何をすればよいか」の案内、先へ進む操作は司会者のみ

## 5分セットアップ

### 1. Supabase
1. 新規プロジェクト作成
2. SQL Editor で `supabase/migrations/001_init.sql` を実行
3. 続いて `supabase/seed.sql` を実行（仮問題が5問入る）
4. Project Settings → API から以下を控える
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`（**絶対に公開しない**）

### 2. ローカル起動
```bash
cp .env.example .env.local
# .env.local を編集して値を入れる
npm install
npm run dev
```

### 3. Vercel デプロイ
1. このリポジトリを Vercel に接続
2. Environment Variables に `.env.example` の項目を登録
3. `NEXT_PUBLIC_APP_URL` には本番URL（例: `https://kekkonnshiki.vercel.app`）を設定

## 当日の使い方

1. 司会者は `/admin` にアクセスし合言葉でログイン → `/admin/console`
2. 別タブで `/screen` を開きプロジェクタに全画面で映す（QRコードが表示される）
3. 参加者はQRコードを読み取り、名前のみ入力して参加
4. コンソールの大ボタンで以下を押していくだけ：
   - 「ゲーム開始」→「回答を締め切る」→「答えを表示する」→「格変動を表示する」→「次の問題へ」…
5. 全問終了後は「最終結果を発表」で王族が発表されます

## 問題の差し替え

- 管理コンソールの「問題管理」で ON/OFF・並び替えが可能
- 問題内容の編集や追加は Supabase Dashboard の Table Editor（`questions` テーブル）から直接、または SQL で
- 写真を使う場合は Supabase Storage に画像をアップロードし、公開URLを `option_a_image` / `option_b_image` に貼り付け

## 格（爵位）アイコンの差し替え

`/public/ranks/1.svg` 〜 `5.svg` が既定の中世写本風SVG。AI画像生成で作った512×512 PNGを用意したら、同名（.svg→.pngでも可）で上書きすればOK。参照は `src/lib/ranks.ts` の `rankIconPath()` 一箇所で集中管理。

推奨プロンプト例：
- Lv5 王族: "illuminated manuscript king, crown with laurel, gold leaf, deep purple"
- Lv4 一流貴族: "queen tiara, silver, rose, navy background, medieval manuscript"
- Lv3 二流貴族: "knight helm and sword, crimson shield, bronze"
- Lv2 三流貴族: "wheat sheaf heraldry, parchment, muted earth tones"
- Lv1 ご愛敬枠: "plain quill pen on parchment, humble monochrome"

## 技術メモ

- 書き込みはすべて Next.js API Routes（service role）を経由。クライアントからは anon key で読み込みのみ
- RLS は `questions` テーブルのみ SELECT不許可（正解の漏洩防止）。`/api/game/current-question` がフェーズに応じて正解・解説を除外/付与
- `answers.is_correct` は LOCKED→REVEAL 遷移時にサーバで計算（回答時点では正解が漏れない）
- フェーズ遷移は `POST /api/admin/phase { action }` で管理者認証Cookieつきのみ実行可

## ディレクトリ

```
src/
  app/
    page.tsx               ランディング
    join/page.tsx          参加者：名前入力
    play/page.tsx          参加者：プレイ画面（フェーズ切替）
    screen/page.tsx        会場プロジェクタ用
    admin/page.tsx         管理者ログイン
    admin/console/…        管理コンソール
    api/
      join/                参加登録
      answer/              回答送信
      admin/login/         合言葉ログイン
      admin/phase/         フェーズ進行
      admin/question/      問題管理
      game/current-question/ フェーズ別の出題データ取得
  lib/{supabase,supabaseAdmin,ranks,phases,auth}.ts
  types/game.ts
public/ranks/{1..5}.svg
supabase/{migrations,seed}.sql
```
