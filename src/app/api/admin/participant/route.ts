import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 参加者を削除（関連する回答も一緒に削除）
export async function DELETE(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "認証必要" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id必須" }, { status: 400 });
  }
  const db = adminDb();

  const ans = await db.collection("answers").where("participant_id", "==", id).get();
  let batch = db.batch();
  let count = 0;
  for (const doc of ans.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  batch.delete(db.collection("participants").doc(id));
  await batch.commit();
  return NextResponse.json({ ok: true });
}
