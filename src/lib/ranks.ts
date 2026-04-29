export const RANK_NAMES: Record<number, string> = {
  5: "一流",
  4: "二流",
  3: "普通の人",
  2: "三流",
  1: "ご愛敬枠",
};

// 旧テンプレート（Latin 表記）が残っているので互換のため空文字で残す
export const RANK_LATIN: Record<number, string> = {
  5: "FIRST CLASS",
  4: "SECOND CLASS",
  3: "ORDINARY",
  2: "THIRD CLASS",
  1: "AMICUS",
};

export const RANK_TAGLINES: Record<number, string> = {
  5: "正真正銘の一流",
  4: "あと一歩で頂点",
  3: "ごく普通の方",
  2: "もう一息",
  1: "愛されキャラ",
};

// Lv ごとのテーマ。Tailwind JIT 用に完全なクラス名を保持する。
export type RankTheme = {
  bg: string;
  frame: string;
  accent: string;
  soft: string;
  surface: string;
  glow: string;
};

export const RANK_THEMES: Record<number, RankTheme> = {
  5: {
    bg: "velvet",
    frame: "border-goldleaf-300",
    accent: "text-goldleaf-200",
    soft: "text-goldleaf-50",
    surface: "bg-velvet-900/80",
    glow: "hover:shadow-[0_0_40px_#f0c63b]",
  },
  4: {
    bg: "velvet",
    frame: "border-goldleaf-400",
    accent: "text-goldleaf-300",
    soft: "text-goldleaf-50",
    surface: "bg-velvet-900/80",
    glow: "hover:shadow-[0_0_32px_#d4af37]",
  },
  3: {
    bg: "velvet",
    frame: "border-goldleaf-500",
    accent: "text-goldleaf-300",
    soft: "text-goldleaf-50",
    surface: "bg-velvet-900/80",
    glow: "hover:shadow-[0_0_24px_#a87900]",
  },
  2: {
    bg: "velvet",
    frame: "border-goldleaf-600",
    accent: "text-goldleaf-400",
    soft: "text-goldleaf-100",
    surface: "bg-velvet-900/80",
    glow: "hover:shadow-[0_0_18px_#7a5a16]",
  },
  1: {
    bg: "velvet",
    frame: "border-stone-400",
    accent: "text-stone-300",
    soft: "text-stone-100",
    surface: "bg-velvet-900/80",
    glow: "hover:shadow-[0_0_12px_#7a6a40]",
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
