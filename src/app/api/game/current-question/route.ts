import { NextResponse } from "next/server";
import { adminDb, getGameState } from "@/lib/firebaseAdmin";
import type { PublicQuestion } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 現在の出題データを返す。REVEAL / RANK_UPDATE / FINAL では正解・解説も含める。
// 全参加者がフェーズ変化のたびに呼ぶホットパス。gameState は1回だけ読む。
export async function GET() {
  const db = adminDb();
  const { data: state } = await getGameState();
  if (!state) {
    return NextResponse.json({ error: "ゲーム状態取得失敗" }, { status: 500 });
  }
  if (!state.current_question_id) {
    return NextResponse.json({ question: null });
  }

  const qSnap = await db.collection("questions").doc(state.current_question_id).get();
  const q = qSnap.data();
  if (!qSnap.exists || !q) {
    return NextResponse.json({ question: null });
  }

  const revealVisible = ["REVEAL", "RANK_UPDATE", "FINAL"].includes(state.phase);
  const publicQ: PublicQuestion = {
    id: qSnap.id,
    order_index: q.order_index,
    title: q.title,
    description: q.description ?? null,
    option_a_label: q.option_a_label,
    option_a_image: q.option_a_image ?? null,
    option_b_label: q.option_b_label,
    option_b_image: q.option_b_image ?? null,
    timer_seconds: q.timer_seconds ?? 30,
  };
  if (revealVisible) {
    publicQ.correct_option = q.correct_option as "A" | "B";
    publicQ.commentary = q.commentary ?? null;
  }
  return NextResponse.json({ question: publicQ });
}
