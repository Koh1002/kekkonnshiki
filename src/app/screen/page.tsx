"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import type { Answer, GameState, Participant, PublicQuestion } from "@/types/game";
import { RANK_LATIN, RANK_NAMES, rankIconPath } from "@/lib/ranks";

export default function ScreenPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: gs }, { data: ps }, { data: ans }] = await Promise.all([
        supabase.from("game_state").select("*").eq("id", 1).single(),
        supabase.from("participants").select("*").order("joined_at", { ascending: true }),
        supabase.from("answers").select("*"),
      ]);
      if (gs) setState(gs as GameState);
      if (ps) setParticipants(ps as Participant[]);
      if (ans) setAnswers(ans as Answer[]);
    })();

    const ch = supabase
      .channel("screen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: "id=eq.1" },
        (payload) => payload.new && setState(payload.new as GameState)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        async () => {
          const { data } = await supabase
            .from("participants")
            .select("*")
            .order("joined_at", { ascending: true });
          if (data) setParticipants(data as Participant[]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers" },
        async () => {
          const { data } = await supabase.from("answers").select("*");
          if (data) setAnswers(data as Answer[]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!state?.current_question_id) {
        setQuestion(null);
        return;
      }
      const res = await fetch("/api/game/current-question", { cache: "no-store" });
      const data = await res.json();
      setQuestion(data.question ?? null);
    })();
  }, [state?.current_question_id, state?.phase]);

  const [joinUrl, setJoinUrl] = useState<string>("");
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setJoinUrl(`${base}/join`);
  }, []);

  if (!state) {
    return (
      <main className="min-h-screen parchment-dark flex items-center justify-center text-amber-200 text-3xl">
        しばらくお待ちください…
      </main>
    );
  }

  const currentAnswers = state.current_question_id
    ? answers.filter((a) => a.question_id === state.current_question_id)
    : [];
  const votesA = currentAnswers.filter((a) => a.selected_option === "A").length;
  const votesB = currentAnswers.filter((a) => a.selected_option === "B").length;
  const total = participants.length;

  return (
    <main className="min-h-screen parchment-dark text-amber-100 overflow-hidden">
      {state.phase === "LOBBY" && (
        <LobbyView joinUrl={joinUrl} participants={participants} />
      )}
      {(state.phase === "QUESTION" || state.phase === "LOCKED") && question && (
        <QuestionView
          question={question}
          answered={currentAnswers.length}
          total={total}
          locked={state.phase === "LOCKED"}
        />
      )}
      {state.phase === "REVEAL" && question && (
        <RevealView
          question={question}
          correct={state.revealed_correct_option}
          commentary={state.revealed_commentary}
          votesA={votesA}
          votesB={votesB}
        />
      )}
      {state.phase === "RANK_UPDATE" && (
        <RankPyramid participants={participants} />
      )}
      {state.phase === "FINAL" && <FinalView participants={participants} />}
    </main>
  );
}

function LobbyView({
  joinUrl,
  participants,
}: {
  joinUrl: string;
  participants: Participant[];
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-6 p-10">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="font-display tracking-[0.4em] text-amber-300 text-sm">
          ROYAL COURT
        </div>
        <h1 className="font-display text-amber-200 text-5xl sm:text-7xl leading-tight">
          宮廷 格付け会
        </h1>
        <p className="text-amber-100/80 text-xl">
          QRコードを読み取りて、<br />お名前にてご参加くださいませ。
        </p>
        <div className="bg-parchment-50 p-6 rounded-lg shadow-2xl min-w-[320px] min-h-[320px] flex items-center justify-center">
          {joinUrl ? (
            <QRCodeSVG value={joinUrl} size={320} level="M" includeMargin={false} />
          ) : (
            <span className="text-stone-600">読み込み中…</span>
          )}
        </div>
        <div className="text-amber-200/80 text-sm break-all">{joinUrl}</div>
      </div>
      <div className="flex flex-col">
        <h2 className="font-display text-amber-300 tracking-widest mb-4 text-center">
          本日の参列者（{participants.length}名）
        </h2>
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
            {participants.map((p) => (
              <div
                key={p.id}
                className="animate-rise rounded-md border border-amber-500/30 bg-black/40 py-2 px-3 text-amber-100 text-center truncate"
              >
                {p.display_name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionView({
  question,
  answered,
  total,
  locked,
}: {
  question: PublicQuestion;
  answered: number;
  total: number;
  locked: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col p-8 sm:p-14">
      <div className="text-center mb-6">
        <div className="font-display tracking-[0.4em] text-amber-300 text-sm">
          QUESTIO {question.order_index}
        </div>
        <h1 className="font-display text-amber-200 text-4xl sm:text-6xl mt-2">
          {question.title}
        </h1>
        {question.description && (
          <p className="text-amber-100/80 text-xl mt-3">{question.description}</p>
        )}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-8">
        <OptionCard
          letter="A"
          label={question.option_a_label}
          image={question.option_a_image}
        />
        <OptionCard
          letter="B"
          label={question.option_b_label}
          image={question.option_b_image}
        />
      </div>
      <div className="text-center mt-8">
        <div className="inline-block px-6 py-3 rounded-md border border-amber-500/60 bg-black/40 text-amber-200 text-2xl">
          {locked ? "受付終了" : "回答受付中"} {answered}／{total}名
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  letter,
  label,
  image,
}: {
  letter: string;
  label: string;
  image: string | null;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-500/60 bg-black/40 p-6 flex flex-col items-center justify-center text-center gap-4">
      <div className="font-display text-amber-300 text-9xl animate-shimmer">{letter}</div>
      {image && (
        <img
          src={image}
          alt=""
          className="max-h-64 object-contain rounded border border-amber-500/30"
        />
      )}
      <div className="text-amber-100 text-2xl sm:text-3xl leading-snug">{label}</div>
    </div>
  );
}

function RevealView({
  question,
  correct,
  commentary,
  votesA,
  votesB,
}: {
  question: PublicQuestion;
  correct: "A" | "B" | null;
  commentary: string | null;
  votesA: number;
  votesB: number;
}) {
  const total = Math.max(1, votesA + votesB);
  return (
    <div className="min-h-screen flex flex-col p-10 items-center justify-center text-center space-y-6">
      <div className="font-display tracking-[0.4em] text-amber-300 text-sm">
        VERITAS
      </div>
      <h1 className="font-display text-amber-200 text-4xl">{question.title}</h1>
      <div className="font-display text-[14rem] leading-none text-amber-300 animate-shimmer">
        {correct}
      </div>
      {commentary && (
        <p className="max-w-3xl text-amber-100 text-2xl leading-relaxed">{commentary}</p>
      )}
      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl pt-4">
        <VoteBar letter="A" count={votesA} total={total} highlight={correct === "A"} />
        <VoteBar letter="B" count={votesB} total={total} highlight={correct === "B"} />
      </div>
    </div>
  );
}

function VoteBar({
  letter,
  count,
  total,
  highlight,
}: {
  letter: string;
  count: number;
  total: number;
  highlight: boolean;
}) {
  const pct = Math.round((count / total) * 100);
  return (
    <div
      className={`rounded border p-4 ${
        highlight ? "border-amber-300 bg-amber-500/20" : "border-amber-500/40 bg-black/30"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl text-amber-300">{letter}</span>
        <span className="text-amber-100 text-2xl">{count}名（{pct}%）</span>
      </div>
      <div className="mt-2 h-4 bg-black/40 rounded overflow-hidden">
        <div
          className="h-full bg-amber-400"
          style={{ width: `${pct}%`, transition: "width 0.8s" }}
        />
      </div>
    </div>
  );
}

function RankPyramid({ participants }: { participants: Participant[] }) {
  const byLevel = [5, 4, 3, 2, 1].map((lv) => ({
    level: lv,
    members: participants.filter((p) => p.rank_level === lv),
  }));
  return (
    <div className="min-h-screen p-8 flex flex-col">
      <div className="text-center mb-4">
        <div className="font-display tracking-[0.4em] text-amber-300 text-sm">
          CURIA
        </div>
        <h1 className="font-display text-amber-200 text-4xl">格の序列</h1>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        {byLevel.map(({ level, members }) => (
          <div
            key={level}
            className="flex items-center gap-4 border border-amber-500/30 bg-black/30 rounded px-4 py-3"
          >
            <img
              src={rankIconPath(level)}
              alt=""
              className="w-16 h-16 rounded-full border border-amber-500/40"
            />
            <div className="w-40">
              <div className="text-amber-300 text-xs tracking-widest">
                {RANK_LATIN[level]}
              </div>
              <div className="text-amber-100 font-bold">{RANK_NAMES[level]}</div>
              <div className="text-amber-200/70 text-xs">{members.length}名</div>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="animate-rise inline-block rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-100"
                >
                  {m.display_name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalView({ participants }: { participants: Participant[] }) {
  const royals = participants.filter((p) => p.rank_level === 5);
  const sortedRoyals = [...royals].sort((a, b) => b.correct_count - a.correct_count);
  const others = [4, 3, 2, 1].map((lv) => ({
    level: lv,
    members: participants.filter((p) => p.rank_level === lv),
  }));
  return (
    <div className="min-h-screen p-10 flex flex-col items-center">
      <div className="font-display tracking-[0.4em] text-amber-300 text-sm">
        CORONATIO
      </div>
      <h1 className="font-display text-amber-200 text-5xl mt-2 mb-6">本日の王族</h1>
      {sortedRoyals.length === 0 ? (
        <p className="text-amber-100/80 text-2xl">王族の座は、またの機会に。</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          {sortedRoyals.map((p) => (
            <div
              key={p.id}
              className="animate-seal text-center bg-black/40 border-2 border-amber-300 rounded-xl p-6 shadow-[0_0_48px_rgba(212,175,55,0.4)]"
            >
              <img
                src={rankIconPath(5)}
                alt=""
                className="w-44 h-44 mx-auto rounded-full border-2 border-amber-400"
              />
              <div className="mt-3 font-display text-amber-200 text-3xl">
                {p.display_name}
              </div>
              <div className="text-amber-300 text-sm">
                正解数 {p.correct_count}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="w-full max-w-5xl space-y-2">
        {others.map(({ level, members }) => (
          <div
            key={level}
            className="border border-amber-500/30 bg-black/30 rounded px-4 py-2 flex items-center gap-3"
          >
            <img src={rankIconPath(level)} alt="" className="w-10 h-10 rounded-full" />
            <span className="text-amber-200 font-bold w-32">{RANK_NAMES[level]}</span>
            <span className="text-amber-100 flex-1">
              {members.map((m) => m.display_name).join("、") || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
