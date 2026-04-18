export type Phase =
  | "LOBBY"
  | "QUESTION"
  | "LOCKED"
  | "REVEAL"
  | "RANK_UPDATE"
  | "FINAL";

export type Option = "A" | "B";

export type GameState = {
  phase: Phase;
  current_question_id: string | null;
  revealed_correct_option: Option | null;
  revealed_commentary: string | null;
  question_started_at: string | null;
  updated_at: string;
};

export type Participant = {
  id: string;
  display_name: string;
  rank_level: number;
  correct_count: number;
  joined_at: string;
};

export type Answer = {
  id: string;
  participant_id: string;
  question_id: string;
  selected_option: Option;
  is_correct: boolean;
  answered_at: string;
};

// クライアントに渡す出題データ（正解・解説はフェーズにより付与）
export type PublicQuestion = {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  option_a_label: string;
  option_a_image: string | null;
  option_b_label: string;
  option_b_image: string | null;
  timer_seconds: number;
  correct_option?: Option;
  commentary?: string | null;
};
