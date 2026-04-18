import { NextResponse } from "next/server";
import { adminDb, ensureGameState } from "@/lib/firebaseAdmin";
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
  if (
    !participant_id ||
    !question_id ||
    (selected_option !== "A" && selected_option !== "B")
  ) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const db = adminDb();
  const stateRef = await ensureGameState();
  const stateSnap = await stateRef.get();
  const state = stateSnap.data();
  if (!state) {
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
    const qSnap = await db.collection("questions").doc(question_id).get();
    const totalMs = ((qSnap.data()?.timer_seconds ?? 30) as number) * 1000;
    const elapsedMs = Date.now() - new Date(state.question_started_at).getTime();
    if (elapsedMs > totalMs + GRACE_MS) {
      return NextResponse.json(
        { error: "制限時間を過ぎています" },
        { status: 409 }
      );
    }
  }

  // 1人1問1回答：doc id を `${pid}_${qid}` にすることで upsert を実現
  const answerId = `${participant_id}_${question_id}`;
  await db.collection("answers").doc(answerId).set({
    participant_id,
    question_id,
    selected_option,
    is_correct: false, // REVEAL 遷移時にサーバで再計算
    answered_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
