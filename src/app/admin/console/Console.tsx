"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Answer, GameState, Participant } from "@/types/game";
import { PHASE_LABEL } from "@/lib/phases";
import { RANK_NAMES, rankIconPath } from "@/lib/ranks";
import { Timer, useCountdown } from "@/components/Timer";

type AdminQuestion = {
  id: string;
  order_index: number;
  is_active: boolean;
  title: string;
  option_a_label: string;
  option_b_label: string;
  option_a_image: string | null;
  option_b_image: string | null;
  correct_option: "A" | "B";
  commentary: string | null;
  timer_seconds: number;
};

export function AdminConsole() {
  const [state, setState] = useState<GameState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadQuestions() {
    const res = await fetch("/api/admin/question", { cache: "no-store" });
    if (res.ok) setQuestions(await res.json());
  }

  useEffect(() => {
    loadQuestions();
    const unsubState = onSnapshot(doc(db(), "gameState", "current"), (snap) => {
      if (snap.exists()) {
        setState(snap.data() as GameState);
      } else {
        // 初回ロード時はまだ Firestore にドキュメントが無い → 仮想的に LOBBY を表示。
        // "ゲーム開始" 等のAPIが走ると Firestore にも実体が作られ、こちらも上書きされる。
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

  const currentAnswers = useMemo(
    () =>
      state?.current_question_id
        ? answers.filter((a) => a.question_id === state.current_question_id)
        : [],
    [answers, state?.current_question_id]
  );

  const activeQuestions = useMemo(
    () => questions.filter((q) => q.is_active).sort((a, b) => a.order_index - b.order_index),
    [questions]
  );

  const currentQuestion = useMemo(
    () => questions.find((q) => q.id === state?.current_question_id) ?? null,
    [questions, state?.current_question_id]
  );

  const hasNextQuestion = useMemo(() => {
    if (!currentQuestion) return activeQuestions.length > 0;
    return activeQuestions.some((q) => q.order_index > currentQuestion.order_index);
  }, [activeQuestions, currentQuestion]);

  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作に失敗しました");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // 制限時間切れで自動的に回答を締め切る
  const autoLockedRef = useRef<string | null>(null);
  const currentTimer = currentQuestion?.timer_seconds ?? 30;
  const remaining = useCountdown(
    state?.phase === "QUESTION" ? state.question_started_at : null,
    currentTimer
  );
  useEffect(() => {
    if (
      state?.phase === "QUESTION" &&
      state.current_question_id &&
      state.question_started_at &&
      remaining <= 0 &&
      autoLockedRef.current !== state.current_question_id
    ) {
      autoLockedRef.current = state.current_question_id;
      act("lock");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, state?.phase, state?.current_question_id, state?.question_started_at]);

  async function toggleActive(q: AdminQuestion) {
    await fetch("/api/admin/question", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, is_active: !q.is_active }),
    });
    await loadQuestions();
  }

  async function move(q: AdminQuestion, dir: -1 | 1) {
    const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((x) => x.id === q.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      fetch("/api/admin/question", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q.id, order_index: target.order_index }),
      }),
      fetch("/api/admin/question", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, order_index: q.order_index }),
      }),
    ]);
    await loadQuestions();
  }

  async function deleteQuestion(q: AdminQuestion) {
    if (!confirm(`「${q.title}」を削除しますか？`)) return;
    await fetch(`/api/admin/question?id=${q.id}`, { method: "DELETE" });
    await loadQuestions();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  }

  if (!state) {
    return (
      <main className="min-h-screen velvet flex items-center justify-center text-goldleaf-200">
        読み込み中…
      </main>
    );
  }

  const phase = state.phase;
  const actions: { key: string; label: string; primary?: boolean; danger?: boolean }[] = [];
  switch (phase) {
    case "LOBBY":
      actions.push({
        key: "start",
        label: activeQuestions.length > 0 ? "ゲーム開始（第一問へ）" : "有効な問題がありません",
        primary: true,
      });
      break;
    case "QUESTION":
      actions.push({ key: "lock", label: "回答を締め切る", primary: true });
      break;
    case "LOCKED":
      actions.push({ key: "reveal", label: "答えを表示する", primary: true });
      break;
    case "REVEAL":
      actions.push({ key: "applyRank", label: "格変動を表示する", primary: true });
      break;
    case "RANK_UPDATE":
      actions.push({
        key: "next",
        label: hasNextQuestion ? "次の問題へ" : "最終結果を発表",
        primary: true,
      });
      break;
    case "FINAL":
      break;
  }
  actions.push({ key: "reset", label: "ゲームをリセット", danger: true });

  return (
    <main className="min-h-screen velvet text-goldleaf-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display tracking-[0.3em] text-goldleaf-300 text-xs">
              ◆ MC CONSOLE ◆
            </div>
            <h1 className="title-block text-gold text-2xl sm:text-3xl">
              一般人格付けチェック・進行卓
            </h1>
          </div>
          <button
            onClick={logout}
            className="text-goldleaf-400/70 hover:text-goldleaf-300 text-sm underline underline-offset-4"
          >
            ログアウト
          </button>
        </header>

        {/* 現在のフェーズ */}
        <section className="rounded-lg border border-goldleaf-500/40 bg-black/30 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-goldleaf-300 text-xs tracking-widest">現在のフェーズ</div>
              <div className="title-block text-goldleaf-200 text-3xl">
                {PHASE_LABEL[phase]}
              </div>
              {currentQuestion && (
                <div className="text-goldleaf-100 text-sm mt-1">
                  出題中：第{currentQuestion.order_index}問「{currentQuestion.title}」
                  （正解 {currentQuestion.correct_option}／制限 {currentQuestion.timer_seconds}秒）
                </div>
              )}
              {phase === "QUESTION" || phase === "LOCKED" ? (
                <div className="text-goldleaf-100 text-sm">
                  回答済み {currentAnswers.length}／{participants.length}名
                </div>
              ) : null}
            </div>
            {phase === "QUESTION" && state.question_started_at && (
              <Timer
                startedAt={state.question_started_at}
                totalSeconds={currentTimer}
                size="md"
              />
            )}
          </div>

          {error && (
            <div className="mt-3 text-red-200 text-sm bg-red-900/40 border border-red-500/40 rounded p-2">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {actions.map((a) => (
              <button
                key={a.key}
                onClick={() => {
                  if (a.key === "reset" && !confirm("本当にリセットしますか？")) return;
                  act(a.key);
                }}
                disabled={
                  busy ||
                  (a.key === "start" && activeQuestions.length === 0) ||
                  (phase === "FINAL" && a.key !== "reset")
                }
                className={`px-5 py-3 rounded-md border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  ${a.primary
                    ? "border-goldleaf-400 bg-goldleaf-500/20 hover:bg-goldleaf-500/30 text-goldleaf-100 font-bold"
                    : a.danger
                      ? "border-red-500 bg-red-900/30 hover:bg-red-900/50 text-red-100"
                      : "border-goldleaf-500/50 bg-black/30 hover:bg-goldleaf-500/10 text-goldleaf-100"}
                `}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* 参加者一覧 */}
        <section className="rounded-lg border border-goldleaf-500/40 bg-black/30 p-5">
          <h2 className="font-display text-goldleaf-200 text-lg mb-3">
            参加者（{participants.length}名）
          </h2>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {participants.map((p) => {
              const ans = currentAnswers.find((a) => a.participant_id === p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 border border-goldleaf-500/20 bg-black/40 rounded p-2"
                >
                  <img
                    src={rankIconPath(p.rank_level)}
                    alt=""
                    className="w-9 h-9 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-goldleaf-100">{p.display_name}</div>
                    <div className="text-xs text-goldleaf-300">
                      {RANK_NAMES[p.rank_level]}（正解{p.correct_count}）
                    </div>
                  </div>
                  {phase === "QUESTION" || phase === "LOCKED" ? (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        ans
                          ? "bg-emerald-900/40 text-emerald-200 border border-emerald-500/40"
                          : "bg-stone-800 text-stone-300 border border-stone-500/40"
                      }`}
                    >
                      {ans ? "回答済" : "未回答"}
                    </span>
                  ) : null}
                  <button
                    onClick={async () => {
                      if (!confirm(`${p.display_name} さんを削除しますか？\n（この方の回答も合わせて削除されます）`)) return;
                      await fetch(`/api/admin/participant?id=${p.id}`, { method: "DELETE" });
                    }}
                    className="ml-1 w-7 h-7 flex items-center justify-center rounded border border-red-500/60 text-red-200 hover:bg-red-900/40 text-lg leading-none"
                    title={`${p.display_name} を削除`}
                    aria-label={`${p.display_name} を削除`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {participants.length === 0 && (
              <div className="text-goldleaf-200 text-sm">まだ参加者がいません。</div>
            )}
          </div>
        </section>

        {/* 問題管理 */}
        <section className="rounded-lg border border-goldleaf-500/40 bg-black/30 p-5">
          <h2 className="font-display text-goldleaf-200 text-lg mb-3">
            問題管理（最大5問まで出題できます）
          </h2>
          <div className="text-goldleaf-300 text-xs mb-3">
            チェックを入れた問題が ON。▲▼ で順序を入れ替え。
          </div>
          <div className="space-y-2">
            {questions.map((q) => (
              <div
                key={q.id}
                className="flex items-start gap-3 border border-goldleaf-500/20 bg-black/30 rounded p-3"
              >
                <label className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    checked={q.is_active}
                    onChange={() => toggleActive(q)}
                    className="w-5 h-5 accent-goldleaf-400"
                  />
                  <span className="text-goldleaf-200 text-sm">有効</span>
                </label>
                <div className="flex-1 min-w-0">
                  <div className="text-goldleaf-100 font-bold">
                    第{q.order_index}問：{q.title}
                  </div>
                  <div className="text-goldleaf-200 text-sm">
                    Ａ：{q.option_a_label} ／ Ｂ：{q.option_b_label}
                  </div>
                  <div className="text-goldleaf-300 text-xs">
                    正解：{q.correct_option}
                    {q.commentary ? `｜解説：${q.commentary}` : ""}
                  </div>
                  <TimerInput
                    value={q.timer_seconds}
                    onSave={async (v) => {
                      await fetch("/api/admin/question", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: q.id, timer_seconds: v }),
                      });
                      await loadQuestions();
                    }}
                  />
                  <ImageUrlRow question={q} onSaved={loadQuestions} />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(q, -1)}
                    className="px-2 py-1 border border-goldleaf-500/40 rounded text-goldleaf-200 hover:bg-goldleaf-500/10"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(q, 1)}
                    className="px-2 py-1 border border-goldleaf-500/40 rounded text-goldleaf-200 hover:bg-goldleaf-500/10"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => deleteQuestion(q)}
                    className="px-2 py-1 border border-red-500/60 rounded text-red-200 hover:bg-red-900/30 text-xs"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
            <div className="text-goldleaf-200/90 text-sm space-y-2 pt-2 border-t border-goldleaf-500/20">
              <p>
                {questions.length === 0
                  ? "問題が登録されていません。下のフォームから追加するか、本番問題5問を一括投入できます。"
                  : "本番5問（飲食・たまごっち・絵画・アクセサリー・音楽聞き比べ）に差し替えることもできます。既存の問題はすべて削除されます。"}
              </p>
              <button
                onClick={async () => {
                  const replace = questions.length > 0;
                  const msg = replace
                    ? "既存の問題を全て削除し、本番5問に置き換えます。よろしいですか？"
                    : "本番5問を投入します。よろしいですか？";
                  if (!confirm(msg)) return;
                  const res = await fetch("/api/admin/seed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ replace }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    alert(data.error ?? "投入に失敗しました");
                    return;
                  }
                  await loadQuestions();
                }}
                className={`px-4 py-2 rounded border ${
                  questions.length > 0
                    ? "border-red-400 text-red-200 hover:bg-red-900/30"
                    : "border-goldleaf-500/60 text-goldleaf-200 hover:bg-goldleaf-500/10"
                }`}
              >
                {questions.length > 0
                  ? "本番5問に差し替え（既存削除）"
                  : "本番5問を一括投入"}
              </button>
            </div>
          </div>

          <AddQuestionForm onCreated={loadQuestions} />
        </section>

        {/* 投影用リンク */}
        <section className="rounded-lg border border-goldleaf-500/40 bg-black/30 p-5">
          <h2 className="font-display text-goldleaf-200 text-lg mb-2">会場スクリーン</h2>
          <p className="text-goldleaf-100 text-sm mb-2">
            プロジェクタに映す画面。フルスクリーンでお使いください。
          </p>
          <a
            href="/screen"
            target="_blank"
            className="inline-block px-4 py-2 rounded border border-goldleaf-500/60 text-goldleaf-200 hover:bg-goldleaf-500/10"
          >
            /screen を新しいタブで開く
          </a>
        </section>
      </div>
    </main>
  );
}

function TimerInput({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => Promise<void>;
}) {
  // 入力中はローカル文字列で保持し、blur / Enter で保存。
  // こうしないと onChange のたびに loadQuestions() で値が上書きされ、
  // 「6 → 60」のようにタイプする途中で切り戻されてしまう。
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  async function commit() {
    const num = Math.max(5, Math.min(300, parseInt(text, 10) || 30));
    setText(String(num));
    if (num !== value) await onSave(num);
  }

  return (
    <label className="mt-2 inline-flex items-center gap-2 text-goldleaf-200 text-xs">
      制限時間
      <input
        type="number"
        inputMode="numeric"
        min={5}
        max={300}
        step={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="w-20 bg-black/40 border border-goldleaf-500/40 rounded px-2 py-1 text-goldleaf-100"
      />
      秒
    </label>
  );
}

function ImageUrlRow({
  question,
  onSaved,
}: {
  question: AdminQuestion;
  onSaved: () => void | Promise<void>;
}) {
  const [a, setA] = useState(question.option_a_image ?? "");
  const [b, setB] = useState(question.option_b_image ?? "");
  // 親側で再フェッチされた時に同期
  useEffect(() => setA(question.option_a_image ?? ""), [question.option_a_image]);
  useEffect(() => setB(question.option_b_image ?? ""), [question.option_b_image]);

  async function save(field: "option_a_image" | "option_b_image", value: string) {
    await fetch("/api/admin/question", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: question.id, [field]: value || null }),
    });
    await onSaved();
  }

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {(["A", "B"] as const).map((side) => {
        const value = side === "A" ? a : b;
        const setValue = side === "A" ? setA : setB;
        const field = side === "A" ? "option_a_image" : "option_b_image";
        return (
          <div key={side} className="flex items-center gap-2">
            <span className="text-goldleaf-300 text-xs w-4">{side}</span>
            {value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                className="w-9 h-9 object-cover rounded border border-goldleaf-500/40"
              />
            )}
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (side === "A" ? question.option_a_image ?? "" : question.option_b_image ?? "")) {
                  save(field, v);
                }
              }}
              placeholder="画像URL（例: /questions/q2_a.png または https://…）"
              className="flex-1 min-w-0 bg-black/40 border border-goldleaf-500/40 rounded px-2 py-1 text-goldleaf-100 text-xs"
            />
          </div>
        );
      })}
    </div>
  );
}

function AddQuestionForm({ onCreated }: { onCreated: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aLabel, setALabel] = useState("");
  const [bLabel, setBLabel] = useState("");
  const [aImage, setAImage] = useState("");
  const [bImage, setBImage] = useState("");
  const [correct, setCorrect] = useState<"A" | "B">("A");
  const [commentary, setCommentary] = useState("");
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          option_a_label: aLabel,
          option_a_image: aImage || null,
          option_b_label: bLabel,
          option_b_image: bImage || null,
          correct_option: correct,
          commentary: commentary || null,
          timer_seconds: timerSeconds,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "追加に失敗しました");
      setTitle("");
      setDescription("");
      setALabel("");
      setBLabel("");
      setAImage("");
      setBImage("");
      setCommentary("");
      setCorrect("A");
      await onCreated();
      setOpen(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 px-4 py-2 rounded border border-goldleaf-500/60 text-goldleaf-200 hover:bg-goldleaf-500/10"
      >
        ＋ 新しい問題を追加
      </button>
    );
  }

  const input =
    "w-full rounded bg-black/40 border border-goldleaf-500/50 text-goldleaf-100 px-3 py-2 focus:outline-none focus:border-goldleaf-300";

  return (
    <form onSubmit={submit} className="mt-4 border border-goldleaf-500/40 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-goldleaf-200">新しい問題</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-goldleaf-300 text-sm hover:underline"
        >
          キャンセル
        </button>
      </div>
      <div>
        <label className="text-goldleaf-200 text-sm">タイトル（必須）</label>
        <input
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          placeholder="例：第〇問：高級和牛はどちら？"
        />
      </div>
      <div>
        <label className="text-goldleaf-200 text-sm">補足説明</label>
        <input
          className={input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-goldleaf-200 text-sm">Ａの説明（必須）</label>
          <input
            className={input}
            value={aLabel}
            onChange={(e) => setALabel(e.target.value)}
            required
          />
          <label className="text-goldleaf-200 text-sm">Ａの画像URL（任意）</label>
          <input
            className={input}
            value={aImage}
            onChange={(e) => setAImage(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-2">
          <label className="text-goldleaf-200 text-sm">Ｂの説明（必須）</label>
          <input
            className={input}
            value={bLabel}
            onChange={(e) => setBLabel(e.target.value)}
            required
          />
          <label className="text-goldleaf-200 text-sm">Ｂの画像URL（任意）</label>
          <input
            className={input}
            value={bImage}
            onChange={(e) => setBImage(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>
      <div>
        <label className="text-goldleaf-200 text-sm mr-4">正解</label>
        <label className="text-goldleaf-100 mr-4">
          <input
            type="radio"
            name="correct"
            checked={correct === "A"}
            onChange={() => setCorrect("A")}
            className="mr-1 accent-goldleaf-400"
          />
          Ａ
        </label>
        <label className="text-goldleaf-100">
          <input
            type="radio"
            name="correct"
            checked={correct === "B"}
            onChange={() => setCorrect("B")}
            className="mr-1 accent-goldleaf-400"
          />
          Ｂ
        </label>
      </div>
      <div>
        <label className="text-goldleaf-200 text-sm">解説（正解発表時に表示）</label>
        <input
          className={input}
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          maxLength={200}
        />
      </div>
      <div>
        <label className="text-goldleaf-200 text-sm">制限時間（秒）</label>
        <input
          type="number"
          min={5}
          max={300}
          step={5}
          className={input}
          value={timerSeconds}
          onChange={(e) =>
            setTimerSeconds(Math.max(5, Math.min(300, Number(e.target.value) || 30)))
          }
        />
      </div>
      {err && (
        <div className="text-red-200 text-sm bg-red-900/40 border border-red-500/40 rounded p-2">
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2 rounded border-2 border-goldleaf-400 bg-goldleaf-500/20 hover:bg-goldleaf-500/30 text-goldleaf-100 disabled:opacity-40"
      >
        {saving ? "追加中…" : "この問題を追加する"}
      </button>
    </form>
  );
}
