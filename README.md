# 宮廷 格付け会 🏰

結婚式余興用の **A/B 二択 格付けゲーム** アプリ。中世写本風UIで、司会者（管理者）が進行を完全同期制御。

> **技術スタック**：Next.js 14 (App Router) + TypeScript + Tailwind / Supabase (Postgres + Realtime + Storage) / Vercel

---

## 📖 ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) | データベース構築の手順（15〜20分） |
| [docs/VERCEL_SETUP.md](./docs/VERCEL_SETUP.md) | 本番公開＆環境変数設定の手順（10〜15分） |
| 本 README | 全体像・機能・ローカル開発向け情報 |

---

## 🎭 機能

### ロール分岐（3つの画面）

**同じランディング `/` から入ってもらい、名前欄に何を入れるかで自動で画面が分岐** します。参加者にとっては最初のルール説明ページから始まります。

| 役割 | 入れる名前 | 遷移先 |
|---|---|---|
| ① 新郎新婦・司会 | `ADMIN_ACCOUNT_NAME` に設定した値 | `/admin` → パスワード入力 → `/admin/console` |
| ② 会場スクリーン | `SCREEN_ACCOUNT_NAME` に設定した値 | `/screen` |
| ③ 参加者 | 上記以外の自由な名前 | `/play` |

`ADMIN_ACCOUNT_NAME` / `SCREEN_ACCOUNT_NAME` は参加者が偶然当てない十分にランダムで長い文字列を環境変数に設定。

### 参加者（③）
- **QRコード参加**：会場スクリーンに表示されるQRを読み取り → **ルール説明** → 名前のみ入力して参加
- 個人情報（メール、電話番号等）は一切収集しない
- 問題ごとにA/Bの2択を大きなボタンでタップ。押し間違えても回答締切までは変更可
- 画面にタイマー表示、制限時間切れで自動締切
- 自分の現在の「格」に応じて画面テーマ（色・額縁）が変化
- 次のフェーズへは司会者がボタンを押すまで進まない
- 最終結果画面で **「結果を画像で保存」** ボタンから自分の格付けカードをダウンロード

### 司会者（①）
- 合言葉でログインする `/admin/console`
- 現在のフェーズと次に押すボタンが常に1つだけ大きく表示される
- 参加者の**現在の格・正解数・回答状況がリアルタイムで一覧**
- 問題の追加・削除・有効/無効切替・順序変更、**制限時間（秒）の編集**が画面上で可能
- タイマー切れで自動的に回答を締め切り（手動締切ももちろん可）
- ゲーム全体の「リセット」ボタンもあり

### 会場スクリーン (`/screen`、②)
- プロジェクタ投影用の大画面レイアウト
- LOBBY：**特大QRコード** ＋ 参加者名が入場するアニメーション
- QUESTION：問題文・A/B選択肢・画像を左右対称に表示／回答済み人数カウンタ
- REVEAL：正解の巨大表示＋解説文＋A/B投票比率バー
- RANK_UPDATE：5段の格ピラミッドに全参加者が配置されるアニメ
- FINAL：**王族** が中央で豪奢に表彰（同列なら正解数でタイブレーク）＋ **「最終結果を画像で保存」** ボタン

### 格（5段階）
| Lv | 称号 | テーマ |
|---|---|---|
| 5 | 王族 | 漆黒×金・紫ベルベット |
| 4 | 一流貴族 | 紺×銀 |
| 3 | 二流貴族（開始位置） | 臙脂×銅 |
| 2 | 三流貴族 | 土色×木目 |
| 1 | ご愛敬枠 | 羊皮紙・モノクロ |

- 全員がLv3から開始、正解で+1、不正解で-1、1〜5でクリップ
- 未回答は不正解扱い

### フェーズ遷移（すべて司会者が制御）
```
LOBBY ─[ゲーム開始]→ QUESTION ─[締め切る]→ LOCKED
  ↑                                             │
  │                                             ▼
FINAL ←─[最終結果]─ RANK_UPDATE ←[格変動]─ REVEAL
         （最終問題時のみ）     │
                              └─[次の問題]→ QUESTION
```

---

## 🚀 セットアップ（本番運用）

所要時間：**約30分**。

1. **Supabase を用意する** → [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)
2. **Vercel にデプロイする** → [docs/VERCEL_SETUP.md](./docs/VERCEL_SETUP.md)
3. **当日までにテストプレイ**（参加テスト＆リセット）

各ドキュメントに画面操作レベルで手順が書いてあります。IT初心者でも順番に進めれば完走できるよう意識しました。

---

## 💻 ローカル開発

```bash
git clone <このリポジトリ>
cd kekkonnshiki
cp .env.example .env.local
# .env.local を Supabase の値で埋める
npm install
npm run dev
# → http://localhost:3000
```

必要な環境変数は [`.env.example`](./.env.example) 参照。

```bash
# 管理者Cookie用シークレットの生成（ローカルでも必須）
openssl rand -hex 32
```

---

## 🎯 当日の使い方（超要約）

1. ノートPC①を会場プロジェクタに接続し `/screen` を全画面表示
2. ノートPC② or スマホで `/admin` にログインし `/admin/console` を開きっぱなし
3. 参加者はスクリーンのQRを読み取り、名前を入れるだけで参加
4. 司会者はコンソールの**大きなボタンを上から順に押していくだけ**
5. 最後に「最終結果を発表」→ 王族が豪華に表彰 → 「ゲームをリセット」で終了

→ 詳しい当日の操作は [docs/VERCEL_SETUP.md §9](./docs/VERCEL_SETUP.md) のチートシート参照。

---

## 📷 画像の使い方

問題の選択肢に写真を使う場合：

1. [Supabase Storage](./docs/SUPABASE_SETUP.md#6-画像を使う場合storage設定) に画像をアップロード
2. 公開URLをコピー
3. 管理コンソールの「新しい問題を追加」or Table Editor で `option_a_image` / `option_b_image` にそのURLを貼り付け

---

## 🎨 格アイコンの差し替え

`public/ranks/1.svg` 〜 `5.svg` が既定の中世写本風アイコン。AI 画像生成（ChatGPT / Midjourney / Stable Diffusion 等）で **512×512 PNG** を作って同名で上書きすると、コード変更なしで差し替え可能。

推奨プロンプト（英語）：
- **Lv5 王族**: "Illuminated manuscript king card, crown with laurel, gold leaf, deep purple, medieval heraldry, square 1:1"
- **Lv4 一流貴族**: "Queen tiara with rose, silver and navy, medieval manuscript painting"
- **Lv3 二流貴族**: "Knight helm and sword, crimson shield, bronze, heraldic style"
- **Lv2 三流貴族**: "Wheat sheaf heraldry, parchment, muted earth tones"
- **Lv1 ご愛敬枠**: "Simple quill pen on worn parchment, humble monochrome"

---

## 🧱 アーキテクチャ概要

```
[参加者スマホ] ───QR───> /join → /play (Realtime購読)
                                    │
[会場プロジェクタ] ─────────────> /screen (Realtime購読)
                                    │
[司会者PC]    ───合言葉──> /admin → /admin/console ─API─> Supabase
                                                          │
                                                          ▼
                                              [Postgres + Realtime + Storage]
```

- 書き込みはすべて Next.js API Routes（`service_role`）経由
- クライアントからは `anon key` で読み取りのみ＆Realtime購読
- `questions.correct_option` はクライアントに直接公開せず、`/api/game/current-question` がフェーズに応じて除外/付与
- `answers.is_correct` は LOCKED→REVEAL 遷移時にサーバで計算するため、Realtime経由でも正解が漏れない
- 管理者認証は HMAC 署名付き Cookie（12時間有効）

---

## 📁 ディレクトリ

```
src/
  app/
    page.tsx                   ランディング
    join/page.tsx              参加者：名前入力
    play/page.tsx              参加者：プレイ画面（フェーズ切替）
    screen/page.tsx            会場プロジェクタ用
    admin/page.tsx             管理者ログイン
    admin/console/             管理コンソール
    api/
      join/                    参加登録
      answer/                  回答送信
      admin/login/             合言葉ログイン
      admin/phase/             フェーズ進行
      admin/question/          問題CRUD
      game/current-question/   フェーズ別の出題データ取得
  components/{ParchmentFrame,RankIcon}.tsx
  lib/{supabase,supabaseAdmin,ranks,phases,auth}.ts
  types/game.ts
public/ranks/{1..5}.svg
supabase/
  migrations/001_init.sql
  seed.sql
docs/
  SUPABASE_SETUP.md
  VERCEL_SETUP.md
```

---

## 💰 費用

Vercel Hobby + Supabase Free = **無料** で運用可能（結婚式一回分なら余裕の範囲内）。

---

## ⚠️ 運用上の注意

- `SUPABASE_SERVICE_ROLE_KEY` は**絶対に公開しない**（GitHubにも絶対にコミットしない）
- 本番運用前に必ずリハーサルする。参加者数分のスマホで負荷テストも推奨
- 会場 Wi-Fi の回線品質次第でRealtime遅延が出る。有線LANの司会者PCを基準にする
- 当日は `/admin/console` と `/screen` のタブを開きっぱなしにしておく

---

## 📝 ライセンス

Private / 結婚式余興用
