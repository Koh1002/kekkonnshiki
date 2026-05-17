"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Answer, GameState, Participant, PublicQuestion } from "@/types/game";
import { RANK_LATIN, RANK_NAMES, rankIconPath } from "@/lib/ranks";
import { Timer } from "@/components/Timer";
import { ScreenshotButton } from "@/components/ScreenshotButton";

export function ScreenView() {
  const [state, setState] = useState<GameState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);

  useEffect(() => {
    const unsubState = onSnapshot(doc(db(), "gameState", "current"), (snap) => {
      if (snap.exists()) {
        setState(snap.data() as GameState);
      } else {
        setState({
          phase: "LOBBY",
          current_question_id: null,
          revealed_correct_option: null,
          revealed_commentary: null,
          question_started_at: null,
          updated_at: new Date().toISOString(),
        });
      }
    });
    const unsubParts = onSnapshot(
      query(collection(db(), "participants"), orderBy("joined_at", "asc")),
      (snap) => {
        setParticipants(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Participant, "id">) }))
        );
      }
    );
    const unsubAns = onSnapshot(collection(db(), "answers"), (snap) => {
      setAnswers(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Answer, "id">) }))
      );
    });
    return () => {
      unsubState();
      unsubParts();
      unsubAns();
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
      <main className="min-h-screen velvet flex items-center justify-center text-goldleaf-200 text-3xl">
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
    <main className="min-h-screen velvet text-goldleaf-100 overflow-hidden">
      {state.phase === "LOBBY" && (
        <LobbyView joinUrl={joinUrl} participants={participants} />
      )}
      {state.phase === "QUESTION" && question && (
        <QuestionView
          question={question}
          answered={currentAnswers.length}
          total={total}
          locked={false}
          startedAt={state.question_started_at}
        />
      )}
      {(state.phase === "LOCKED" ||
        state.phase === "COUNT" ||
        state.phase === "REVEAL") &&
        question && (
          <AnswerStage
            question={question}
            mode={
              state.phase === "LOCKED"
                ? "locked"
                : state.phase === "COUNT"
                  ? "count"
                  : "reveal"
            }
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
        <div className="font-display tracking-[0.4em] text-goldleaf-300 text-sm animate-shimmer">
          ◆ FIRST CLASS CHECK ◆
        </div>
        <div className="title-stage mx-auto">
          <h1 className="title-block text-show text-4xl sm:text-6xl md:text-7xl leading-[1.15]">
            <span className="block">一般人</span>
            <span className="block">格付けチェック</span>
          </h1>
        </div>
        <p className="text-goldleaf-100 text-xl">
          あなたは一流？<br />みんなでチェック！
        </p>
        <div className="bg-white p-6 rounded-lg shadow-2xl min-w-[320px] min-h-[320px] flex items-center justify-center border-4 border-goldleaf-400">
          {joinUrl ? (
            <QRCodeSVG value={joinUrl} size={320} level="M" includeMargin={false} />
          ) : (
            <span className="text-stone-600">読み込み中…</span>
          )}
        </div>
        <div className="text-goldleaf-200 text-sm break-all">{joinUrl}</div>
      </div>
      <div className="flex flex-col">
        <h2 className="font-display text-goldleaf-300 tracking-widest mb-4 text-center">
          本日の参列者（{participants.length}名）
        </h2>
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
            {participants.map((p) => (
              <div
                key={p.id}
                className="animate-rise rounded-md border border-goldleaf-500/30 bg-black/40 py-2 px-3 text-goldleaf-100 text-center truncate"
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
  startedAt,
}: {
  question: PublicQuestion;
  answered: number;
  total: number;
  locked: boolean;
  startedAt: string | null;
}) {
  return (
    <div className="min-h-screen flex flex-col p-8 sm:p-14">
      <div className="text-center mb-6">
        <div className="font-display tracking-[0.4em] text-goldleaf-300 text-sm animate-shimmer">
          ◆ 第 {question.order_index} 問 ◆
        </div>
        <h1 className="text-goldleaf-50 font-bold text-4xl sm:text-6xl mt-2 leading-snug">
          {question.title}
        </h1>
        {question.description && (
          <p className="text-goldleaf-100 text-xl mt-3">{question.description}</p>
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
      <div className="mt-8 flex flex-wrap items-end justify-center gap-8">
        <div className="inline-block px-6 py-3 rounded-md border border-goldleaf-500/60 bg-black/40 text-goldleaf-200 text-2xl">
          {locked ? "受付終了" : "回答受付中"} {answered}／{total}名
        </div>
        {!locked && (
          <Timer startedAt={startedAt} totalSeconds={question.timer_seconds} size="lg" />
        )}
      </div>
    </div>
  );
}

function OptionCard({
  letter,
  label,
  image,
}: {
  letter: "A" | "B";
  label: string;
  image: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4">
      <div className={`ab-cube ab-cube-${letter} w-48 h-48 sm:w-64 sm:h-64`}>
        <span className="text-[10rem] sm:text-[14rem] leading-none">{letter}</span>
      </div>
      {image && (
        <img
          src={image}
          alt=""
          className="max-h-56 object-contain rounded border-2 border-goldleaf-400"
        />
      )}
      <div className="text-goldleaf-50 text-2xl sm:text-3xl leading-snug font-bold">{label}</div>
    </div>
  );
}

// 回答締切→投票数→正解発表 の3段階を1コンポーネントで表現。
// mode="locked": A/B 大表示のみ（数字も正解も伏せる）
// mode="count" : A/B + それぞれの投票人数
// mode="reveal": 正解側を強調、不正解側をグレーに。画像と解説も表示
function AnswerStage({
  question,
  mode,
  correct,
  commentary,
  votesA,
  votesB,
}: {
  question: PublicQuestion;
  mode: "locked" | "count" | "reveal";
  correct: "A" | "B" | null;
  commentary: string | null;
  votesA: number;
  votesB: number;
}) {
  const showCount = mode === "count" || mode === "reveal";
  const showReveal = mode === "reveal";
  const correctImage =
    correct === "A"
      ? question.option_a_image
      : correct === "B"
        ? question.option_b_image
        : null;
  const header =
    mode === "locked"
      ? "◆ 回 答 締 切 ◆"
      : mode === "count"
        ? "◆ 投 票 結 果 ◆"
        : "◆ 正 解 発 表 ◆";

  function Cube({ letter, votes }: { letter: "A" | "B"; votes: number }) {
    const isCorrect = showReveal && correct === letter;
    const isWrong = showReveal && correct !== null && correct !== letter;
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 transition-all duration-500 ${
          isWrong ? "opacity-40 grayscale" : ""
        } ${isCorrect ? "scale-105" : ""}`}
      >
        <div
          className={`ab-cube ab-cube-${letter} w-40 h-40 lg:w-56 lg:h-56 ${
            isCorrect ? "animate-shimmer ring-8 ring-goldleaf-300" : ""
          }`}
        >
          <span className="text-[7rem] lg:text-[10rem] leading-none">{letter}</span>
        </div>
        {showCount && (
          <div
            className={`text-2xl lg:text-4xl font-black ${
              isWrong ? "text-goldleaf-100" : "text-goldleaf-200"
            }`}
          >
            {votes}名
          </div>
        )}
        {showReveal && isCorrect && correctImage && (
          <img
            src={correctImage}
            alt=""
            className="max-h-[34vh] max-w-full object-contain rounded-lg border-4 border-goldleaf-300 shadow-[0_0_36px_rgba(240,198,59,0.6)]"
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6 sm:p-10">
      <div className="text-center mb-4 shrink-0">
        <div className="font-display tracking-[0.4em] text-goldleaf-300 text-sm animate-shimmer">
          {header}
        </div>
        <h1 className="text-goldleaf-50 font-bold text-3xl sm:text-5xl mt-2 leading-snug">
          {question.title}
        </h1>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-8 sm:gap-16 items-center justify-items-center min-h-0">
        <Cube letter="A" votes={votesA} />
        <Cube letter="B" votes={votesB} />
      </div>

      {mode === "locked" && (
        <div className="text-center text-goldleaf-200 text-2xl sm:text-3xl mt-4 animate-shimmer">
          さあ、結果やいかに…？
        </div>
      )}
      {showReveal && commentary && (
        <p className="mx-auto mt-4 max-w-4xl text-goldleaf-50 text-xl lg:text-2xl leading-relaxed bg-velvet-900/80 border-2 border-goldleaf-400 rounded-lg p-5 text-center">
          {commentary}
        </p>
      )}
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
        <div className="font-display tracking-[0.4em] text-goldleaf-300 text-sm animate-shimmer">
          ◆ 現 在 の 格 付 け ◆
        </div>
        <h1 className="title-block text-gold text-4xl">格 序 列</h1>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        {byLevel.map(({ level, members }) => (
          <div
            key={level}
            className="flex items-center gap-4 border border-goldleaf-500/30 bg-black/30 rounded px-4 py-3"
          >
            <img
              src={rankIconPath(level)}
              alt=""
              className="w-16 h-16 rounded-full border border-goldleaf-500/40"
            />
            <div className="w-40">
              <div className="text-goldleaf-300 text-xs tracking-widest">
                {RANK_LATIN[level]}
              </div>
              <div className="text-goldleaf-100 font-bold">{RANK_NAMES[level]}</div>
              <div className="text-goldleaf-200 text-xs">{members.length}名</div>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="animate-rise inline-block rounded-md border border-goldleaf-500/40 bg-goldleaf-500/10 px-3 py-1 text-goldleaf-100"
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
  const captureRef = useRef<HTMLDivElement>(null);
  return (
    <div className="min-h-screen p-10 flex flex-col items-center">
      {/* スクショ対象範囲 */}
      <div ref={captureRef} className="velvet w-full flex flex-col items-center p-6">
        <div className="font-display tracking-[0.4em] text-goldleaf-300 text-sm animate-shimmer">
          ◆ FIRST CLASS CHECK ◆
        </div>
        <div className="title-stage mt-2 mb-2">
          <h1 className="title-block text-show text-4xl sm:text-5xl">本日の一流</h1>
        </div>
        <div className="text-goldleaf-300 text-3xl mb-4 animate-shimmer">
          ❖ ─── ✦ ─── ❖
        </div>
        {sortedRoyals.length === 0 ? (
          <p className="text-goldleaf-100 text-2xl">「一流」の座は、またの機会に。</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {sortedRoyals.map((p, idx) => (
              <div
                key={p.id}
                className="animate-seal text-center bg-velvet-900/70 border-4 border-goldleaf-300 rounded-xl p-6 shadow-[0_0_48px_rgba(240,198,59,0.55)]"
              >
                {idx === 0 && sortedRoyals.length > 1 && (
                  <div className="font-display text-goldleaf-300 text-sm mb-1 tracking-widest">
                    最高得点
                  </div>
                )}
                <img
                  src={rankIconPath(5)}
                  alt=""
                  className="w-44 h-44 mx-auto rounded-full border-4 border-goldleaf-300"
                />
                <div className="mt-3 title-block text-gold text-3xl">{p.display_name}</div>
                <div className="text-goldleaf-300 text-sm">正解数 {p.correct_count}</div>
              </div>
            ))}
          </div>
        )}
        <div className="w-full max-w-5xl space-y-2">
          {others.map(({ level, members }) => (
            <div
              key={level}
              className="border border-goldleaf-500/30 bg-velvet-900/60 rounded px-4 py-2 flex items-center gap-3"
            >
              <img src={rankIconPath(level)} alt="" className="w-10 h-10 rounded-full" />
              <span className="text-goldleaf-200 font-bold w-32">{RANK_NAMES[level]}</span>
              <span className="text-goldleaf-100 flex-1">
                {members.map((m) => m.display_name).join("、") || "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="text-goldleaf-300/85 text-xs mt-8 tracking-widest">
          一般人 格付けチェック
        </div>
      </div>
      <div className="mt-6">
        <ScreenshotButton
          targetRef={captureRef}
          fileName={`royal-court-final-${Date.now()}.png`}
          label="最終結果を画像で保存"
        />
      </div>
    </div>
  );
}
