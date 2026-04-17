"use client";
import { useEffect, useState } from "react";

export function useCountdown(startedAtIso: string | null, totalSeconds: number) {
  const [remaining, setRemaining] = useState<number>(totalSeconds);
  useEffect(() => {
    if (!startedAtIso) {
      setRemaining(totalSeconds);
      return;
    }
    const startedMs = new Date(startedAtIso).getTime();
    function tick() {
      const elapsed = (Date.now() - startedMs) / 1000;
      const left = Math.max(0, Math.ceil(totalSeconds - elapsed));
      setRemaining(left);
    }
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [startedAtIso, totalSeconds]);
  return remaining;
}

export function Timer({
  startedAt,
  totalSeconds,
  size = "md",
}: {
  startedAt: string | null;
  totalSeconds: number;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const remaining = useCountdown(startedAt, totalSeconds);
  const pct = Math.max(0, Math.min(100, (remaining / totalSeconds) * 100));
  const danger = remaining <= Math.max(5, Math.floor(totalSeconds / 4));
  const textSize = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
    xl: "text-[9rem]",
  }[size];
  return (
    <div className="inline-flex flex-col items-center">
      <div
        className={`font-display ${textSize} tabular-nums ${
          danger ? "text-rose-300 animate-shimmer" : "text-amber-200"
        }`}
      >
        {remaining}
        <span className="text-xs ml-2 opacity-70 align-middle">秒</span>
      </div>
      <div className="w-full max-w-[240px] h-2 mt-2 bg-black/50 rounded overflow-hidden border border-amber-500/30">
        <div
          className={`h-full ${danger ? "bg-rose-400" : "bg-amber-400"}`}
          style={{ width: `${pct}%`, transition: "width 0.2s linear" }}
        />
      </div>
    </div>
  );
}
