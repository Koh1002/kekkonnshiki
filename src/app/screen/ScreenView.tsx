"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Answer, GameState, Participant, PublicQuestion } from "@/types/game";
import { RANK_NAMES, rankIconPath } from "@/lib/ranks";
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
    <div className="min-h-screen flex flex-col p-8 sm:p-10 gap-6">
      {/* 上段：タイトル（横幅いっぱい・中央寄せ） */}
      <div className="flex flex-col items-center text-center gap-3 shrink-0">
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
          あなたは一流？　みんなでチェック！
        </p>
      </div>

      {/* 下段：左にQR、右上にルール説明・右下に最新10名 */}
      <div className="flex-1 grid grid-cols-[auto_1fr] gap-8 min-h-0">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="bg-white p-5 rounded-lg shadow-2xl flex items-center justify-center border-4 border-goldleaf-400">
            {joinUrl ? (
              <QRCodeSVG value={joinUrl} size={300} level="M" includeMargin={false} />
            ) : (
              <span className="text-stone-600 w-[300px] h-[300px] flex items-center justify-center">
                読み込み中…
              </span>
            )}
          </div>
          <p className="text-goldleaf-100 text-lg font-bold">
            QRからお名前で参加
          </p>
          <div className="text-goldleaf-200 text-xs break-all max-w-[320px] text-center">
            {joinUrl}
          </div>
        </div>

        <div className="flex flex-col min-h-0 gap-4">
          {/* ルール説明（参加者画面と同じ内容） */}
          <div className="flex-1 min-h-0 border-2 border-goldleaf-500/40 bg-velvet-900/60 rounded-lg p-5 overflow-y-auto">
            <h2 className="font-display text-goldleaf-300 tracking-widest text-center text-2xl mb-3">
              — あ そ び か た —
            </h2>
            <ol className="space-y-2 text-goldleaf-50 text-lg leading-relaxed">
              <li>
                <span className="text-goldleaf-300 font-black mr-2">①</span>
                司会が問題を読み上げます。スマホに出る <strong className="text-goldleaf-200">Ａ・Ｂ</strong> のお好きな方を一度だけタップ。
              </li>
              <li>
                <span className="text-goldleaf-300 font-black mr-2">②</span>
                各問に <strong className="text-goldleaf-200">制限時間</strong> あり。司会の合図でカウント開始（未回答は不正解扱い）。
              </li>
              <li>
                <span className="text-goldleaf-300 font-black mr-2">③</span>
                全員 <strong className="text-goldleaf-200">最高位「一流」</strong> からスタート。正解は変動なし、<strong className="text-goldleaf-200">不正解だと1つ格が落ちます</strong>（下がる一方）。
              </li>
              <li>
                <span className="text-goldleaf-300 font-black mr-2">④</span>
                格は5段階（一流 &gt; 二流 &gt; 普通の人 &gt; 三流 &gt; ご愛敬枠）。最後まで <strong className="text-goldleaf-200">「一流」を死守</strong>！
              </li>
              <li>
                <span className="text-goldleaf-300 font-black mr-2">⑤</span>
                進行は司会者が司ります。お手元で「次へ」は不要、そのままお待ちを。
              </li>
              <li>
                <span className="text-rose-300 font-black mr-2">⑥</span>
                <strong className="text-rose-200">AIにこっそり尋ねるのは品格を損ねる所業</strong>。ご自身の眼と感性のみで！
              </li>
            </ol>
          </div>

          {/* 右下：最新10名だけ */}
          <div className="shrink-0">
            <h3 className="font-display text-goldleaf-300 tracking-widest text-center text-base mb-2">
              参加者 {participants.length}名（最新10名）
            </h3>
            {participants.length === 0 ? (
              <div className="text-goldleaf-200 text-center text-base py-3">
                最初の参加者をお待ちしています…
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {participants
                  .slice(-10)
                  .reverse()
                  .map((p) => (
                    <span
                      key={p.id}
                      className="animate-rise rounded-md border border-goldleaf-500/30 bg-black/40 py-1.5 px-3 text-goldleaf-50 truncate text-base max-w-[10rem]"
                    >
                      {p.display_name}
                    </span>
                  ))}
              </div>
            )}
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
        {!locked && !startedAt ? (
          <div className="inline-block px-8 py-4 rounded-md border-2 border-goldleaf-400 bg-velvet-900/70 text-goldleaf-100 text-3xl animate-shimmer">
            まもなく開始します…
          </div>
        ) : (
          <>
            <div className="inline-block px-6 py-3 rounded-md border border-goldleaf-500/60 bg-black/40 text-goldleaf-200 text-2xl">
              {locked ? "受付終了" : "回答受付中"} {answered}／{total}名
            </div>
            {!locked && (
              <Timer
                startedAt={startedAt}
                totalSeconds={question.timer_seconds}
                size="lg"
              />
            )}
          </>
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
  // 画像がある時はA/Bキューブを小さく、画像を大きく下に。
  // 画像が無い時は従来どおりA/Bを大きく見せる。
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 min-h-0">
      <div
        className={`ab-cube ab-cube-${letter} shrink-0 ${
          image
            ? "w-24 h-24 sm:w-28 sm:h-28"
            : "w-48 h-48 sm:w-64 sm:h-64"
        }`}
      >
        <span
          className={`leading-none ${
            image ? "text-[4rem] sm:text-[5rem]" : "text-[10rem] sm:text-[14rem]"
          }`}
        >
          {letter}
        </span>
      </div>
      {image && (
        <img
          src={image}
          alt=""
          className="max-h-[52vh] max-w-full object-contain rounded-lg border-4 border-goldleaf-400 shadow-[0_0_24px_rgba(240,198,59,0.4)]"
        />
      )}
      <div className="text-goldleaf-50 text-xl sm:text-2xl leading-snug font-bold">
        {label}
      </div>
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
        <p className="mx-auto mt-3 max-w-4xl text-goldleaf-50 text-base sm:text-lg lg:text-xl leading-snug bg-velvet-900/80 border-2 border-goldleaf-400 rounded-lg px-4 py-3 text-center max-h-[28vh] overflow-y-auto">
          {commentary}
        </p>
      )}
    </div>
  );
}

function RankPyramid({ participants }: { participants: Participant[] }) {
  const total = Math.max(1, participants.length);
  const byLevel = [5, 4, 3, 2, 1].map((lv) => ({
    level: lv,
    count: participants.filter((p) => p.rank_level === lv).length,
  }));
  return (
    <div className="min-h-screen p-8 flex flex-col">
      <div className="text-center mb-6">
        <div className="font-display tracking-[0.4em] text-goldleaf-300 text-sm animate-shimmer">
          ◆ 現 在 の 格 付 け ◆
        </div>
        <h1 className="font-display text-goldleaf-300 text-4xl sm:text-5xl">
          格 序 列
        </h1>
      </div>
      {/* 人数が増えても見やすいよう、各ランクの人数だけを大きく表示 */}
      <div className="flex-1 flex flex-col gap-3 justify-center">
        {byLevel.map(({ level, count }) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div
              key={level}
              className="flex items-center gap-5 border-2 border-goldleaf-500/40 bg-black/30 rounded-lg px-5 py-4"
            >
              <img
                src={rankIconPath(level)}
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-goldleaf-400 shrink-0"
              />
              <div className="w-48 shrink-0">
                <div className="font-display text-goldleaf-100 font-bold text-2xl sm:text-3xl">
                  {RANK_NAMES[level]}
                </div>
              </div>
              {/* 人数バー */}
              <div className="flex-1 h-10 sm:h-12 bg-black/40 rounded overflow-hidden border border-goldleaf-500/30">
                <div
                  className="h-full bg-gradient-to-r from-goldleaf-600 to-goldleaf-300"
                  style={{ width: `${pct}%`, transition: "width 0.9s ease-out" }}
                />
              </div>
              <div className="w-28 sm:w-36 text-right shrink-0">
                <span className="font-display text-goldleaf-200 text-4xl sm:text-6xl tabular-nums">
                  {count}
                </span>
                <span className="text-goldleaf-300 text-xl sm:text-2xl ml-1">名</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center text-goldleaf-300 text-lg mt-4">
        参加者 {participants.length} 名
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
                <div className="mt-3 font-display text-goldleaf-300 text-3xl">{p.display_name}</div>
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
