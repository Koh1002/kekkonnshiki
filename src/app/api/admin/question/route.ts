import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 全問題を返す（管理者のみ正解・解説含めて取得可）
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "認証必要" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("questions")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// 新しい問題を追加
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "認証必要" }, { status: 401 });
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
  const db = supabaseAdmin();
  // 末尾に追加するため最大 order_index + 1
  const { data: last } = await db
    .from("questions")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.order_index ?? 0) + 1;
  const { data, error } = await db
    .from("questions")
    .insert({
      title: body.title,
      description: body.description ?? null,
      option_a_label: body.option_a_label,
      option_a_image: body.option_a_image ?? null,
      option_b_label: body.option_b_label,
      option_b_image: body.option_b_image ?? null,
      correct_option: body.correct_option,
      commentary: body.commentary ?? null,
      order_index: nextOrder,
      is_active: body.is_active ?? true,
      timer_seconds: timer,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 有効/無効の切替 or 順序の変更 or 内容の編集
export async function PATCH(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "認証必要" }, { status: 401 });
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
  const db = supabaseAdmin();
  const { error } = await db.from("questions").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "認証必要" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id必須" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
