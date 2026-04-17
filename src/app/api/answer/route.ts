import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Option } from "@/types/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    participant_id?: string;
    question_id?: string;
    selected_option?: Option;
  };
  const { participant_id, question_id, selected_option } = body;
  if (!participant_id || !question_id || (selected_option !== "A" && selected_option !== "B")) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // 受付可能フェーズ確認 & 現在の出題と一致するか確認
  const { data: state, error: sErr } = await db
    .from("game_state")
    .select("phase, current_question_id, question_started_at")
    .eq("id", 1)
    .single();
  if (sErr || !state) {
    return NextResponse.json({ error: "ゲーム状態が取得できませんでした" }, { status: 500 });
  }
  if (state.phase !== "QUESTION") {
    return NextResponse.json(
      { error: "現在は回答を受け付けておりません" },
      { status: 409 }
    );
  }
  if (state.current_question_id !== question_id) {
    return NextResponse.json(
      { error: "出題中の問題ではありません" },
      { status: 409 }
    );
  }

  // 制限時間チェック（わずかに猶予を持たせる）
  const GRACE_MS = 1000;
  if (state.question_started_at) {
    const { data: q } = await db
      .from("questions")
      .select("timer_seconds")
      .eq("id", question_id)
      .single();
    const totalMs = ((q?.timer_seconds ?? 30) as number) * 1000;
    const elapsedMs = Date.now() - new Date(state.question_started_at).getTime();
    if (elapsedMs > totalMs + GRACE_MS) {
      return NextResponse.json(
        { error: "制限時間を過ぎています" },
        { status: 409 }
      );
    }
  }

  // 正解情報は REVEAL で再計算されるため、ここでは is_correct=false で保存。
  // 同じ参加者が同じ問題に再答できるよう upsert。
  const { error } = await db
    .from("answers")
    .upsert(
      {
        participant_id,
        question_id,
        selected_option,
        is_correct: false,
      },
      { onConflict: "participant_id,question_id" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
