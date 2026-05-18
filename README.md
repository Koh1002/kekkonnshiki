# 一般人 格付けチェック 🎬

結婚式余興用の **A/B 二択 格付けゲーム** アプリ。テレビ番組「芸能人格付けチェック」風の **赤×金** UI で、司会者が進行を完全同期制御。

> **技術スタック**：Next.js 14 (App Router) + TypeScript + Tailwind / Firebase (Firestore + Storage) / Vercel

---

## 📖 ドキュメント

| ドキュメント | 内容 |
|---|---|
| 🎬 [当日ガイド.md](./当日ガイド.md) | **当日 迷わないための立ち上げ手順** |
| 🎤 [司会者マニュアル.md](./司会者マニュアル.md) | **司会者（admin）の1問ごとの進行台本** |
| [docs/FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md) | データベース構築の手順（10〜15分） |
| [docs/VERCEL_SETUP.md](./docs/VERCEL_SETUP.md) | 本番公開＆環境変数設定の手順（10〜15分） |
| [public/questions/README.md](./public/questions/README.md) | 問題画像の配置ルール |
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
- **同名警告**：すでに同じ名前の人がいると注意を表示。名前を変えるか、もう一度押せばそのまま参加（B案）
- 問題ごとに **赤(Ａ)・青(Ｂ)** のキューブをタップ。押し間違えても回答締切までは変更可
- **司会者が「カウントダウン開始」を押すまで回答不可**（チョコ配布など準備のため）。開始前は「司会者の合図をお待ちください」
- 画像つき問題（Q2/Q3 等）は A/B を小さく、**写真を大きく下に表示**
- 画面にタイマー表示、制限時間切れで自動締切
- 自分の現在の「格」に応じて画面テーマ（額縁の色）が変化
- 次のフェーズへは司会者がボタンを押すまで進まない
- 最終結果画面で **「結果を画像で保存」** ボタンから自分の格付けカードをダウンロード

### 司会者（①）
- 合言葉でログインする `/admin/console`
- 現在のフェーズと次に押すボタンが常に1つだけ大きく表示される
- 参加者の **現在の格・正解数・回答状況** がリアルタイムで一覧。各参加者の **×ボタンで個別削除**（テスト参加者の掃除に）
- 問題の追加・削除・有効/無効切替・順序変更、**制限時間（秒）の編集**、**画像URLの編集** が画面上で可能
- **カウントダウンは手動開始**（［カウントダウン開始］）。タイマー切れで自動締切、手動締切も可
- **再募集／時間延長**：締切後でも ［再募集］、回答中は ［時間を延長／やり直し］ でカウントダウンをやり直せる（回答は保持）
- **緊急操作**：「フェーズ手動変更」で任意のフェーズへ強制移行でき、進行が詰まっても必ず復旧できる
- 「**本番5問を一括投入 / 既存削除**」ワンクリックボタンあり（差し替え時は自動で参加受付に戻る）
- ゲーム全体の「リセット」ボタンもあり

### 会場スクリーン (`/screen`、②)
- プロジェクタ投影用の大画面レイアウト（4:3／16:9 両対応）
- `/screen?auth=<SCREEN_ACCOUNT_NAME>` で直接アクセス可（Cookie 24時間有効）
- LOBBY：上段にタイトル、下段は **左に特大QRコード／右に参加者一覧**（増えるごとに追加）
- QUESTION：問題文・A/Bキューブ・画像。司会が「カウントダウン開始」を押すまでは「まもなく開始します…」
- **正解発表は3段階**（司会が1つずつ進める）：
  1. **LOCKED**：A・Bを大きく表示（投票数も正解も伏せる）「さあ、結果やいかに…？」
  2. **COUNT**：A・Bそれぞれの **投票人数** を表示（正解はまだ伏せる）
  3. **REVEAL**：**正解側が金色に輝き、不正解側がグレー**＋正解側の画像＋解説文
- RANK_UPDATE：5段の格序列に全参加者が配置されるアニメ
- FINAL：**「本日の一流」** が中央で豪奢に表彰（同列なら正解数でタイブレーク）＋ **「最終結果を画像で保存」** ボタン

### 格（5段階）
| Lv | 称号 | テーマ |
|---|---|---|
| 5 | 一流（開始位置・全員ここから） | 漆黒×金 |
| 4 | 二流 | 紺×銀 |
| 3 | 普通の人 | 臙脂×銅 |
| 2 | 三流 | 土色×木目 |
| 1 | ご愛敬枠 | 羊皮紙・モノクロ |

- 全員がLv5「一流」から開始。**正解＝変動なし／不正解＝1つ降格（下方向のみ）**。最低Lv1で止まる（昇格はしない）
- 未回答は不正解扱い

### フェーズ遷移（すべて司会者が制御）
```
LOBBY
  │ ［ゲーム開始］
  ▼
QUESTION（問題表示・タイマー停止／回答不可）
  │ ［カウントダウン開始］  ← 司会が準備後に押す
  ▼
QUESTION（回答受付中・タイマー作動）
  │ ［回答を締め切る］（時間切れ自動／［時間延長・再募集］で戻れる）
  ▼
LOCKED（A・B大表示・投票数も正解も伏せる）
  │ ［投票数を表示する］
  ▼
COUNT（A・Bの投票人数を表示・正解は伏せる）
  │ ［正解を発表する］
  ▼
REVEAL（正解側ハイライト／不正解グレー＋画像＋解説）
  │ ［格変動を表示する］
  ▼
RANK_UPDATE（全員の格が上下）
  │ ［次の問題へ］→ QUESTION へ戻る ／ ［最終結果を発表］→
  ▼
FINAL（本日の一流を表彰）
```
※ どのフェーズからでも「緊急操作」で任意フェーズへ強制移行可（詰まり防止）。

---

## 🚀 セットアップ（本番運用）

所要時間：**約25分**。

1. **Firebase を用意する** → [docs/FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md)
2. **Vercel にデプロイする** → [docs/VERCEL_SETUP.md](./docs/VERCEL_SETUP.md)
3. **当日までにテストプレイ**（参加テスト＆リセット）
4. **当日は** [当日ガイド.md](./当日ガイド.md) を見ながら立ち上げ

各ドキュメントに画面操作レベルで手順が書いてあります。IT初心者でも順番に進めれば完走できるよう意識しました。

---

## 💻 ローカル開発

```bash
git clone <このリポジトリ>
cd kekkonnshiki
cp .env.example .env.local
# .env.local を Firebase の値で埋める（FIREBASE_SETUP.md 参照）
npm install
npm run dev
# → http://localhost:3000
```

必要な環境変数は [`.env.example`](./.env.example) 参照。

```bash
# 管理者Cookie用シークレットの生成（ローカルでも必須）
# Mac/Linux:
openssl rand -hex 32
# Windows PowerShell:
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

---

## 🎯 当日の使い方（超要約）

詳細は [当日ガイド.md](./当日ガイド.md)・[司会者マニュアル.md](./司会者マニュアル.md) を必ずご一読ください。要点だけ：

1. ノートPC①を会場プロジェクタに接続し `/screen?auth=<SCREEN_ACCOUNT_NAME>` を全画面表示
2. ノートPC② or スマホで `/admin` にログインし `/admin/console` を開きっぱなし
3. **本番前に1回**：`/admin/console` で「本番5問に差し替え（既存削除）」を実行（最新の問題文・正解・画像・解説が反映され、参加受付に戻る）
4. 参加者はスクリーンのQRを読み取り、名前を入れるだけで参加
5. 司会者はコンソールの **大きなボタンを上から順に押していくだけ**
   - 出題 →（準備したら）**カウントダウン開始** → 締め切る → 投票数 → 正解発表 → 格変動 → 次の問題
6. 最後に「最終結果を発表」→ 「本日の一流」が豪華に表彰 → 「ゲームをリセット」で終了

---

## 📷 画像の使い方

問題の選択肢に写真を使う場合、2通りの方法があります：

### 方式A：リポジトリにコミット（軽量・キャッシュも効く）
1. `public/questions/` に画像ファイルを配置（例：`q2_a.png`）
2. git に commit & push
3. Vercel が自動デプロイ後、ローカルパス `/questions/q2_a.png` で参照可能
4. `/admin/console` の **画像URL欄** にそのパスを貼り付け

### 方式B：Firebase Storage 経由（リポジトリを汚さない）
1. [Firebase Storage](./docs/FIREBASE_SETUP.md#8-画像を使う場合firebase-storage) に画像をアップロード
2. 公開URLをコピー
3. `/admin/console` の **画像URL欄** にそのURLを貼り付け

詳細は [public/questions/README.md](./public/questions/README.md) 参照。

---

## 🎨 格アイコンの差し替え

`public/ranks/1.svg` 〜 `5.svg` が既定の中世風アイコン（赤×金テーマで「一流／二流／普通の人／三流／ご愛敬枠」のラベル付き）。AI 画像生成（ChatGPT / Midjourney / Stable Diffusion 等）で **512×512 PNG** を作って同名（拡張子 `.svg` のままで上書きするか、`src/lib/ranks.ts` の `rankIconPath()` のみ書き換え）で差し替え可能。

推奨プロンプト（英語）：
- **Lv5 一流**: "Gold crown badge with laurel wreath, deep red velvet background, ornate baroque frame, luxurious"
- **Lv4 二流**: "Silver tiara with rose gem, navy red background, elegant frame"
- **Lv3 普通の人**: "Bronze shield emblem, crimson background, simple heraldry"
- **Lv2 三流**: "Earthy wheat and star emblem, dark background, modest"
- **Lv1 ご愛敬枠**: "Cute smiling badge, beige background, friendly mascot, humble"

---

## 🧱 アーキテクチャ概要

```
[参加者スマホ] ───QR───> /join → /play (onSnapshot 購読)
                                    │
[会場プロジェクタ] ─────────────> /screen (onSnapshot 購読)
                                    │
[司会者PC]    ───合言葉──> /admin → /admin/console ─API─> Firebase
                                                          │
                                                          ▼
                                              [Firestore + Storage]
```

- 書き込みはすべて Next.js API Routes（Firebase Admin SDK / service account）経由
- クライアントは Web SDK の `onSnapshot` で読み取りのみ＆リアルタイム反映
- `questions` コレクションはセキュリティルールで **クライアント直読不可**。`/api/game/current-question` がフェーズに応じて正解・解説を除外/付与
- `answers.is_correct` は LOCKED→REVEAL 遷移時にサーバで計算するため、リアルタイム経由でも正解が漏れない
- 管理者認証は HMAC 署名付き Cookie（12時間有効）

---

## 📁 ディレクトリ

```
src/
  app/
    page.tsx                   ランディング（ルール説明）
    join/page.tsx              名前入力（ロール分岐の起点）
    play/page.tsx              参加者：プレイ画面（フェーズ切替）
    screen/page.tsx            会場プロジェクタ用（cookie ガード付き）
    screen/ScreenView.tsx      スクリーン本体
    admin/page.tsx             管理者ログイン
    admin/console/             管理コンソール
    api/
      join/                    参加登録（同名警告・force・ロールcookie発行）
      answer/                  回答送信（フェーズ・カウントダウン・タイマー検証）
      screen-auth/             /screen?auth= 用のcookie発行
      admin/login/             合言葉ログイン
      admin/phase/             フェーズ進行（start/startTimer/reopen/lock/
                               tally/reveal/applyRank/next/reset/setPhase）
      admin/question/          問題CRUD（画像URL・制限時間編集）
      admin/participant/       参加者の個別削除
      admin/seed/              本番5問の一括投入（replace で全差し替え）
      game/current-question/   フェーズ別の出題データ取得（正解はREVEAL以降）
  components/{ParchmentFrame,RankIcon,Timer,ScreenshotButton}.tsx
  lib/{firebase,firebaseAdmin,ranks,phases,auth}.ts
  types/game.ts
public/
  ranks/{1..5}.svg             格アイコン（Lv5=一流〜Lv1=ご愛敬枠）
  questions/{q*.png,q*.jpeg}   問題画像（Q2/Q3 etc）
  questions/README.md          画像配置ルール
firebase/
  firestore.rules              セキュリティルール
docs/
  FIREBASE_SETUP.md
  VERCEL_SETUP.md
当日ガイド.md                   当日立ち上げ・進行マニュアル
司会者マニュアル.md             司会者の1問ごとの進行台本・各問解説
```

---

## 💰 費用

Vercel Hobby + Firebase Spark = **無料** で運用可能（結婚式一回分なら余裕の範囲内）。

---

## ⚠️ 運用上の注意

- `FIREBASE_SERVICE_ACCOUNT_KEY`（サービスアカウントJSON）は **絶対に公開しない**（GitHubにも絶対にコミットしない）
- 本番運用前に必ずリハーサルする。参加者数分のスマホで負荷テストも推奨
- 会場 Wi-Fi の回線品質次第でRealtime遅延が出る。有線LANの司会者PCを基準にする
- 当日は `/admin/console` と `/screen` のタブを開きっぱなしにしておく

---

## 📝 ライセンス

Private / 結婚式余興用
