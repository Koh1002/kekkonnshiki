import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { display_name } = (await req.json()) as { display_name?: string };
  const name = (display_name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }
  if (name.length > 24) {
    return NextResponse.json(
      { error: "お名前は24文字以内でお願いします" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // ゲームが最終発表中 or 途中フェーズでも参加はできるが、途中から参加した場合は
  // rank_level=3 で開始（公平性は司会者が補足する想定）。
  const { data, error } = await db
    .from("participants")
    .insert({ display_name: name, rank_level: 3, correct_count: 0 })
    .select("id, display_name, rank_level, correct_count")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
