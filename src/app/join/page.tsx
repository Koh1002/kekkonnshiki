"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ParchmentFrame } from "@/components/ParchmentFrame";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "参加登録に失敗しました");
      if (data.role === "participant") {
        localStorage.setItem("participant_id", data.id);
        localStorage.setItem("participant_name", data.display_name);
      }
      router.push(data.redirect ?? "/play");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen velvet flex items-center justify-center p-6">
      <ParchmentFrame className="max-w-lg w-full">
        <form onSubmit={submit} className="space-y-6 text-center">
          <div className="font-display text-goldleaf-300 tracking-[0.3em] text-xs">
            ◆ ENTRY ◆
          </div>
          <h1 className="title-block text-gold text-2xl sm:text-3xl">
            お名前をお聞かせください
          </h1>
          <p className="text-goldleaf-100 text-sm">
            その他の情報は一切不要でございます。
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：山田 太郎"
            maxLength={32}
            required
            autoComplete="off"
            autoCapitalize="off"
            className="w-full text-center text-2xl font-bold rounded-md bg-velvet-950 border-2 border-goldleaf-400 text-goldleaf-50 py-4 px-4 focus:outline-none focus:border-goldleaf-200"
          />
          {error && (
            <div className="text-rose-200 text-sm bg-rose-900/40 border border-rose-500/40 rounded p-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-big w-full rounded-md border-2 border-goldleaf-300 bg-gradient-to-b from-goldleaf-500 to-goldleaf-700 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-velvet-950 font-black transition-all"
          >
            {loading ? "登録中…" : "席につく"}
          </button>
        </form>
      </ParchmentFrame>
    </main>
  );
}
