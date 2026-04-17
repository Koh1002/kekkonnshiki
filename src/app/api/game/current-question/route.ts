import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PublicQuestion } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 現在の出題データを返す。REVEAL / RANK_UPDATE / FINAL では正解・解説も含める。
export async function GET() {
  const db = supabaseAdmin();
  const { data: state, error: sErr } = await db
    .from("game_state")
    .select("phase, current_question_id, revealed_correct_option, revealed_commentary")
    .eq("id", 1)
    .single();
  if (sErr || !state) {
    return NextResponse.json({ error: "ゲーム状態取得失敗" }, { status: 500 });
  }
  if (!state.current_question_id) {
    return NextResponse.json({ question: null });
  }

  const { data: q, error } = await db
    .from("questions")
    .select(
      "id, order_index, title, description, option_a_label, option_a_image, option_b_label, option_b_image, correct_option, commentary"
    )
    .eq("id", state.current_question_id)
    .single();
  if (error || !q) {
    return NextResponse.json({ question: null });
  }

  const revealVisible = ["REVEAL", "RANK_UPDATE", "FINAL"].includes(state.phase);
  const publicQ: PublicQuestion = {
    id: q.id,
    order_index: q.order_index,
    title: q.title,
    description: q.description,
    option_a_label: q.option_a_label,
    option_a_image: q.option_a_image,
    option_b_label: q.option_b_label,
    option_b_image: q.option_b_image,
  };
  if (revealVisible) {
    publicQ.correct_option = q.correct_option as "A" | "B";
    publicQ.commentary = q.commentary;
  }
  return NextResponse.json({ question: publicQ });
}
