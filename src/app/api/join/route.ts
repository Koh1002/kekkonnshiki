import { NextResponse } from "next/server";
import { adminDb, ensureGameState } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(req: Request) {
  const { display_name } = (await req.json()) as { display_name?: string };
  const name = (display_name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }
  if (name.length > 32) {
    return NextResponse.json(
      { error: "お名前は32文字以内でお願いします" },
      { status: 400 }
    );
  }

  const adminName = process.env.ADMIN_ACCOUNT_NAME;
  const screenName = process.env.SCREEN_ACCOUNT_NAME;

  // ① 管理者用アカウント名：パスワード認証へ誘導
  if (adminName && name === adminName) {
    const res = NextResponse.json({ role: "admin", redirect: "/admin" });
    res.cookies.set("kekkon_role", "admin-pending", {
      path: "/",
      sameSite: "lax",
      maxAge: ROLE_COOKIE_MAX_AGE,
    });
    return res;
  }

  // ② スクリーン用アカウント名：Cookieを立てて /screen へ
  if (screenName && name === screenName) {
    const res = NextResponse.json({ role: "screen", redirect: "/screen" });
    res.cookies.set("kekkon_role", "screen", {
      path: "/",
      sameSite: "lax",
      maxAge: ROLE_COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  // ③ それ以外：通常の参加者として登録
  // 参加初動でも gameState/current を確実に作っておく（screen 経由含む）
  await ensureGameState();
  const db = adminDb();
  const now = new Date().toISOString();
  const docRef = await db.collection("participants").add({
    display_name: name,
    rank_level: 3,
    correct_count: 0,
    joined_at: now,
  });
  return NextResponse.json({
    role: "participant",
    redirect: "/play",
    id: docRef.id,
    display_name: name,
    rank_level: 3,
    correct_count: 0,
  });
}
