import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Sparkles, RefreshCw, Check, X, BookOpen, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useApp, type UserVocabItem, VOCAB_MASTERY_THRESHOLD } from "@/state/app-state";
import { buildPersonalVocab, VOCAB_QUESTIONS } from "@/fns/build-vocab.functions";

const REFILL_BELOW = 10; // auto-fetch more words when active pool drops below this

const CATEGORY_LABELS: Record<string, string> = {
  job: "Work",
  hobby: "Hobbies",
  family: "Family",
  place: "Location",
  topic: "Topics",
};
const CATEGORY_COLORS: Record<string, string> = {
  job: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  hobby: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  family: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  place: "bg-green-500/10 text-green-400 border-green-500/20",
  topic: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function VocabBuilder({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useApp();
  const generate = useServerFn(buildPersonalVocab);

  const isStale = state.vocabLang !== null && state.vocabLang !== state.selectedLanguage;
  const hasVocab = state.userVocab.length > 0 && !isStale;

  // ── Question flow ──────────────────────────────────────────────────────
  const [step, setStep] = useState<"questions" | "review" | "done">(
    hasVocab ? "done" : "questions",
  );
  const [answers, setAnswers] = useState<string[]>(
    state.vocabAnswers.length > 0 ? state.vocabAnswers : Array(VOCAB_QUESTIONS.length).fill(""),
  );
  const [qIndex, setQIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<UserVocabItem[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const currentAnswer = answers[qIndex] ?? "";
  const setAnswer = (val: string) => {
    const next = [...answers];
    next[qIndex] = val;
    setAnswers(next);
  };

  const canAdvance = currentAnswer.trim().length >= 2;
  const isLastQuestion = qIndex === VOCAB_QUESTIONS.length - 1;

  const handleNext = async () => {
    if (!canAdvance) return;
    if (!isLastQuestion) {
      setQIndex(qIndex + 1);
      return;
    }
    // All questions answered — generate vocab
    setLoading(true);
    try {
      const res = await generate({
        data: { language: state.selectedLanguage, answers: answers.filter(Boolean) },
      });
      if (res.error || !res.vocab) {
        toast.error(res.error ?? "Could not generate vocabulary");
      } else {
        setDraft(res.vocab);
        setRemoved(new Set());
        setStep("review");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const kept = draft.filter((_, i) => !removed.has(i));
    dispatch({
      type: "SET_USER_VOCAB",
      payload: { answers, vocab: kept, lang: state.selectedLanguage },
    });
    setStep("done");
    toast.success(`${kept.length} words saved to your profile!`);
  };

  const toggleRemove = (i: number) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // ── Done / existing vocab view ─────────────────────────────────────────
  if (step === "done" || (hasVocab && step === "questions" && state.vocabAnswers.length > 0)) {
    const activeVocab = state.userVocab.filter(
      (v) => (v.correctCount ?? 0) < VOCAB_MASTERY_THRESHOLD,
    );
    const masteredVocab = state.userVocab.filter(
      (v) => (v.correctCount ?? 0) >= VOCAB_MASTERY_THRESHOLD,
    );

    // Auto-refill: if active pool drops below threshold and we have Q&A, fetch more silently.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const refillRef = useRef(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (refillRef.current) return;
      if (activeVocab.length >= REFILL_BELOW) return;
      if (!state.vocabAnswers.length || state.vocabLang !== state.selectedLanguage) return;
      refillRef.current = true;
      const avoidWords = state.userVocab.map((v) => v.word);
      generate({
        data: {
          language: state.selectedLanguage,
          answers: state.vocabAnswers,
          avoid: avoidWords,
          count: 15,
        },
      })
        .then((res) => {
          if (res.vocab && res.vocab.length > 0) {
            dispatch({
              type: "ADD_VOCAB_ITEMS",
              payload: { items: res.vocab, lang: state.selectedLanguage },
            });
            toast.success(`${res.vocab.length} new words added to keep you growing!`);
          }
        })
        .catch(() => {
          /* silent */
        });
      // Only run once when active pool is low
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVocab.length]);

    const byCategory = activeVocab.reduce<Record<string, UserVocabItem[]>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});

    return (
      <div className="fade-in space-y-6 py-2">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              ← Back
            </button>
            <h2 className="font-display text-xl font-semibold">My Vocab</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeVocab.length} active · {masteredVocab.length} mastered ·{" "}
              {state.selectedLanguage}
            </p>
          </div>
          <button
            onClick={() => {
              setStep("questions");
              setQIndex(0);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Rebuild
          </button>
        </div>

        {isStale && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
            Your vocab was built for {state.vocabLang}. Rebuild it for {state.selectedLanguage}.
          </div>
        )}

        {/* Mastery progress bar */}
        {state.userVocab.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card/20 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Mastery progress</span>
              <span className="font-mono text-gold">
                {masteredVocab.length} / {state.userVocab.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{
                  width: `${state.userVocab.length ? (masteredVocab.length / state.userVocab.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/50">
              Words leave the active pool after {VOCAB_MASTERY_THRESHOLD} correct matches and are
              replaced with new ones.
            </p>
          </div>
        )}

        {/* Regression check — shown when ≥5 words are mastered */}
        {masteredVocab.length >= VOCAB_MASTERY_THRESHOLD && (
          <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">
                  Regression Check
                </p>
                <p className="text-sm font-semibold">Don't let mastered words fade</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {masteredVocab.length} mastered words re-enter the active pool and need 2 more
                  correct matches to stay locked in. Play a Word Match round to complete the check.
                </p>
              </div>
              <button
                onClick={() => {
                  dispatch({ type: "START_REGRESSION_CHECK" });
                  toast.success(`${masteredVocab.length} words re-activated for review!`);
                }}
                className="shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
              >
                Start →
              </button>
            </div>
          </div>
        )}

        {/* Active words by category */}
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 mb-2 px-1">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((item, i) => {
                const count = item.correctCount ?? 0;
                const colorClass =
                  CATEGORY_COLORS[item.category] ?? "border-border/40 bg-card/40 text-foreground";
                return (
                  <div key={i} className={`rounded-xl border px-3 py-2.5 ${colorClass}`}>
                    <p className="font-semibold text-sm leading-snug">{item.word}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{item.translation}</p>
                    {/* Mini progress pips */}
                    <div className="flex gap-0.5 mt-1.5">
                      {Array.from({ length: VOCAB_MASTERY_THRESHOLD }).map((_, j) => (
                        <div
                          key={j}
                          className={`h-1 w-1 rounded-full ${j < count ? "bg-current opacity-80" : "bg-current opacity-20"}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Mastered words (collapsed by default) */}
        {masteredVocab.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <Trophy className="h-3 w-3 text-gold/60" strokeWidth={1.6} />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/60">
                Mastered
              </p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {masteredVocab.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-green-500/20 bg-green-500/5 px-2.5 py-2"
                >
                  <p className="text-xs font-medium text-green-400/80 leading-snug">{item.word}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">
                    {item.translation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Review drafts ──────────────────────────────────────────────────────
  if (step === "review") {
    const kept = draft.length - removed.size;
    return (
      <div className="fade-in space-y-5 py-2">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            ← Back
          </button>
          <h2 className="font-display text-xl font-semibold">Review your vocab</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap any word to remove it. {kept} words will be saved.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {draft.map((item, i) => {
            const isRemoved = removed.has(i);
            const colorClass =
              CATEGORY_COLORS[item.category] ?? "border-border/40 bg-card/40 text-foreground";
            return (
              <button
                key={i}
                onClick={() => toggleRemove(i)}
                className={`relative rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isRemoved ? "opacity-30 grayscale" : colorClass
                }`}
              >
                {isRemoved && (
                  <span className="absolute top-1.5 right-1.5">
                    <X className="h-3 w-3" />
                  </span>
                )}
                <p className="font-semibold text-sm leading-snug pr-4">{item.word}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{item.translation}</p>
                <p className="text-[9px] uppercase tracking-wider opacity-50 mt-1">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          className="w-full rounded-full bg-gold py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          <Check className="inline h-4 w-4 mr-1.5" />
          Save {kept} words to my profile
        </button>
      </div>
    );
  }

  // ── Question flow ──────────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-6 py-2">
      <div>
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-gold" strokeWidth={1.4} />
          <h2 className="font-display text-xl font-semibold">Build My Vocab</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Answer {VOCAB_QUESTIONS.length} quick questions. We'll build you a word list in{" "}
          {state.selectedLanguage} that actually matches your life.
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {VOCAB_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < qIndex ? "bg-green-500/60" : i === qIndex ? "bg-gold" : "bg-border/40"
            }`}
          />
        ))}
      </div>

      {/* Current question */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Question {qIndex + 1} of {VOCAB_QUESTIONS.length}
        </p>
        <p className="text-base font-semibold">{VOCAB_QUESTIONS[qIndex]}</p>
        <textarea
          value={currentAnswer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canAdvance) {
              e.preventDefault();
              void handleNext();
            }
          }}
          placeholder={
            [
              "e.g. orthopedic surgeon, nurse, teacher, contractor",
              "e.g. Twin Falls, Idaho, USA",
              "e.g. golf, reading, hiking, cooking",
              "e.g. married with 2 kids, 3 siblings",
              "e.g. medicine, travel, work meetings, cooking",
            ][qIndex]
          }
          rows={3}
          className="w-full resize-none rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
          autoFocus
        />
      </div>

      {/* Answers so far */}
      {qIndex > 0 && (
        <div className="space-y-1.5">
          {answers
            .slice(0, qIndex)
            .filter(Boolean)
            .map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-muted-foreground/50 shrink-0 pt-0.5">Q{i + 1}</span>
                <span className="text-muted-foreground/70 line-clamp-1">{a}</span>
                <button
                  onClick={() => setQIndex(i)}
                  className="ml-auto shrink-0 text-muted-foreground/40 hover:text-gold transition-colors"
                >
                  edit
                </button>
              </div>
            ))}
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!canAdvance || loading}
        className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" /> Building your vocab…
          </>
        ) : isLastQuestion ? (
          <>
            <Sparkles className="h-4 w-4" /> Build my vocab
          </>
        ) : (
          <>
            Next <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
