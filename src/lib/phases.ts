import type { Phase } from "@/types/game";

export const PHASES: Phase[] = [
  "LOBBY",
  "QUESTION",
  "LOCKED",
  "REVEAL",
  "RANK_UPDATE",
  "FINAL",
];

export const PHASE_LABEL: Record<Phase, string> = {
  LOBBY: "参加受付",
  QUESTION: "出題中",
  LOCKED: "回答締切",
  REVEAL: "正解発表",
  RANK_UPDATE: "格変動",
  FINAL: "最終結果",
};

// 管理者が押せる次フェーズのボタンラベル。
export function nextPhaseOf(
  current: Phase,
  hasNextQuestion: boolean
): { next: Phase; label: string } | null {
  switch (current) {
    case "LOBBY":
      return hasNextQuestion
        ? { next: "QUESTION", label: "ゲーム開始（第一問へ）" }
        : null;
    case "QUESTION":
      return { next: "LOCKED", label: "回答を締め切る" };
    case "LOCKED":
      return { next: "REVEAL", label: "答えを表示する" };
    case "REVEAL":
      return { next: "RANK_UPDATE", label: "格変動を表示する" };
    case "RANK_UPDATE":
      return hasNextQuestion
        ? { next: "QUESTION", label: "次の問題へ" }
        : { next: "FINAL", label: "最終結果を発表" };
    case "FINAL":
      return null;
  }
}
