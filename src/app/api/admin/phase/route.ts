import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb, ensureGameState } from "@/lib/firebaseAdmin";
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

  const db = adminDb();
  const stateRef = await ensureGameState();
  const stateSnap = await stateRef.get();
  const state = stateSnap.data();
  if (!state) {
    return NextResponse.json({ error: "ゲーム状態取得失敗" }, { status: 500 });
  }

  async function firstActiveQuestion() {
    // composite index を要求しないよう is_active フィルタは client-side で
    const snap = await db
      .collection("questions")
      .orderBy("order_index", "asc")
      .get();
    const active = snap.docs.find((d) => d.data().is_active === true);
    return active ? { id: active.id, order_index: active.data().order_index as number } : null;
  }

  async function nextActiveQuestion(currentOrder: number) {
    const snap = await db
      .collection("questions")
      .orderBy("order_index", "asc")
      .get();
    const next = snap.docs.find(
      (d) => d.data().is_active === true && (d.data().order_index as number) > currentOrder
    );
    return next ? { id: next.id, order_index: next.data().order_index as number } : null;
  }

  async function currentQuestionOrder(): Promise<number | null> {
    if (!state?.current_question_id) return null;
    const q = await db.collection("questions").doc(state.current_question_id).get();
    return (q.data()?.order_index as number) ?? null;
  }

  async function deleteAllInCollection(name: string) {
    const snap = await db.collection(name).get();
    if (snap.empty) return;
    // 500 件ごとに分割 commit
    let batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      count++;
      if (count % 450 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();
  }

  async function resetAllParticipants() {
    const snap = await db.collection("participants").get();
    if (snap.empty) return;
    let batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
      batch.update(doc.ref, { rank_level: 3, correct_count: 0 });
      count++;
      if (count % 450 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();
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
      await Promise.all([resetAllParticipants(), deleteAllInCollection("answers")]);
      await stateRef.update({
        phase: "QUESTION",
        current_question_id: first.id,
        revealed_correct_option: null,
        revealed_commentary: null,
        question_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    case "lock": {
      if (state.phase !== "QUESTION") {
        return NextResponse.json(
          { error: `QUESTIONではありません (現在: ${state.phase})` },
          { status: 409 }
        );
      }
      await stateRef.update({
        phase: "LOCKED",
        updated_at: new Date().toISOString(),
      });
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
      const qSnap = await db.collection("questions").doc(state.current_question_id).get();
      const q = qSnap.data();
      if (!q) {
        return NextResponse.json({ error: "問題が見つかりません" }, { status: 500 });
      }
      // 該当問題の回答 is_correct を再計算
      const ansSnap = await db
        .collection("answers")
        .where("question_id", "==", state.current_question_id)
        .get();
      if (!ansSnap.empty) {
        let batch = db.batch();
        let count = 0;
        for (const doc of ansSnap.docs) {
          const is_correct = doc.data().selected_option === q.correct_option;
          batch.update(doc.ref, { is_correct });
          count++;
          if (count % 450 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
        await batch.commit();
      }
      await stateRef.update({
        phase: "REVEAL",
        revealed_correct_option: q.correct_option,
        revealed_commentary: q.commentary ?? null,
        updated_at: new Date().toISOString(),
      });
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
      const [partsSnap, ansSnap] = await Promise.all([
        db.collection("participants").get(),
        db
          .collection("answers")
          .where("question_id", "==", state.current_question_id)
          .get(),
      ]);
      const correctMap = new Map<string, boolean>();
      ansSnap.docs.forEach((d) => {
        const data = d.data();
        correctMap.set(data.participant_id, data.is_correct === true);
      });

      let batch = db.batch();
      let count = 0;
      for (const doc of partsSnap.docs) {
        const p = doc.data();
        const correct = correctMap.get(doc.id) === true;
        const newRank = clampRank((p.rank_level as number) + (correct ? 1 : -1));
        const newCount = (p.correct_count as number) + (correct ? 1 : 0);
        batch.update(doc.ref, { rank_level: newRank, correct_count: newCount });
        count++;
        if (count % 450 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      await batch.commit();

      await stateRef.update({
        phase: "RANK_UPDATE",
        updated_at: new Date().toISOString(),
      });
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
        await stateRef.update({
          phase: "QUESTION",
          current_question_id: next.id,
          revealed_correct_option: null,
          revealed_commentary: null,
          question_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        await stateRef.update({
          phase: "FINAL",
          revealed_correct_option: null,
          revealed_commentary: null,
          question_started_at: null,
          updated_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({ ok: true });
    }

    case "reset": {
      await Promise.all([resetAllParticipants(), deleteAllInCollection("answers")]);
      await stateRef.update({
        phase: "LOBBY",
        current_question_id: null,
        revealed_correct_option: null,
        revealed_commentary: null,
        question_started_at: null,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "未対応のaction" }, { status: 400 });
}
