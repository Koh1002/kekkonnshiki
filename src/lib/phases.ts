import type { Phase } from "@/types/game";

export const PHASES: Phase[] = [
  "LOBBY",
  "QUESTION",
  "LOCKED",
  "COUNT",
  "REVEAL",
  "RANK_UPDATE",
  "FINAL",
];

export const PHASE_LABEL: Record<Phase, string> = {
  LOBBY: "参加受付",
  QUESTION: "出題中",
  LOCKED: "回答締切（A・B提示）",
  COUNT: "投票数の発表",
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
      return { next: "COUNT", label: "投票数を表示する" };
    case "COUNT":
      return { next: "REVEAL", label: "正解を発表する" };
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
