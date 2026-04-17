import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "kekkon_admin";

function secret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET;
  if (!s) throw new Error("ADMIN_COOKIE_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function issueAdminCookie(): { name: string; value: string; options: object } {
  const payload = `admin.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12時間
    },
  };
}

export function clearAdminCookie(): { name: string; value: string; options: object } {
  return {
    name: COOKIE_NAME,
    value: "",
    options: { path: "/", maxAge: 0 },
  };
}

export function isAdmin(): boolean {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [prefix, ts, sig] = token.split(".");
  if (prefix !== "admin" || !ts || !sig) return false;
  const payload = `${prefix}.${ts}`;
  const expected = sign(payload);
  try {
    const ok =
      expected.length === sig.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    if (!ok) return false;
  } catch {
    return false;
  }
  // 12時間で失効
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age > 12 * 60 * 60 * 1000) return false;
  return true;
}
