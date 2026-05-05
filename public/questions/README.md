# 問題の画像置き場

Q1〜Q4 の画像をここに置くか、Firebase Storage 等の外部URLを管理コンソールから登録します。

## 期待されるファイル名（seed が参照しているローカルパス）

| 問 | A 側 | B 側 | 備考 |
|---|---|---|---|
| Q1 食べ比べ | `q1_a.png` 等 | `q1_b.png` 等 | 当日決定。シードは画像URL未設定 |
| Q2 たまごっち | `q2_a.png` ✅ | `q2_b.png` | 新郎の手描きキャラ |
| Q3 絵画 | `q3_a_renoir.jpeg` ✅ | `q3_b_grandfather.jpeg` ✅ | A=ルノワール（正解）／B=新婦祖父の絵 |
| Q4 ネックレス | `q4_a.png` 等 | `q4_b.png` 等 | 当日決定 |
| Q5 音楽 | （画像なし） | （画像なし） | 会場の別機材で再生 |

## 配置の仕方（2通り）

### A. リポジトリに直接コミット
1. このディレクトリに上記の名前で画像を置く
2. `git add public/questions/q*.png` → commit → push
3. Vercel が自動デプロイ後、`/questions/q2_a.png` 等で参照される

### B. Firebase Storage を使う
1. Firebase Console → Storage に画像をアップロード
2. ファイルを選び **「アクセストークン付きURLをコピー」**
3. `/admin/console` → 該当問題の **画像URL欄** にペーストするだけ
4. 公開設定が必要な場合は Storage のセキュリティルールを `allow read: if true;` に変更

ローカルパス（`/questions/...`）と Firebase URL のどちらでも `option_a_image` / `option_b_image` に入れればOK。
