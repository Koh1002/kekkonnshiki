-- 格付けゲーム 初期スキーマ
-- Supabase SQL Editor に貼り付けて実行

create extension if not exists "pgcrypto";

-- 問題
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  order_index int not null default 0,
  is_active boolean not null default true,
  title text not null,
  description text,
  option_a_label text not null,
  option_a_image text,
  option_b_label text not null,
  option_b_image text,
  correct_option text not null check (correct_option in ('A','B')),
  commentary text,
  created_at timestamptz not null default now()
);

-- ゲーム全体の状態（id=1 のシングルトン）
create table if not exists public.game_state (
  id int primary key default 1,
  phase text not null default 'LOBBY'
    check (phase in ('LOBBY','QUESTION','LOCKED','REVEAL','RANK_UPDATE','FINAL')),
  current_question_id uuid references public.questions(id) on delete set null,
  revealed_correct_option text check (revealed_correct_option in ('A','B')),
  revealed_commentary text,
  updated_at timestamptz not null default now(),
  constraint game_state_singleton check (id = 1)
);

insert into public.game_state (id, phase) values (1, 'LOBBY')
  on conflict (id) do nothing;

-- 参加者
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  rank_level int not null default 3 check (rank_level between 1 and 5),
  correct_count int not null default 0,
  joined_at timestamptz not null default now()
);

-- 回答
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('A','B')),
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  unique(participant_id, question_id)
);

-- RLS
alter table public.game_state enable row level security;
alter table public.participants enable row level security;
alter table public.answers enable row level security;
alter table public.questions enable row level security;

-- anon は game_state を読めるのみ
drop policy if exists "read game_state" on public.game_state;
create policy "read game_state" on public.game_state for select using (true);

-- anon は参加者一覧を読める（スクリーン表示用）
drop policy if exists "read participants" on public.participants;
create policy "read participants" on public.participants for select using (true);

-- anon は回答一覧を読める（投票状況表示のため。selected_option まで含む）
drop policy if exists "read answers" on public.answers;
create policy "read answers" on public.answers for select using (true);

-- questions は anon には直接公開しない（API 経由で出題中のみ安全に返却）
-- service role のみ読み書き可能

-- Realtime 有効化
alter publication supabase_realtime add table public.game_state;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.answers;
