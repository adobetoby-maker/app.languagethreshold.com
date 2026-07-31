import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Loader2, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useGrammar, type CefrLevel } from "@/state/grammar-state";
import { generateLessonQuiz, type LessonStub, type QuizQuestion } from "@/fns/grammar.functions";

const BADGE_BY_LEVEL: Record<CefrLevel, string> = {
  A1: "A1 Graduate 🎓",
  A2: "A2 Graduate 🎓",
  B1: "B1 Graduate 🎓",
  B2: "B2 Graduate 🎓",
  C1: "Grammar Wizard 🧙",
  C2: "Grammar Master ✦",
};

function fireConfetti() {
  const palette = ["#C9A84C", "#E8D08A", "#F5F0E8", "#FFFFFF"];
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.4 },
    colors: palette,
  });
  setTimeout(
    () =>
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
        colors: palette,
      }),
    150,
  );
  setTimeout(
    () =>
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
        colors: palette,
      }),
    150,
  );
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?¿¡«»"'()[\]]+$/g, "")
    .replace(/^[¿¡«"'([]+/g, "");
}

export function QuizCard({
  level,
  lesson,
  onClose,
  onExitToCurriculum,
  onComplete,
}: {
  level: CefrLevel;
  lesson: LessonStub;
  onClose: () => void;
  /** Leaves the quiz AND the lesson, returning to the curriculum list.
   *  DUO-003 item 9: the lesson's back control sits behind this fixed overlay,
   *  so "back at any time" needs an escape path from inside the quiet. */
  onExitToCurriculum?: () => void;
  onComplete: () => void;
}) {
  const { state, dispatch } = useApp();
  const { markComplete, addBadge, getLevel, state: gState } = useGrammar();
  const genQuiz = useServerFn(generateLessonQuiz);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await genQuiz({
          data: { language: state.selectedLanguage, concept: lesson.concept },
        });
        if (cancelled) return;
        if (res.data?.questions) setQuestions(res.data.questions);
        else if (res.error) setError(res.error);
      } catch {
        if (!cancelled) setError("Failed to load quiz.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[idx];
  const isCorrect = q ? normalize(input) === normalize(q.answer) : false;

  const submit = () => {
    if (!q || !input.trim()) return;
    if (isCorrect) setCorrectCount((c) => c + 1);
    setRevealed(true);
  };

  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setInput("");
      setRevealed(false);
    } else {
      finish();
    }
  };

  const restart = () => {
    setIdx(0);
    setInput("");
    setRevealed(false);
    setCorrectCount(0);
    setDone(false);
  };

  const finish = () => {
    setDone(true);
    if (correctCount + (revealed && isCorrect ? 0 : 0) === questions.length) {
      // Already counted, fall-through.
    }
    if (correctCount === questions.length) {
      markComplete(state.selectedLanguage, level, lesson.id);
      dispatch({ type: "INC_COUNTER", payload: "lessonsCompleted" });
      dispatch({ type: "ADD_XP", payload: 50 });
      fireConfetti();
      toast("✦ Lesson complete", { description: "+50 XP" });

      // Check level badge
      const lvl = getLevel(state.selectedLanguage, level);
      const lessons = lvl?.lessons ?? [];
      const completed = { ...(lvl?.completed ?? {}), [lesson.id]: true };
      const allDone = lessons.length > 0 && lessons.every((l) => completed[l.id]);
      if (allDone && !gState.badges.includes(BADGE_BY_LEVEL[level])) {
        addBadge(BADGE_BY_LEVEL[level]);
        dispatch({ type: "ADD_ACHIEVEMENT", payload: BADGE_BY_LEVEL[level] });
        // Also award the universal "Grammar Wizard 🧙" achievement on first full level
        if (!gState.badges.length) {
          dispatch({ type: "ADD_ACHIEVEMENT", payload: "Grammar Wizard 🧙" });
        }
        toast("🏅 Badge unlocked", { description: BADGE_BY_LEVEL[level] });
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl border border-gold/40 bg-card/95 p-7 shadow-luxe"
        style={{ animation: "cardPop 220ms cubic-bezier(.22,1,.36,1)" }}
      >
        <button
          onClick={onClose}
          aria-label="Close quiz"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-gold/10 hover:text-gold"
        >
          <X className="h-4 w-4" />
        </button>

        {/* The lesson's back arrow is behind this overlay, so the "at any time"
            requirement needs its own exit here. DUO-003 item 9.
            In normal flow, NOT absolutely positioned: an earlier version used
            `absolute left-4 top-4` and collided with the "Quiz · {level}" label
            beneath it. */}
        {onExitToCurriculum && (
          <button
            onClick={onExitToCurriculum}
            className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-gold md:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Grammar
          </button>
        )}

        <div className="mb-5 flex items-center justify-between gap-3 pr-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              ✦ Quiz · {level}
            </div>
            <h3 className="mt-1 font-display text-xl italic text-foreground">{lesson.title}</h3>
          </div>
          {!done && questions.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {idx + 1} / {questions.length}
            </span>
          )}
        </div>

        {/* Progress dots */}
        {!done && questions.length > 0 && (
          <div className="mb-6 flex gap-1.5">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < idx ? "bg-gold" : i === idx ? "bg-gold/50" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-12 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            Composing your quiz…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        {!loading && !done && q && (
          <div>
            <p className="mb-5 font-display text-lg leading-relaxed text-foreground">
              {q.question}
            </p>

            {q.type === "multiple_choice" && q.options ? (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = input === opt;
                  const correct = revealed && normalize(opt) === normalize(q.answer);
                  const wrong = revealed && selected && !correct;
                  return (
                    <button
                      key={opt}
                      disabled={revealed}
                      onClick={() => setInput(opt)}
                      data-selected={selected}
                      className={`w-full rounded-xl border px-4 py-3 text-left font-display text-[15px] transition-colors ${
                        correct
                          ? "border-gold bg-gold/15 text-foreground"
                          : wrong
                            ? "border-destructive/60 bg-destructive/10 text-foreground"
                            : selected
                              ? "border-gold/60 bg-gold/5 text-foreground"
                              : "border-border/60 hover:border-gold/40 hover:bg-gold/5"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                value={input}
                disabled={revealed}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !revealed && submit()}
                placeholder="Type your answer…"
                className="w-full rounded-xl border border-border/70 bg-background/60 px-4 py-3 font-display text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:border-gold/60 focus:outline-none"
              />
            )}

            {revealed && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 ${
                  isCorrect ? "border-gold/40 bg-gold/10" : "border-destructive/40 bg-destructive/5"
                }`}
              >
                <div
                  className={`mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] ${
                    isCorrect ? "text-gold" : "text-destructive"
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <Check className="h-3 w-3" /> Correct
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" /> Not quite — answer: {q.answer}
                    </>
                  )}
                </div>
                <p className="font-display text-sm italic text-foreground/85">{q.explanation}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {!revealed ? (
                <button
                  onClick={submit}
                  disabled={!input.trim()}
                  className="rounded-full bg-gold px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-midnight transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Submit
                </button>
              ) : (
                <button
                  onClick={next}
                  className="rounded-full bg-gold px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-midnight transition-opacity hover:opacity-90"
                >
                  {idx + 1 < questions.length ? "Next →" : "See results"}
                </button>
              )}
            </div>
          </div>
        )}

        {done && (
          <div className="text-center">
            <div className="mb-3 text-5xl">{correctCount === questions.length ? "✦" : "📖"}</div>
            <h4 className="mb-2 font-display text-2xl text-foreground">
              {correctCount} / {questions.length} correct
            </h4>
            <p className="mb-6 font-display text-sm italic text-muted-foreground">
              {correctCount === questions.length
                ? "Lesson mastered. +50 XP awarded."
                : "Almost there — review the lesson and try again."}
            </p>
            <div className="flex justify-center gap-2">
              {correctCount === questions.length ? (
                <button
                  onClick={onComplete}
                  className="rounded-full bg-gold px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-midnight hover:opacity-90"
                >
                  Continue
                </button>
              ) : (
                <>
                  <button
                    onClick={restart}
                    className="rounded-full border border-gold/50 bg-gold/5 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:bg-gold/15"
                  >
                    Try again
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-full border border-border/70 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 hover:border-gold/40"
                  >
                    Continue anyway
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!loading && !done && questions.length > 0 && (
          <div className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Score so far: {correctCount} / {questions.length}
          </div>
        )}
      </div>
    </div>
  );
}
