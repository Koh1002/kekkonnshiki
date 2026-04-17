export const RANK_NAMES: Record<number, string> = {
  5: "王族",
  4: "一流貴族",
  3: "二流貴族",
  2: "三流貴族",
  1: "ご愛敬枠",
};

export const RANK_LATIN: Record<number, string> = {
  5: "REGNUM",
  4: "NOBILITAS",
  3: "MILES",
  2: "VASSALLUS",
  1: "AMICUS",
};

export const RANK_TAGLINES: Record<number, string> = {
  5: "天下に冠たる位",
  4: "比類なき高貴",
  3: "誉れ高き騎士",
  2: "慎ましき紳士",
  1: "愛すべきお方",
};

// Lv ごとのテーマ。Tailwind JIT 用に完全なクラス名を保持する。
export type RankTheme = {
  bg: string; // ページ背景
  frame: string; // 額縁枠の色
  accent: string; // 強調文字色
  soft: string; // 本文文字色
  surface: string; // カード/羊皮紙面の色
  glow: string; // 選択ボタンのハイライト
};

export const RANK_THEMES: Record<number, RankTheme> = {
  5: {
    bg: "bg-gradient-to-b from-black via-purple-950 to-black",
    frame: "border-amber-400",
    accent: "text-amber-300",
    soft: "text-amber-100",
    surface: "bg-[#1a0a20]/90",
    glow: "hover:shadow-[0_0_40px_#d4af37]",
  },
  4: {
    bg: "bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950",
    frame: "border-slate-300",
    accent: "text-slate-200",
    soft: "text-slate-100",
    surface: "bg-[#0c1020]/90",
    glow: "hover:shadow-[0_0_32px_#cfd6e6]",
  },
  3: {
    bg: "bg-gradient-to-b from-[#1a0606] via-[#3a0e0e] to-[#1a0606]",
    frame: "border-amber-700",
    accent: "text-amber-400",
    soft: "text-amber-50",
    surface: "bg-[#1a0606]/90",
    glow: "hover:shadow-[0_0_32px_#b07a2a]",
  },
  2: {
    bg: "bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950",
    frame: "border-amber-900",
    accent: "text-amber-700",
    soft: "text-stone-100",
    surface: "bg-[#1a1408]/90",
    glow: "hover:shadow-[0_0_24px_#8a6a2e]",
  },
  1: {
    bg: "bg-[#ece0c2]",
    frame: "border-stone-600",
    accent: "text-stone-800",
    soft: "text-stone-900",
    surface: "bg-[#f3e9cf]/95",
    glow: "hover:shadow-[0_0_16px_#7a6a40]",
  },
};

export function rankName(level: number): string {
  return RANK_NAMES[clampRank(level)] ?? "";
}

export function clampRank(level: number): number {
  if (level < 1) return 1;
  if (level > 5) return 5;
  return Math.round(level);
}

export function nextRank(current: number, correct: boolean): number {
  return clampRank(current + (correct ? 1 : -1));
}

export function rankIconPath(level: number): string {
  return `/ranks/${clampRank(level)}.svg`;
}
