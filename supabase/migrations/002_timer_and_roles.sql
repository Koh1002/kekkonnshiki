-- 2段目マイグレーション：タイマーとロール分離追加

-- 問題ごとの制限時間（秒）
alter table public.questions
  add column if not exists timer_seconds int not null default 30;

-- 出題の開始時刻（timer の起点）
alter table public.game_state
  add column if not exists question_started_at timestamptz;
