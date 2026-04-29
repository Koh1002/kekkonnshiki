import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDb, ensureGameState } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ error: "認証必要" }, { status: 401 });
}

export async function GET() {
  if (!isAdmin()) return unauth();
  // 管理コンソール起動時に gameState/current を確実に初期化しておく
  await ensureGameState();
  const db = adminDb();
  const snap = await db.collection("questions").orderBy("order_index", "asc").get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!isAdmin()) return unauth();
  const body = (await req.json()) as {
    title?: string;
    description?: string | null;
    option_a_label?: string;
    option_a_image?: string | null;
    option_b_label?: string;
    option_b_image?: string | null;
    correct_option?: "A" | "B";
    commentary?: string | null;
    is_active?: boolean;
    timer_seconds?: number;
  };
  if (
    !body.title ||
    !body.option_a_label ||
    !body.option_b_label ||
    (body.correct_option !== "A" && body.correct_option !== "B")
  ) {
    return NextResponse.json(
      { error: "タイトル・A/B選択肢・正解は必須です" },
      { status: 400 }
    );
  }
  const timer =
    typeof body.timer_seconds === "number" && body.timer_seconds > 0
      ? Math.min(300, Math.round(body.timer_seconds))
      : 30;

  const db = adminDb();
  const snap = await db
    .collection("questions")
    .orderBy("order_index", "desc")
    .limit(1)
    .get();
  const lastIdx = snap.empty ? 0 : (snap.docs[0].data().order_index as number) ?? 0;

  const doc = await db.collection("questions").add({
    title: body.title,
    description: body.description ?? null,
    option_a_label: body.option_a_label,
    option_a_image: body.option_a_image ?? null,
    option_b_label: body.option_b_label,
    option_b_image: body.option_b_image ?? null,
    correct_option: body.correct_option,
    commentary: body.commentary ?? null,
    order_index: lastIdx + 1,
    is_active: body.is_active ?? true,
    timer_seconds: timer,
    created_at: new Date().toISOString(),
  });
  const created = await doc.get();
  return NextResponse.json({ id: created.id, ...created.data() });
}

export async function PATCH(req: Request) {
  if (!isAdmin()) return unauth();
  const body = (await req.json()) as {
    id: string;
    is_active?: boolean;
    order_index?: number;
    title?: string;
    description?: string | null;
    option_a_label?: string;
    option_a_image?: string | null;
    option_b_label?: string;
    option_b_image?: string | null;
    correct_option?: "A" | "B";
    commentary?: string | null;
    timer_seconds?: number;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id必須" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  for (const k of [
    "is_active",
    "order_index",
    "title",
    "description",
    "option_a_label",
    "option_a_image",
    "option_b_label",
    "option_b_image",
    "correct_option",
    "commentary",
    "timer_seconds",
  ] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const db = adminDb();
  await db.collection("questions").doc(body.id).update(patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return unauth();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 });
  const db = adminDb();
  await db.collection("questions").doc(id).delete();
  return NextResponse.json({ ok: true });
}
