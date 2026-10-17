import { core30ScopeKey } from "@/lib/core30-scope";
// Built by TAC — 2026-10-15
import { useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useApp } from "@/state/app-state";
import { cn } from "@/lib/utils";
import { getModule } from "@/data/modules";
import type { Lesson, LessonWord } from "@/data/curriculum";
import { pickAuthoredWords, readCachedLessonWords } from "@/lib/lesson-words-core";
import { previouslyMasteredLessons } from "@/lib/core30-plan";

const WORDS_PER_LESSON = 5;

interface ReviewWord {
  /** Shown first. Spanish when the lesson has authored words, else the module term. */
  front: string;
  /** Revealed on tap. Absent for module terms, which only carry one language. */
  back?: string;
}

/** Lower-case, accent-free parts of a word, split on " / " alternatives. */
function wordParts(text: string): string[] {
  return text
    .split(" / ")
    .map((p) =>
      p
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

/** Up to 5 words per lesson, terms before phrases. The window slides each review so a lesson
 *  is not always checked on the same words. `seen` holds every target-language part already shown
 *  in this session; a word sharing any part with it is skipped and the next unshown word is used
 *  instead. `words` is the lesson's authored or already-generated list (empty = use the module's
 *  vocabulary focus). */
function reviewWordsFor(
  words: readonly LessonWord[],
  fallbackTerms: string[],
  reviewsSoFar: number,
  seen: Set<string>,
): ReviewWord[] {
  let candidates: ReviewWord[];
  if (words.length > 0) {
    const ordered = [
      ...words.filter((w) => w.kind === "term"),
      ...words.filter((w) => w.kind !== "term"),
    ];
    const start = (reviewsSoFar * WORDS_PER_LESSON) % ordered.length;
    candidates = ordered.map((_, i) => {
      const w = ordered[(start + i) % ordered.length];
      return { front: w.es, back: w.en };
    });
  } else {
    const start = fallbackTerms.length
      ? (reviewsSoFar * WORDS_PER_LESSON) % fallbackTerms.length
      : 0;
    candidates = fallbackTerms.map((_, i) => ({
      front: fallbackTerms[(start + i) % fallbackTerms.length],
    }));
  }
  const picked: ReviewWord[] = [];
  for (const c of candidates) {
    if (picked.length >= WORDS_PER_LESSON) break;
    const parts = wordParts(c.front);
    if (parts.some((p) => seen.has(p))) continue;
    parts.forEach((p) => seen.add(p));
    picked.push(c);
  }
  return picked;
}

export function Core30Review({
  enrollmentId,
  moduleId,
  lessons,
  onClose,
}: {
  enrollmentId?: string;
  moduleId: string;
  lessons: Lesson[];
  onClose: () => void;
}) {
  const { state, dispatch } = useApp();
  const context = {
    targetLanguage: state.selectedLanguage,
    instructionLanguage: state.nativeLanguage,
    enrollmentId,
  };
  const progressKey = core30ScopeKey(moduleId, context);
  const log = state.core30Log[progressKey];
  const fallbackTerms = useMemo(() => getModule(moduleId)?.vocabFocus ?? [], [moduleId]);

  // Fixed for the whole session so the list does not reshuffle while the learner works.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return previouslyMasteredLessons(log)
      .map((n) => lessons.find((l) => l.n === n))
      .filter((l): l is Lesson => !!l)
      .map((lesson) => ({
        lesson,
        words: reviewWordsFor(
          // Authored (Spanish) first, else the list generated earlier for this language pair.
          // Read-only: review never calls the network, so an unvisited lesson uses vocabFocus.
          pickAuthoredWords(lesson.words, state.selectedLanguage, state.nativeLanguage) ??
            readCachedLessonWords(
              moduleId,
              lesson.n,
              state.selectedLanguage,
              state.nativeLanguage,
            ) ??
            [],
          fallbackTerms,
          log?.lessons?.[String(lesson.n)]?.reviews?.length ?? 0,
          seen,
        ),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);

  const answered = items.filter((it) => results[it.lesson.n] !== undefined).length;
  const allAnswered = items.length > 0 && answered === items.length;

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function finish() {
    if (!allAnswered) return;
    dispatch({
      type: "CORE30_RECORD_REVIEW",
      payload: {
        moduleId,
        context,
        at: new Date().toISOString(),
        results: items.map((it) => ({ lesson: it.lesson.n, ok: results[it.lesson.n] === true })),
      },
    });
    setFinished(true);
  }

  if (finished) {
    const stillOk = items.filter((it) => results[it.lesson.n] === true);
    const needs = items.filter((it) => results[it.lesson.n] === false);
    return (
      <div
        data-testid="core30-review"
        className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-5"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
          Review complete
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">
          {stillOk.length} of {items.length} lessons still mastered
        </h3>
        {needs.length > 0 ? (
          <p className="mt-2 text-sm text-amber-300">
            Practice again: {needs.map((it) => `Lesson ${it.lesson.n}`).join(", ")}. They stay on
            your list until you mark them mastered again.
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/60">
            Everything held. Your plan shows the next review.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-11 w-full rounded-xl px-4 text-sm font-semibold hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
            color: "#0B0B0F",
          }}
        >
          Back to Core 30
        </button>
      </div>
    );
  }

  return (
    <div data-testid="core30-review" className="space-y-4">
      <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
              Review · {items.length} mastered lesson{items.length === 1 ? "" : "s"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Quick check</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Say each word, tap it to check the meaning, then mark the lesson Still mastered or
              Needs practice.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/40 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="rounded-xl border border-white/[0.08] bg-card/40 p-4 text-sm text-white/60">
          No mastered lessons yet. Mark a lesson mastered and it will appear here.
        </p>
      )}

      {items.map(({ lesson, words }) => {
        const result = results[lesson.n];
        return (
          <section
            key={lesson.n}
            className={cn(
              "rounded-xl border p-4",
              result === true
                ? "border-gold/30 bg-gold/[0.05]"
                : result === false
                  ? "border-amber-400/40 bg-amber-400/[0.05]"
                  : "border-white/[0.08] bg-card/40",
            )}
          >
            <h4 className="text-sm font-semibold text-white">
              Lesson {lesson.n} — {lesson.title}
            </h4>
            {words.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {words.map((w) => {
                  const key = `${lesson.n}:${w.front}`;
                  const open = revealed.has(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => w.back && toggleReveal(key)}
                        aria-expanded={w.back ? open : undefined}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-left"
                      >
                        <span className="text-sm text-white">{w.front}</span>
                        <span className={cn("text-xs", open ? "text-gold" : "text-white/30")}>
                          {w.back ? (open ? w.back : "Tap to reveal") : "Say it aloud"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/50">
                Recall the key words from this lesson out loud.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResults((r) => ({ ...r, [lesson.n]: true }))}
                aria-pressed={result === true}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold",
                  result === true
                    ? "border-gold bg-gold/20 text-gold"
                    : "border-white/15 text-white/70 hover:border-gold/40",
                )}
              >
                {result === true && <CheckCircle2 className="h-3.5 w-3.5" />}
                Still mastered
              </button>
              <button
                type="button"
                onClick={() => setResults((r) => ({ ...r, [lesson.n]: false }))}
                aria-pressed={result === false}
                className={cn(
                  "min-h-11 rounded-lg border px-3 text-xs font-semibold",
                  result === false
                    ? "border-amber-400 bg-amber-400/20 text-amber-200"
                    : "border-white/15 text-white/70 hover:border-amber-400/40",
                )}
              >
                Needs practice
              </button>
            </div>
          </section>
        );
      })}

      {items.length > 0 && (
        <button
          type="button"
          data-testid="core30-review-finish"
          onClick={finish}
          disabled={!allAnswered}
          className="min-h-12 w-full rounded-2xl px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
            color: "#0B0B0F",
          }}
        >
          {allAnswered
            ? "Finish review"
            : `Mark every lesson to finish · ${answered}/${items.length}`}
        </button>
      )}
    </div>
  );
}
