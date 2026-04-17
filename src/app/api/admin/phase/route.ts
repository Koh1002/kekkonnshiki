import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clampRank } from "@/lib/ranks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "start" | "lock" | "reveal" | "applyRank" | "next" | "reset";

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const { action } = (await req.json()) as { action?: Action };
  if (!action) {
    return NextResponse.json({ error: "actionが必要です" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // 現状取得
  const { data: state, error: sErr } = await db
    .from("game_state")
    .select("phase, current_question_id")
    .eq("id", 1)
    .single();
  if (sErr || !state) {
    return NextResponse.json({ error: "ゲーム状態取得失敗" }, { status: 500 });
  }

  async function firstActiveQuestion() {
    const { data } = await db
      .from("questions")
      .select("id, order_index")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  }

  async function nextActiveQuestion(currentOrder: number) {
    const { data } = await db
      .from("questions")
      .select("id, order_index")
      .eq("is_active", true)
      .gt("order_index", currentOrder)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  }

  async function currentQuestionOrder(): Promise<number | null> {
    if (!state?.current_question_id) return null;
    const { data } = await db
      .from("questions")
      .select("order_index")
      .eq("id", state.current_question_id)
      .maybeSingle();
    return data?.order_index ?? null;
  }

  switch (action) {
    case "start": {
      if (state.phase !== "LOBBY") {
        return NextResponse.json(
          { error: `LOBBYではありません (現在: ${state.phase})` },
          { status: 409 }
        );
      }
      const first = await firstActiveQuestion();
      if (!first) {
        return NextResponse.json(
          { error: "有効な問題が1問もありません" },
          { status: 409 }
        );
      }
      // 参加者リセット & 回答クリア
      await db
        .from("participants")
        .update({ rank_level: 3, correct_count: 0 })
        .not("id", "is", null);
      await db.from("answers").delete().not("id", "is", null);

      await db
        .from("game_state")
        .update({
          phase: "QUESTION",
          current_question_id: first.id,
          revealed_correct_option: null,
          revealed_commentary: null,
          question_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      return NextResponse.json({ ok: true });
    }

    case "lock": {
      if (state.phase !== "QUESTION") {
        return NextResponse.json(
          { error: `QUESTIONではありません (現在: ${state.phase})` },
          { status: 409 }
        );
      }
      await db
        .from("game_state")
        .update({ phase: "LOCKED", updated_at: new Date().toISOString() })
        .eq("id", 1);
      return NextResponse.json({ ok: true });
    }

    case "reveal": {
      if (state.phase !== "LOCKED") {
        return NextResponse.json(
          { error: `LOCKEDではありません (現在: ${state.phase})` },
          { status: 409 }
        );
      }
      if (!state.current_question_id) {
        return NextResponse.json(
          { error: "出題中の問題がありません" },
          { status: 409 }
        );
      }
      const { data: q } = await db
        .from("questions")
        .select("correct_option, commentary")
        .eq("id", state.current_question_id)
        .single();
      if (!q) {
        return NextResponse.json({ error: "問題が見つかりません" }, { status: 500 });
      }
      // 回答の is_correct を計算
      const { data: ans } = await db
        .from("answers")
        .select("id, selected_option")
        .eq("question_id", state.current_question_id);
      if (ans && ans.length > 0) {
        const updates = ans.map((a) =>
          db
            .from("answers")
            .update({ is_correct: a.selected_option === q.correct_option })
            .eq("id", a.id)
        );
        await Promise.all(updates);
      }
      await db
        .from("game_state")
        .update({
          phase: "REVEAL",
          revealed_correct_option: q.correct_option,
          revealed_commentary: q.commentary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      return NextResponse.json({ ok: true });
    }

    case "applyRank": {
      if (state.phase !== "REVEAL") {
        return NextResponse.json(
          { error: `REVEALではありません (現在: ${state.phase})` },
          { status: 409 }
        );
      }
      if (!state.current_question_id) {
        return NextResponse.json(
          { error: "出題中の問題がありません" },
          { status: 409 }
        );
      }
      // 全参加者の現在ランクとこの問題の回答を取得
      const [{ data: parts }, { data: ans }] = await Promise.all([
        db.from("participants").select("id, rank_level, correct_count"),
        db
          .from("answers")
          .select("participant_id, is_correct")
          .eq("question_id", state.current_question_id),
      ]);
      const ansMap = new Map<string, boolean>();
      (ans ?? []).forEach((a) => ansMap.set(a.participant_id, a.is_correct));
      const updates = (parts ?? []).map((p) => {
        const correct = ansMap.get(p.id) === true;
        const newRank = clampRank(p.rank_level + (correct ? 1 : -1));
        const newCount = p.correct_count + (correct ? 1 : 0);
        return db
          .from("participants")
          .update({ rank_level: newRank, correct_count: newCount })
          .eq("id", p.id);
      });
      await Promise.all(updates);
      await db
        .from("game_state")
        .update({ phase: "RANK_UPDATE", updated_at: new Date().toISOString() })
        .eq("id", 1);
      return NextResponse.json({ ok: true });
    }

    case "next": {
      if (state.phase !== "RANK_UPDATE") {
        return NextResponse.json(
          { error: `RANK_UPDATEではありません (現在: ${state.phase})` },
          { status: 409 }
        );
      }
      const currentOrder = await currentQuestionOrder();
      const next = currentOrder !== null ? await nextActiveQuestion(currentOrder) : null;
      if (next) {
        await db
          .from("game_state")
          .update({
            phase: "QUESTION",
            current_question_id: next.id,
            revealed_correct_option: null,
            revealed_commentary: null,
            question_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);
      } else {
        await db
          .from("game_state")
          .update({
            phase: "FINAL",
            revealed_correct_option: null,
            revealed_commentary: null,
            question_started_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);
      }
      return NextResponse.json({ ok: true });
    }

    case "reset": {
      await db.from("answers").delete().not("id", "is", null);
      await db
        .from("participants")
        .update({ rank_level: 3, correct_count: 0 })
        .not("id", "is", null);
      await db
        .from("game_state")
        .update({
          phase: "LOBBY",
          current_question_id: null,
          revealed_correct_option: null,
          revealed_commentary: null,
          question_started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "未対応のaction" }, { status: 400 });
}
