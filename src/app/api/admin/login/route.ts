import { NextResponse } from "next/server";
import { issueAdminCookie, clearAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD 未設定" },
      { status: 500 }
    );
  }
  if (password !== expected) {
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }
  const cookie = issueAdminCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return res;
}

export async function DELETE() {
  const c = clearAdminCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(c.name, c.value, c.options as never);
  return res;
}
