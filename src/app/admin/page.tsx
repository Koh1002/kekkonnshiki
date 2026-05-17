"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParchmentFrame } from "@/components/ParchmentFrame";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ログイン失敗");
      router.push("/admin/console");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen velvet flex items-center justify-center p-6">
      <ParchmentFrame className="max-w-md w-full">
        <form onSubmit={submit} className="space-y-5 text-center">
          <div className="font-display text-goldleaf-300 tracking-[0.3em] text-xs">
            MASTER OF CEREMONY
          </div>
          <h1 className="font-display text-goldleaf-300 text-2xl">司会者 入口</h1>
          <p className="text-goldleaf-100 text-sm">合言葉を入力してください。</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-center text-lg rounded-md bg-[#0a0608] border-2 border-goldleaf-500/70 text-goldleaf-100 py-3 focus:outline-none focus:border-goldleaf-300"
          />
          {error && (
            <div className="text-red-300 text-sm bg-red-900/40 border border-red-500/40 rounded p-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-md border-2 border-goldleaf-500 bg-goldleaf-500/20 hover:bg-goldleaf-500/30 text-goldleaf-100 py-3 disabled:opacity-40"
          >
            {loading ? "認証中…" : "入場する"}
          </button>
        </form>
      </ParchmentFrame>
    </main>
  );
}
