import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb, ensureGameState } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_QUESTIONS = [
  {
    order_index: 1,
    is_active: true,
    title: "第一問：高級和牛はどちらでしょう？",
    description: "肉質等級 A5 の称号を持つのはどちらか、その目をご覧あれ。",
    option_a_label: "Ａ：霜降り豊かな一皿",
    option_b_label: "Ｂ：赤身映える一皿",
    correct_option: "A",
    commentary: "正解はＡ。細やかな霜降りこそA5和牛の証であります。",
    timer_seconds: 30,
  },
  {
    order_index: 2,
    is_active: true,
    title: "第二問：本物の白トリュフはどちら？",
    description: "イタリア・アルバ産の至宝か、似て非なる夏の実りか。",
    option_a_label: "Ａ：凹凸ごつごつとしたもの",
    option_b_label: "Ｂ：表面なめらかなもの",
    correct_option: "A",
    commentary: "白トリュフは不揃いな凹凸が特徴。Ｂは夏トリュフの姿。",
    timer_seconds: 30,
  },
  {
    order_index: 3,
    is_active: true,
    title: "第三問：新郎が幼き日に抱いた夢はどちら？",
    description: "若き日の肖像より、真実の夢を見抜きたまえ。",
    option_a_label: "Ａ：宇宙飛行士",
    option_b_label: "Ｂ：ケーキ屋さん",
    correct_option: "B",
    commentary: "正解はＢ。甘味への愛は幼き日より続いているのです。",
    timer_seconds: 30,
  },
  {
    order_index: 4,
    is_active: false,
    title: "第四問：新婦がこよなく愛する花はどちら？",
    description: "花言葉に込められた想いを読み解かれよ。",
    option_a_label: "Ａ：薔薇",
    option_b_label: "Ｂ：すずらん",
    correct_option: "B",
    commentary: "正解はＢ。すずらんの花言葉は「再び訪れる幸福」。",
    timer_seconds: 30,
  },
  {
    order_index: 5,
    is_active: false,
    title: "第五問：二人が初めて出会った地はどちら？",
    description: "運命の邂逅、その場所はいずこ。",
    option_a_label: "Ａ：大学のサークル",
    option_b_label: "Ｂ：職場の研修",
    correct_option: "A",
    commentary: "正解はＡ。学生時代の出会いから今に至ります。",
    timer_seconds: 30,
  },
];

// 既存の questions が 0 件の時のみ仮問題を投入する安全な seed。
export async function POST() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "認証必要" }, { status: 401 });
  }
  const db = adminDb();
  await ensureGameState();
  const existing = await db.collection("questions").limit(1).get();
  if (!existing.empty) {
    return NextResponse.json(
      { error: "既に問題が存在します。削除してから実行してください。" },
      { status: 409 }
    );
  }
  const batch = db.batch();
  const now = new Date().toISOString();
  for (const q of SAMPLE_QUESTIONS) {
    const ref = db.collection("questions").doc();
    batch.set(ref, {
      ...q,
      option_a_image: null,
      option_b_image: null,
      created_at: now,
    });
  }
  await batch.commit();
  return NextResponse.json({ ok: true, inserted: SAMPLE_QUESTIONS.length });
}
