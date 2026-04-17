"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Answer, GameState, Participant, PublicQuestion } from "@/types/game";
import { RANK_LATIN, RANK_NAMES, RANK_TAGLINES, RANK_THEMES, rankIconPath } from "@/lib/ranks";
import { ParchmentFrame } from "@/components/ParchmentFrame";

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
    let cancelled = false;

    (async () => {
      const [{ data: gs }, { data: p }] = await Promise.all([
        supabase.from("game_state").select("*").eq("id", 1).single(),
        supabase.from("participants").select("*").eq("id", pid).single(),
      ]);
      if (cancelled) return;
      if (gs) setState(gs as GameState);
      if (p) {
        setMe(p as Participant);
        prevRankRef.current = (p as Participant).rank_level;
      } else {
        // 参加者レコードが消えている（リセット）→ 再登録
        localStorage.removeItem("participant_id");
        router.replace("/join");
      }
    })();

    const ch = supabase
      .channel(`play:${pid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: "id=eq.1" },
        (payload) => {
          if (payload.new) setState(payload.new as GameState);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `id=eq.${pid}` },
        (payload) => {
          const np = payload.new as Participant | undefined;
          if (!np) return;
          // 格変動フェーズ検知のため前値を保持
          setMe((prev) => {
            if (prev) prevRankRef.current = prev.rank_level;
            return np;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [pid, router]);

  // 自分の回答を取得（フェーズや出題IDが変わるたび）
  useEffect(() => {
    if (!pid || !state?.current_question_id) {
      setMyAnswer(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("answers")
        .select("*")
        .eq("participant_id", pid)
        .eq("question_id", state.current_question_id!)
        .maybeSingle();
      setMyAnswer((data as Answer) ?? null);
    })();
  }, [pid, state?.current_question_id, state?.phase]);

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
      <main className="min-h-screen parchment-dark flex items-center justify-center text-amber-200">
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
            className="rounded-full border border-amber-500/40"
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
          onPick={submitAnswer}
          submitting={submitting}
          me={me}
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
  onPick: (opt: "A" | "B") => void;
  submitting: boolean;
  me: Participant;
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
    onPick,
    submitting,
    me,
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
          <div className="font-display text-amber-300 tracking-widest text-xs">LOBBY</div>
          <h2 className="font-display text-amber-200 text-2xl">
            まもなく開宴でございます
          </h2>
          <p className="text-amber-100/80 text-sm leading-relaxed">
            進行役がゲームを開始するまで、<br />しばしお待ちくださいませ。
          </p>
          <div className="pt-4">
            <div className="inline-block animate-seal text-amber-300 text-3xl">❖</div>
          </div>
        </div>
      </ParchmentFrame>
    );
  }

  if (phase === "QUESTION" || phase === "LOCKED") {
    if (!question) {
      return (
        <ParchmentFrame>
          <p className="text-center text-amber-100/80">問題を準備中…</p>
        </ParchmentFrame>
      );
    }
    const locked = phase === "LOCKED";
    const picked = myAnswer?.selected_option ?? null;
    return (
      <ParchmentFrame>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-amber-300 tracking-widest text-xs mb-2">
              {locked ? "受付終了" : "Ａ か Ｂ をお選びください"}
            </div>
            <h2 className={`font-display ${themeSoft} text-xl sm:text-2xl`}>
              {question.title}
            </h2>
            {question.description && (
              <p className={`mt-2 text-sm ${themeAccent}`}>{question.description}</p>
            )}
          </div>

          <div className="grid gap-3">
            {(["A", "B"] as const).map((opt) => {
              const label = opt === "A" ? question.option_a_label : question.option_b_label;
              const img = opt === "A" ? question.option_a_image : question.option_b_image;
              const selected = picked === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => !locked && onPick(opt)}
                  disabled={locked || submitting}
                  className={`btn-big w-full rounded-md border-2 text-left flex items-center gap-4 px-4 transition-all
                    ${selected
                      ? "border-amber-300 bg-amber-500/30 text-amber-50 ring-4 ring-amber-400/40"
                      : "border-amber-600/50 bg-black/30 text-amber-100 hover:bg-amber-500/10"}
                    ${!locked && !selected ? themeGlow : ""}
                    disabled:cursor-not-allowed
                  `}
                >
                  <span className="font-display text-4xl w-14 text-amber-300">{opt}</span>
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="w-20 h-20 object-cover rounded border border-amber-500/40"
                    />
                  )}
                  <span className="flex-1 leading-snug">{label}</span>
                </button>
              );
            })}
          </div>

          <div className={`text-center text-sm ${themeAccent}`}>
            {locked
              ? "回答は締め切られました。いましばしお待ちを。"
              : picked
                ? `回答：${picked} を承りました。変更も可能でございます。`
                : "お好きなほうを、心の赴くままに。"}
          </div>
        </div>
      </ParchmentFrame>
    );
  }

  if (phase === "REVEAL") {
    const correct = revealed;
    const picked = myAnswer?.selected_option ?? null;
    const answered = !!picked;
    const isCorrect = answered && picked === correct;
    return (
      <ParchmentFrame>
        <div className="text-center space-y-4">
          <div className="font-display text-amber-300 tracking-widest text-xs">
            TRUTH REVEALED
          </div>
          <h2 className="font-display text-amber-200 text-2xl">正解発表</h2>
          <div className="text-7xl font-display text-amber-300 animate-shimmer">
            {correct}
          </div>
          {commentary && (
            <p className="text-amber-100/90 leading-relaxed px-2">{commentary}</p>
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
                ? `あなた様はお見事、正解でございます`
                : `惜しくも、不正解でございます`
              : `未回答につき、不正解扱いとなりまする`}
          </div>
          <p className="text-amber-200/70 text-sm pt-2">
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
          <div className="font-display text-amber-300 tracking-widest text-xs">
            RANK CHANGE
          </div>
          <h2 className="font-display text-amber-200 text-2xl">格の変動</h2>
          <div className="flex items-center justify-around gap-2 pt-2">
            <div className="flex flex-col items-center opacity-70">
              <img
                src={rankIconPath(prevRank)}
                alt=""
                className="w-20 h-20 rounded-full border border-amber-500/40"
              />
              <div className="mt-1 text-xs text-amber-100/80">{RANK_NAMES[prevRank]}</div>
            </div>
            <div className="text-3xl text-amber-300">
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
          <p className={`text-sm ${themeAccent}`}>
            {up
              ? "高貴なるお振る舞い、お見事でございました。"
              : down
                ? "次なる挑戦で、お返しあそばせ。"
                : "変わらぬ御名誉にて候。"}
          </p>
        </div>
      </ParchmentFrame>
    );
  }

  // FINAL
  const isKing = me.rank_level === 5;
  return (
    <ParchmentFrame>
      <div className="text-center space-y-5">
        <div className="font-display text-amber-300 tracking-widest text-xs">FINALE</div>
        <h2 className="font-display text-amber-200 text-2xl">最終格付け</h2>
        <div className={`mx-auto inline-block p-4 rounded-full border-2 ${themeFrame} ${themeSurface} ${isKing ? "animate-seal" : ""}`}>
          <img
            src={rankIconPath(me.rank_level)}
            alt=""
            className="w-36 h-36 rounded-full"
          />
        </div>
        <div className={`text-3xl font-display ${themeSoft}`}>
          {RANK_NAMES[me.rank_level]}
        </div>
        <div className={`text-sm ${themeAccent}`}>
          正解数：{me.correct_count} ／ {RANK_TAGLINES[me.rank_level]}
        </div>
        {isKing && (
          <p className="text-amber-200 animate-shimmer font-bold">
            天下に冠たる王族の座、誠におめでとうございます！
          </p>
        )}
      </div>
    </ParchmentFrame>
  );
}
