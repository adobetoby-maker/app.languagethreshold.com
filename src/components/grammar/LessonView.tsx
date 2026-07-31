import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, BookOpen, Sparkles, ArrowLeft } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useGrammar, type CefrLevel } from "@/state/grammar-state";
import {
  generateLessonContent,
  type LessonStub,
  type LessonContent,
} from "@/fns/grammar.functions";
import { ClickableText } from "@/components/reader/ClickableText";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { QuizCard } from "./QuizCard";
import { MorphologyCard } from "./MorphologyCard";
import { resolveNextStep, nextCefrLevel, isLevelComplete, CEFR_ORDER } from "@/lib/grammar-flow";

const LEVEL_LABEL: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Mastery",
};

export function LessonView({
  level,
  lesson,
  onBack,
  onSelectLesson,
  onStartNextLevel,
}: {
  level: CefrLevel;
  lesson: LessonStub;
  /** Returns to the curriculum list. Mobile-only affordance; also used by the
   *  completion panel on both breakpoints. */
  onBack?: () => void;
  /** Opens another lesson, REPLACING the history entry so Back still returns
   *  straight to the curriculum. */
  onSelectLesson?: (level: CefrLevel, lesson: LessonStub) => void;
  /** Closes the lesson and expands the named CEFR level in the curriculum. */
  onStartNextLevel?: (level: CefrLevel) => void;
}) {
  const { state, dispatch } = useApp();
  const { getLevel, setContent } = useGrammar();
  const genContent = useServerFn(generateLessonContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);
  const [finished, setFinished] = useState(false);

  // Finding 2: reset completion state when the desktop sidebar selects a
  // different lesson. The same LessonView instance is reused, so local state
  // from a completed lesson would otherwise persist into the new one.
  useEffect(() => {
    setFinished(false);
  }, [lesson.id]);

  const lvl = getLevel(state.selectedLanguage, level);
  const content: LessonContent | undefined = lvl?.contents[lesson.id];
  const isComplete = !!lvl?.completed[lesson.id];

  // Finding 3: truthful copy for the course-complete panel. course-complete
  // fires when all C2 lessons are done, but A1-C1 may still be outstanding.
  const allLevelsComplete = CEFR_ORDER.every((lvl) => {
    const l = getLevel(state.selectedLanguage, lvl);
    if (!l || l.lessons.length === 0) return false;
    return isLevelComplete(
      l.lessons.map((ls) => ls.id),
      l.completed,
    );
  });

  useEffect(() => {
    if (content) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await genContent({
          data: {
            language: state.selectedLanguage,
            level,
            concept: lesson.concept,
            nativeLanguage: state.nativeLanguage,
          },
        });
        if (cancelled) return;
        if (res.data) setContent(state.selectedLanguage, level, lesson.id, res.data);
        else if (res.error) setError(res.error);
      } catch {
        if (!cancelled) setError("Failed to load lesson.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, state.selectedLanguage, level]);

  const handleWord = (word: string, sentence: string, x: number, y: number) => {
    setWordReq({ word, sentence, language: state.selectedLanguage, x, y });
  };

  const lessonIds = (lvl?.lessons ?? []).map((l) => l.id);
  const completedMap = lvl?.completed ?? {};
  const nextStep = resolveNextStep(level, lessonIds, lesson.id, completedMap);

  const openLesson = (id: string) => {
    const stub = (lvl?.lessons ?? []).find((l) => l.id === id);
    if (stub && onSelectLesson) {
      setFinished(false);
      onSelectLesson(level, stub);
    }
  };

  return (
    <div className="fade-in min-w-0 flex-1">
      {/* Mobile back control. Rendered ABOVE the card so it is present in every
          state — loading, error, content and completion alike. Hidden on
          desktop, where the curriculum is already visible beside the lesson. */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-gold md:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to {level}
        </button>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/40 p-7 shadow-luxe backdrop-blur">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              <BookOpen className="h-3 w-3" />
              {level} · {LEVEL_LABEL[level]}
            </div>
            <h2 className="font-display text-3xl text-foreground">{lesson.title}</h2>
            <p className="mt-1 font-display text-sm italic text-muted-foreground">
              {lesson.concept}
            </p>
          </div>
          {isComplete && (
            <span className="rounded-full bg-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight">
              ✓ Completed
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-gold/10" />
            <div className="h-4 w-full animate-pulse rounded bg-gold/10" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gold/10" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-gold/10" />
            <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-gold" />
              Composing your lesson…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        {content && !loading && (
          <>
            <p className="mb-7 whitespace-pre-wrap font-display text-[16px] leading-[1.85] text-foreground/90">
              {content.explanation}
            </p>

            <div className="mb-7 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                ✦ Key Rule
              </div>
              <p className="font-display text-[15px] font-semibold italic text-foreground">
                {content.keyRule}
              </p>
            </div>

            {content.morphology && <MorphologyCard morph={content.morphology} />}

            <div className="mb-7">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Examples · click any word
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="border-b border-border/50 bg-card/60 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gold md:border-b md:border-r">
                    Target
                  </div>
                  <div className="hidden border-b border-border/50 bg-card/60 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground md:block">
                    {state.nativeLanguage}
                  </div>
                  {content.examples.map((ex, i) => (
                    <div key={i} className="contents">
                      <div
                        className={`border-b border-border/40 px-5 py-4 font-display text-[16px] leading-relaxed text-foreground md:border-r ${state.selectedLanguage === "Japanese" ? "furigana-line" : ""}`}
                      >
                        {state.selectedLanguage === "Japanese" ? (
                          <FuriganaText text={ex.target} onWordClick={handleWord} />
                        ) : (
                          <ClickableText text={ex.target} onWordClick={handleWord} />
                        )}
                      </div>
                      <div className="border-b border-border/40 px-5 py-4 font-display text-[15px] italic leading-relaxed text-muted-foreground">
                        {ex.english}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5">
              <p className="font-display text-sm italic text-muted-foreground">
                Ready to test what you’ve learned?
              </p>
              <button
                onClick={() => setShowQuiz(true)}
                className="rounded-full bg-gold px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-midnight transition-opacity hover:opacity-90"
              >
                Begin Quiz →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Completion panel — DUO-003 synthesis items 4, 6, 7.
          Explicit actions, never a timed auto-advance: the score, +50 XP and any
          badge are the only feedback beat in this surface, and advancing
          automatically would destroy it. Only shown once the lesson is actually
          recorded complete, so a non-perfect quiz never offers "Next lesson". */}
      {finished && isComplete && (
        <div className="mt-4 rounded-2xl border border-gold/35 bg-gold/[0.06] p-5">
          {nextStep.kind === "next-lesson" && (
            <>
              <p className="font-display text-lg italic text-foreground">Lesson complete</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openLesson(nextStep.lessonId)}
                  className="min-h-11 w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-midnight transition-transform hover:-translate-y-0.5"
                >
                  Next lesson →
                </button>
                <button
                  type="button"
                  onClick={() => setFinished(false)}
                  className="min-h-11 w-full rounded-xl border border-border/60 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-gold/50"
                >
                  Review lesson
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="min-h-11 w-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-gold"
                  >
                    Back to Grammar
                  </button>
                )}
              </div>
            </>
          )}

          {nextStep.kind === "level-complete" && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                {level} complete
              </p>
              <p className="mt-1 font-display text-lg italic text-foreground">
                {lessonIds.length} of {lessonIds.length} lessons
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {/* Finding 1: call onStartNextLevel so the named level is
                    actually opened in the curriculum, not just onBack which
                    returns to a collapsed list with no level selected. */}
                <button
                  type="button"
                  onClick={() => onStartNextLevel?.(nextStep.nextLevel)}
                  className="min-h-11 w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-midnight transition-transform hover:-translate-y-0.5"
                >
                  Start {nextStep.nextLevel} →
                </button>
                <button
                  type="button"
                  onClick={() => setFinished(false)}
                  className="min-h-11 w-full rounded-xl border border-border/60 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-gold/50"
                >
                  Review lesson
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="min-h-11 w-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-gold"
                  >
                    Back to Grammar
                  </button>
                )}
              </div>
            </>
          )}

          {/* C2: no fabricated next level. */}
          {nextStep.kind === "course-complete" && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                {allLevelsComplete ? "Grammar path complete" : "C2 complete"}
              </p>
              {/* Finding 3: only claim every level is finished when they
                  actually are — completing C2 alone does not finish A1-C1. */}
              <p className="mt-1 font-display text-lg italic text-foreground">
                {allLevelsComplete
                  ? "You have finished every CEFR level."
                  : "C2 complete — explore other levels to finish the full course."}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="min-h-11 w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-midnight"
                  >
                    Back to Grammar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFinished(false)}
                  className="min-h-11 w-full rounded-xl border border-border/60 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-gold/50"
                >
                  Review lesson
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showQuiz && content && (
        <QuizCard
          level={level}
          lesson={lesson}
          onClose={() => setShowQuiz(false)}
          onExitToCurriculum={
            onBack
              ? () => {
                  setShowQuiz(false);
                  onBack();
                }
              : undefined
          }
          onComplete={() => {
            // Previously this only closed the quiz, returning the learner to the
            // lesson they had just finished — a dead end. Now it surfaces the
            // next step. DUO-003.
            setShowQuiz(false);
            setFinished(true);
          }}
        />
      )}

      {wordReq && (
        <WordCard
          request={wordReq}
          onClose={() => setWordReq(null)}
          onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
        />
      )}
    </div>
  );
}
