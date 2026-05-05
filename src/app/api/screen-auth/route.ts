import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /screen?auth=<SCREEN_ACCOUNT_NAME> から内部リダイレクトで叩かれる。
// token が一致すれば kekkon_role=screen Cookie を発行して /screen に戻す。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const expected = process.env.SCREEN_ACCOUNT_NAME;
  if (!expected || token !== expected) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const res = NextResponse.redirect(new URL("/screen", req.url));
  res.cookies.set("kekkon_role", "screen", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
