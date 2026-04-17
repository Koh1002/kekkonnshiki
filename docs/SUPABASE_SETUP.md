# Supabase セットアップ手順書

このアプリは Supabase を「データベース」「リアルタイム配信」「画像置き場」の3役で使います。作業は **15〜20分** ほどで完了します。

> 料金：無料プラン（Free tier）で十分動きます。

---

## 0. 事前準備

- GitHub / Google いずれかのアカウント（Supabase のログインに使います）
- クレジットカードは不要

---

## 1. プロジェクト作成

1. <https://supabase.com> にアクセスし、右上 **"Start your project"** をクリック
2. GitHub / Google でサインイン
3. 初回のみ「Organization（組織）」の作成を求められるので、適当な名前（例：`wedding`）で作成
4. **"New project"** をクリックして以下を入力：

| 項目 | 入力例 | 備考 |
|------|--------|------|
| Name | `kekkonnshiki` | 何でもOK |
| Database Password | 強いランダム文字列 | **控えておくこと**（後で必要になる場合あり） |
| Region | `Northeast Asia (Tokyo)` | 日本から近い所 |
| Pricing Plan | `Free` | Freeで十分 |

5. **"Create new project"** を押下。プロビジョニングに2〜3分かかります。

---

## 2. API キーの取得

プロジェクト画面の左サイドバー下部 **⚙ Project Settings → API** を開くと、3つの値が表示されます。**コピーしてメモ帳などに貼り付けておいてください**。あとで Vercel に登録します。

| 表示名 | 用途 | 環境変数名 |
|---|---|---|
| **Project URL** | 公開してよいエンドポイント | `NEXT_PUBLIC_SUPABASE_URL` |
| **Project API Keys → anon public** | 参加者端末用の読み取り鍵 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Project API Keys → service_role** | サーバー専用の書き込み鍵 | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **`service_role` は絶対に GitHub や他人に見せないでください。** クライアント側（ブラウザ）では使われません。Vercel の環境変数欄にだけ入れます。

---

## 3. スキーマ（テーブル）の作成

左サイドバー **SQL Editor → "+ New query"** を開きます。

### 3-a. 初回スキーマ
1. リポジトリの [`supabase/migrations/001_init.sql`](../supabase/migrations/001_init.sql) をすべてコピーしてエディタに貼り付け
2. 右下 **"Run"** をクリック
3. 画面下部に `Success. No rows returned` と出れば成功

この SQL で作られるもの：
- `questions` / `participants` / `answers` / `game_state` 4テーブル
- RLS（行レベルセキュリティ）ポリシー
- Realtime 購読対象テーブルの登録

### 3-b. タイマーカラム追加（必須）
続けて **"+ New query"** で新しいタブを開き、[`supabase/migrations/002_timer_and_roles.sql`](../supabase/migrations/002_timer_and_roles.sql) を貼り付けて **"Run"**。

- `questions.timer_seconds`（デフォルト30秒）
- `game_state.question_started_at`（出題開始時刻）

が追加されます。

---

## 4. 仮問題の投入（シード）

同じ SQL Editor で **"+ New query"** を押して新しいタブを開きます。

1. [`supabase/seed.sql`](../supabase/seed.sql) の中身をコピー＆貼り付け
2. **"Run"** を実行
3. 5問のサンプルが挿入されます（うち3問が有効、2問が無効）

当日までに本番の問題に差し替えましょう（後述）。

---

## 5. 動作確認

### 5-a. テーブルが揃っているか
左サイドバー **Table Editor** を開き、次の4つが表示されれば OK：
- `questions`（5 行）
- `participants`（0 行）
- `answers`（0 行）
- `game_state`（1 行、phase = `LOBBY`）

### 5-b. Realtime が有効か
**Database → Replication** を開き、`supabase_realtime` という publication に
`game_state` / `participants` / `answers` の3つが含まれていれば OK。
（001_init.sql で自動登録済み）

---

## 6. 画像を使う場合（Storage 設定）

### 6-a. バケット作成

1. 左サイドバー **Storage → "New bucket"**
2. 名前：`questions`
3. **"Public bucket"** に **✔ チェック**（QRから見る参加者にも画像が見える必要があるため）
4. Create

### 6-b. 画像アップロード
1. `questions` バケットを開く
2. **Upload file** でJPG/PNGをアップロード
3. アップロード後、ファイル名をクリック → **Copy URL** で公開URLをコピー
    - 形式は `https://xxxx.supabase.co/storage/v1/object/public/questions/xxx.jpg`

### 6-c. 問題に貼る
管理コンソール（`/admin/console`）の「新しい問題を追加」or Table Editor で `questions.option_a_image` / `option_b_image` にそのURLを貼り付け。

---

## 7. 問題の差し替え

当日までに本番の問題を入れる方法は2通り：

### A. 管理コンソール経由（推奨）
`/admin/console` の「＋ 新しい問題を追加」フォームから追加できます。追加後は「有効」にチェックを入れて出題対象にし、▲▼で順序を入れ替え。

### B. SQL で一気に
仮問題を消して本番を入れたい場合：

```sql
-- 既存の仮問題を全削除（回答も一緒に消えます）
truncate table public.answers restart identity cascade;
delete from public.questions;

-- 本番問題を一気に投入
insert into public.questions
  (order_index, is_active, title, description,
   option_a_label, option_a_image,
   option_b_label, option_b_image,
   correct_option, commentary)
values
  (1, true, '第一問：...', NULL,
   'Ａ：...', 'https://....jpg',
   'Ｂ：...', 'https://....jpg',
   'A', '解説文...'),
  (2, true, '第二問：...', NULL,
   'Ａ：...', NULL,
   'Ｂ：...', NULL,
   'B', '解説文...');
```

---

## 8. ハマりどころ集

| 症状 | 対処 |
|---|---|
| 参加者が増えてもスクリーンに反映されない | **Database → Replication** で publication にテーブルが入っているか確認 |
| `/admin/console` で「認証必要」エラー | Vercel に `ADMIN_PASSWORD` と `ADMIN_COOKIE_SECRET` が設定されているか確認 |
| 回答送信で 500 | `SUPABASE_SERVICE_ROLE_KEY` の値が正しいか確認（末尾の改行に注意） |
| 001_init.sql で `publication` エラー | 既に一度実行済みなら無視してOK（2回目以降に出ることがある） |

---

## 9. リセット方法

**本番前にテストプレイして、すべてクリーンにしたい場合：**

管理コンソールの「ゲームをリセット」ボタン、または SQL Editor で：

```sql
truncate table public.answers restart identity;
truncate table public.participants restart identity cascade;
update public.game_state set
  phase = 'LOBBY',
  current_question_id = null,
  revealed_correct_option = null,
  revealed_commentary = null
where id = 1;
```

---

次は [`VERCEL_SETUP.md`](./VERCEL_SETUP.md) で Vercel デプロイに進みます。
