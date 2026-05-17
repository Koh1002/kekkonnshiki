"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Answer, GameState, Participant, PublicQuestion } from "@/types/game";
import { RANK_LATIN, RANK_NAMES, RANK_TAGLINES, RANK_THEMES, rankIconPath } from "@/lib/ranks";
import { ParchmentFrame } from "@/components/ParchmentFrame";
import { Timer } from "@/components/Timer";
import { ScreenshotButton } from "@/components/ScreenshotButton";

export default function PlayPage() {
  const router = useRouter();
  const [pid, setPid] = useState<string | null>(null);
  const [pname, setPname] = useState<string>("");
  const [state, setState] = useState<GameState | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const prevRankRef = useRef<number | null>(null);

  // 初期ロード
  useEffect(() => {
    const id = localStorage.getItem("participant_id");
    const name = localStorage.getItem("participant_name") ?? "";
    if (!id) {
      router.replace("/join");
      return;
    }
    setPid(id);
    setPname(name);
  }, [router]);

  // ゲーム状態 & 自分の参加者情報 の購読
  useEffect(() => {
    if (!pid) return;

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

    const unsubMe = onSnapshot(doc(db(), "participants", pid), (snap) => {
      if (!snap.exists()) {
        // リセットで自分のレコードが消えた → 再登録へ
        localStorage.removeItem("participant_id");
        router.replace("/join");
        return;
      }
      const data = snap.data() as Omit<Participant, "id">;
      const np: Participant = { id: snap.id, ...data };
      setMe((prev) => {
        if (prev) prevRankRef.current = prev.rank_level;
        else prevRankRef.current = np.rank_level;
        return np;
      });
    });

    return () => {
      unsubState();
      unsubMe();
    };
  }, [pid, router]);

  // 自分の回答を取得（出題IDが変わるたび購読しなおし）
  useEffect(() => {
    if (!pid || !state?.current_question_id) {
      setMyAnswer(null);
      return;
    }
    const answerId = `${pid}_${state.current_question_id}`;
    const unsub = onSnapshot(doc(db(), "answers", answerId), (snap) => {
      if (!snap.exists()) {
        setMyAnswer(null);
        return;
      }
      setMyAnswer({ id: snap.id, ...(snap.data() as Omit<Answer, "id">) });
    });
    return () => unsub();
  }, [pid, state?.current_question_id]);

  // 出題データ取得（フェーズ or 問題IDが変わるたび）
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

  const theme = useMemo(() => RANK_THEMES[me?.rank_level ?? 3], [me?.rank_level]);

  async function submitAnswer(opt: "A" | "B") {
    if (!pid || !state?.current_question_id || submitting) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: pid,
          question_id: state.current_question_id,
          selected_option: opt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送信に失敗しました");
      setMyAnswer({
        id: "local",
        participant_id: pid,
        question_id: state.current_question_id,
        selected_option: opt,
        is_correct: false,
        answered_at: new Date().toISOString(),
      } as Answer);
    } catch (err: unknown) {
      setFlash(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!pid || !state || !me) {
    return (
      <main className="min-h-screen velvet flex items-center justify-center text-goldleaf-200">
        お呼び出しをお待ちください…
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen ${theme.bg} transition-colors duration-700`}
      data-rank={me.rank_level}
    >
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-4">
        {/* 参加者ヘッダー */}
        <div className={`flex items-center gap-3 rounded-md p-3 border ${theme.frame} ${theme.surface}`}>
          <img
            src={rankIconPath(me.rank_level)}
            alt=""
            width={56}
            height={56}
            className="rounded-full border-2 border-goldleaf-400"
          />
          <div className="flex-1 min-w-0">
            <div className={`text-xs tracking-widest ${theme.accent}`}>
              {RANK_LATIN[me.rank_level]}
            </div>
            <div className={`font-bold truncate ${theme.soft}`}>
              {pname || "名乗りし客人"} 様
            </div>
            <div className={`text-xs ${theme.accent}`}>
              現在の格：{RANK_NAMES[me.rank_level]}（{RANK_TAGLINES[me.rank_level]}）
            </div>
          </div>
        </div>

        {flash && (
          <div className="rounded border border-red-500/40 bg-red-900/40 text-red-100 p-2 text-sm">
            {flash}
          </div>
        )}

        <PhaseView
          phase={state.phase}
          question={question}
          myAnswer={myAnswer}
          revealed={state.revealed_correct_option ?? null}
          commentary={state.revealed_commentary ?? null}
          questionStartedAt={state.question_started_at}
          onPick={submitAnswer}
          submitting={submitting}
          me={me}
          pname={pname}
          prevRank={prevRankRef.current ?? me.rank_level}
          themeGlow={theme.glow}
          themeSurface={theme.surface}
          themeAccent={theme.accent}
          themeSoft={theme.soft}
          themeFrame={theme.frame}
        />
      </div>
    </main>
  );
}

function PhaseView(props: {
  phase: GameState["phase"];
  question: PublicQuestion | null;
  myAnswer: Answer | null;
  revealed: "A" | "B" | null;
  commentary: string | null;
  questionStartedAt: string | null;
  onPick: (opt: "A" | "B") => void;
  submitting: boolean;
  me: Participant;
  pname: string;
  prevRank: number;
  themeGlow: string;
  themeSurface: string;
  themeAccent: string;
  themeSoft: string;
  themeFrame: string;
}) {
  const {
    phase,
    question,
    myAnswer,
    revealed,
    commentary,
    questionStartedAt,
    onPick,
    submitting,
    me,
    pname,
    prevRank,
    themeGlow,
    themeSurface,
    themeAccent,
    themeSoft,
    themeFrame,
  } = props;

  if (phase === "LOBBY") {
    return (
      <ParchmentFrame>
        <div className="text-center space-y-4">
          <div className="font-display text-goldleaf-300 tracking-widest text-xs animate-shimmer">
            ◆ STAND BY ◆
          </div>
          <h2 className="title-block text-gold text-2xl">
            まもなく開始です
          </h2>
          <p className="text-goldleaf-100 text-sm leading-relaxed">
            司会者が開始するまで、<br />しばらくお待ちください。
          </p>
          <div className="pt-4">
            <div className="inline-block animate-seal text-goldleaf-300 text-3xl">❖</div>
          </div>
        </div>
      </ParchmentFrame>
    );
  }

  if (phase === "QUESTION" || phase === "LOCKED") {
    if (!question) {
      return (
        <ParchmentFrame>
          <p className="text-center text-goldleaf-100">問題を準備中…</p>
        </ParchmentFrame>
      );
    }
    const locked = phase === "LOCKED";
    const started = !!questionStartedAt;
    const interactive = !locked && started;
    const picked = myAnswer?.selected_option ?? null;
    const hasImages = !!(question.option_a_image || question.option_b_image);
    return (
      <ParchmentFrame>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-goldleaf-300 tracking-widest text-xs mb-2">
              {locked
                ? "受付終了"
                : !started
                  ? "まもなく開始します"
                  : "Ａ か Ｂ をお選びください"}
            </div>
            <h2 className={`title-block ${themeSoft} text-xl sm:text-2xl`}>
              {question.title}
            </h2>
            {question.description && (
              <p className={`mt-2 text-sm ${themeAccent}`}>{question.description}</p>
            )}
            {interactive && (
              <div className="mt-4 flex justify-center">
                <Timer
                  startedAt={questionStartedAt}
                  totalSeconds={question.timer_seconds}
                  size="md"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((opt) => {
              const selected = picked === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => interactive && onPick(opt)}
                  disabled={!interactive || submitting}
                  className={`ab-cube ab-cube-${opt} w-full disabled:cursor-not-allowed disabled:opacity-70 ${
                    selected ? "ab-cube-selected" : ""
                  } ${hasImages ? "h-20 sm:h-24" : "aspect-square"}`}
                >
                  <span
                    className={`leading-none ${
                      hasImages
                        ? "text-[3.5rem] sm:text-[4rem]"
                        : "text-[6rem] sm:text-[8rem]"
                    }`}
                  >
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 選択肢の説明（画像/テキスト）。画像がある時は大きく見せる */}
          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((opt) => {
              const label = opt === "A" ? question.option_a_label : question.option_b_label;
              const img = opt === "A" ? question.option_a_image : question.option_b_image;
              return (
                <div
                  key={opt}
                  className="rounded-md border border-goldleaf-500/50 bg-velvet-950/70 p-2 text-center"
                >
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="w-full h-56 sm:h-72 object-contain rounded border border-goldleaf-500/30 mb-2 bg-velvet-900"
                    />
                  )}
                  <div className="text-goldleaf-50 text-sm leading-snug">{label}</div>
                </div>
              );
            })}
          </div>

          <div className={`text-center text-base font-bold ${themeAccent}`}>
            {locked
              ? "回答は締め切られました。"
              : !started
                ? "司会者の合図をお待ちください…"
                : picked
                  ? `「${picked}」を選択中（変更も可能です）`
                  : "Ａ か Ｂ をタップ"}
          </div>
        </div>
      </ParchmentFrame>
    );
  }

  if (phase === "COUNT") {
    const picked = myAnswer?.selected_option ?? null;
    return (
      <ParchmentFrame>
        <div className="text-center space-y-5">
          <div className="font-display text-goldleaf-300 tracking-widest text-xs animate-shimmer">
            ◆ 投 票 結 果 ◆
          </div>
          <h2 className="title-block text-gold text-2xl">集計発表中…</h2>
          {picked ? (
            <div className={`ab-cube ab-cube-${picked} mx-auto w-32 h-32`}>
              <span className="text-[5rem] leading-none">{picked}</span>
            </div>
          ) : (
            <p className="text-goldleaf-100 text-base">あなたは未回答です</p>
          )}
          <p className="text-goldleaf-100 text-base leading-relaxed">
            {picked ? `あなたの回答は「${picked}」` : ""}
            <br />
            投票数は<strong className="text-goldleaf-200">会場のスクリーン</strong>でご覧ください。
          </p>
          <div className="inline-block animate-seal text-goldleaf-300 text-3xl">❖</div>
        </div>
      </ParchmentFrame>
    );
  }

  if (phase === "REVEAL") {
    const correct = revealed;
    const picked = myAnswer?.selected_option ?? null;
    const answered = !!picked;
    const isCorrect = answered && picked === correct;
    const correctImage =
      correct === "A"
        ? question?.option_a_image
        : correct === "B"
          ? question?.option_b_image
          : null;
    const correctLabel =
      correct === "A"
        ? question?.option_a_label
        : correct === "B"
          ? question?.option_b_label
          : null;
    return (
      <ParchmentFrame>
        <div className="text-center space-y-4">
          <div className="font-display text-goldleaf-300 tracking-widest text-xs animate-shimmer">
            ◆ 正 解 発 表 ◆
          </div>
          <h2 className="title-block text-gold text-2xl">正解は…</h2>
          {correct && (
            <div className={`ab-cube ab-cube-${correct} mx-auto w-40 h-40 animate-shimmer`}>
              <span className="text-[7rem] leading-none">{correct}</span>
            </div>
          )}
          {correctImage && (
            <img
              src={correctImage}
              alt=""
              className="mx-auto max-h-56 object-contain rounded-lg border-2 border-goldleaf-300 shadow-[0_0_24px_rgba(240,198,59,0.5)]"
            />
          )}
          {correctLabel && (
            <div className="text-goldleaf-50 text-base font-bold">{correctLabel}</div>
          )}
          {commentary && (
            <p className="text-goldleaf-100 leading-relaxed px-2">{commentary}</p>
          )}
          <div
            className={`mt-2 inline-block px-6 py-3 rounded-md border-2 text-lg font-bold ${
              answered
                ? isCorrect
                  ? "border-emerald-400 bg-emerald-900/30 text-emerald-200"
                  : "border-rose-400 bg-rose-900/30 text-rose-200"
                : "border-stone-400 bg-stone-900/30 text-stone-200"
            }`}
          >
            {answered
              ? isCorrect
                ? `お見事、正解です`
                : `惜しくも不正解…`
              : `未回答のため不正解扱いです`}
          </div>
          <p className="text-goldleaf-200 text-sm pt-2">
            続いて格の変動にまいります…
          </p>
        </div>
      </ParchmentFrame>
    );
  }

  if (phase === "RANK_UPDATE") {
    const up = me.rank_level > prevRank;
    const down = me.rank_level < prevRank;
    return (
      <ParchmentFrame>
        <div className="text-center space-y-4">
          <div className="font-display text-goldleaf-300 tracking-widest text-xs animate-shimmer">
            ◆ 格 変 動 ◆
          </div>
          <h2 className="title-block text-gold text-2xl">格の変動</h2>
          <div className="flex items-center justify-around gap-2 pt-2">
            <div className="flex flex-col items-center opacity-70">
              <img
                src={rankIconPath(prevRank)}
                alt=""
                className="w-20 h-20 rounded-full border border-goldleaf-500/40"
              />
              <div className="mt-1 text-xs text-goldleaf-100">{RANK_NAMES[prevRank]}</div>
            </div>
            <div className="text-3xl text-goldleaf-300">
              {up ? "▲" : down ? "▼" : "＝"}
            </div>
            <div className="flex flex-col items-center animate-rise">
              <img
                src={rankIconPath(me.rank_level)}
                alt=""
                className={`w-28 h-28 rounded-full border-2 ${themeFrame} shadow-[0_0_24px_rgba(212,175,55,0.5)]`}
              />
              <div className={`mt-1 text-sm font-bold ${themeSoft}`}>
                {RANK_NAMES[me.rank_level]}
              </div>
            </div>
          </div>
          <p className={`text-sm font-bold ${themeAccent}`}>
            {up
              ? "格上げ！お見事です。"
              : down
                ? "格下げ…次の問題で取り返しましょう。"
                : "現状維持。次に期待です。"}
          </p>
        </div>
      </ParchmentFrame>
    );
  }

  // FINAL
  return <FinalCard me={me} pname={pname} themeFrame={themeFrame} themeSurface={themeSurface} themeSoft={themeSoft} themeAccent={themeAccent} />;
}

function FinalCard({
  me,
  pname,
  themeFrame,
  themeSurface,
  themeSoft,
  themeAccent,
}: {
  me: Participant;
  pname: string;
  themeFrame: string;
  themeSurface: string;
  themeSoft: string;
  themeAccent: string;
}) {
  const isKing = me.rank_level === 5;
  const captureRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={captureRef}>
        <ParchmentFrame>
          <div className="text-center space-y-5">
            <div className="font-display text-goldleaf-300 tracking-widest text-xs animate-shimmer">
              ◆ FINAL RESULT ◆
            </div>
            <h2 className="title-block text-gold text-2xl">最 終 格 付 け</h2>
            <div className="text-goldleaf-300 text-xl">❖ ─ ✦ ─ ❖</div>
            <div className="title-block text-gold text-xl">{pname || "ゲスト"} 様</div>
            <div className={`mx-auto inline-block p-4 rounded-full border-4 ${themeFrame} ${themeSurface} ${isKing ? "animate-seal" : ""}`}>
              <img
                src={rankIconPath(me.rank_level)}
                alt=""
                className="w-36 h-36 rounded-full"
              />
            </div>
            <div className={`text-4xl title-block text-gold`}>
              {RANK_NAMES[me.rank_level]}
            </div>
            <div className={`text-sm ${themeAccent}`}>
              正解数：{me.correct_count} ／ {RANK_TAGLINES[me.rank_level]}
            </div>
            {isKing && (
              <p className="text-goldleaf-200 animate-shimmer font-bold">
                堂々の「一流」認定、おめでとうございます！
              </p>
            )}
            <div className="text-goldleaf-300/85 text-xs tracking-widest pt-2">
              一般人 格付けチェック
            </div>
          </div>
        </ParchmentFrame>
      </div>
      <div className="mt-4 flex justify-center">
        <ScreenshotButton
          targetRef={captureRef}
          fileName={`royal-court-${me.display_name || "guest"}.png`}
          label="結果を画像で保存"
        />
      </div>
    </>
  );
}
