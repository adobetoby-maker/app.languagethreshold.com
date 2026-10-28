import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Loader2, Map, RotateCcw, Sparkles, X } from "lucide-react";
import type { LessonWord } from "@/data/curriculum";
import type { LessonVerb } from "@/lib/lesson-content-core";
import { core60FocusModes, core60LessonWindow } from "@/lib/core60-focus";
import { cn } from "@/lib/utils";
import { LessonPracticeKit, type PracticeMode } from "./LessonPracticeKit";

const MODE_LABELS: Record<PracticeMode, string> = {
  study: "Study",
  flashcards: "Cards",
  match: "Match",
  verbs: "Verbs",
  listen: "Listen",
  type: "Type",
  write: "Write",
};

interface Core60FocusFlowProps {
  lessonNumber: number;
  totalLessons: number;
  title: string;
  objective: string;
  moduleId: string;
  language: string;
  nativeLanguage: string;
  words: LessonWord[];
  verbs?: LessonVerb[];
  matchingBatchSize?: number;
  listeningItems?: LessonWord[];
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onExit: () => void;
  onFinish: () => Promise<boolean>;
  onNext: () => void;
}

type FocusView = "practice" | "map" | "checkpoint" | "complete";

export function Core60FocusFlow({
  lessonNumber,
  totalLessons,
  title,
  objective,
  moduleId,
  language,
  nativeLanguage,
  words,
  verbs,
  matchingBatchSize,
  listeningItems,
  loading,
  error,
  onRetry,
  onExit,
  onFinish,
  onNext,
}: Core60FocusFlowProps) {
  const modes = useMemo(() => core60FocusModes(words), [words]);
  const [stepIndex, setStepIndex] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [view, setView] = useState<FocusView>("practice");
  const [advancing, setAdvancing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapReturnView = useRef<Exclude<FocusView, "map">>("practice");
  const mode = modes[Math.min(stepIndex, Math.max(0, modes.length - 1))];
  const lessonMap = useMemo(
    () => core60LessonWindow(lessonNumber, totalLessons),
    [lessonNumber, totalLessons],
  );

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const restartLesson = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setStepIndex(0);
    setRunKey((value) => value + 1);
    setAdvancing(false);
    setView("practice");
  };

  const restartGame = () => setRunKey((value) => value + 1);

  const toggleMap = () => {
    if (view === "map") {
      setView(mapReturnView.current);
      return;
    }
    mapReturnView.current = view;
    setView("map");
  };

  const completeMode = () => {
    if (advancing) return;
    setAdvancing(true);
    advanceTimer.current = setTimeout(() => {
      if (stepIndex + 1 < modes.length) {
        setStepIndex((value) => value + 1);
        setRunKey((value) => value + 1);
        setAdvancing(false);
      } else {
        setView("checkpoint");
        setAdvancing(false);
      }
    }, 650);
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    const saved = await onFinish();
    setFinishing(false);
    if (saved) setView("complete");
  };

  return (
    <section
      data-testid="core60-focus-flow"
      aria-label={`Focus lesson ${lessonNumber}`}
      className="fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      style={{
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      <header className="mx-auto w-full max-w-md shrink-0 px-3">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_88px] items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit focus lesson"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-semibold text-gold">Lesson {lessonNumber}</p>
            <h1 className="truncate text-sm font-bold">{title}</h1>
          </div>
          <button
            type="button"
            onClick={toggleMap}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-semibold"
          >
            <Map className="h-4 w-4 text-gold" aria-hidden="true" />
            Map
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5" aria-label="Lesson game progress">
          {modes.map((item, index) => (
            <div
              key={item}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                index < stepIndex || view === "checkpoint" || view === "complete"
                  ? "bg-gold"
                  : index === stepIndex
                    ? "bg-gold/70"
                    : "bg-border",
              )}
            />
          ))}
          <div
            className={cn(
              "h-1.5 flex-1 rounded-full",
              view === "complete" ? "bg-gold" : "bg-border",
            )}
          />
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-3 py-3">
        {view === "map" ? (
          <div className="flex h-full flex-col justify-center rounded-3xl border border-gold/20 bg-card/60 p-5">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-gold">
              Core 60 road map
            </p>
            <div
              className="my-6 flex items-center justify-center gap-2"
              aria-label="Nearby lessons"
            >
              {lessonMap.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div
                    aria-current={item === lessonNumber ? "step" : undefined}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold",
                      item < lessonNumber && "border-gold/50 bg-gold/10 text-gold",
                      item === lessonNumber && "scale-110 border-gold bg-gold text-background",
                      item > lessonNumber && "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {item < lessonNumber ? <Check className="h-4 w-4" aria-hidden="true" /> : item}
                  </div>
                  {item !== lessonMap.at(-1) ? <div className="h-px w-2 bg-border" /> : null}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {mapReturnView.current === "complete"
                ? "Lesson saved."
                : `Game ${stepIndex + 1} of ${modes.length}`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={restartLesson}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border font-semibold"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Restart lesson
              </button>
              <button
                type="button"
                onClick={toggleMap}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold font-semibold text-background"
              >
                {mapReturnView.current === "complete" ? "Back to checkpoint" : "Resume"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : view === "checkpoint" ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-gold/25 bg-card/60 p-6 text-center">
            <Sparkles className="h-10 w-10 text-gold" aria-hidden="true" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gold">
              Lesson checkpoint
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Ready to keep this lesson?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{objective}</p>
            <button
              type="button"
              onClick={() => void finish()}
              disabled={finishing}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 font-bold text-background disabled:opacity-60"
            >
              {finishing ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-5 w-5" aria-hidden="true" />
              )}
              I&apos;ve got it
            </button>
            <button
              type="button"
              onClick={restartLesson}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border font-semibold"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Practice again
            </button>
          </div>
        ) : view === "complete" ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-gold/30 bg-gold/[0.08] p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-background">
              <Check className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gold">
              Checkpoint reached · +50 XP
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              Lesson {lessonNumber} complete
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your progress is saved. This is a good place to stop.
            </p>
            {lessonNumber < totalLessons ? (
              <button
                type="button"
                onClick={onNext}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-background"
              >
                Start lesson {lessonNumber + 1}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onExit}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border font-semibold"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Return to road map
            </button>
          </div>
        ) : loading ? (
          <div
            className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading this lesson…
          </div>
        ) : error && words.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-border p-6 text-center">
            <p className="font-semibold">This lesson could not load.</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 min-h-11 rounded-xl bg-gold px-5 font-bold text-background"
            >
              Try again
            </button>
          </div>
        ) : mode ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gold">
                  Game {stepIndex + 1} of {modes.length}
                </p>
                <h2 className="text-lg font-bold">{MODE_LABELS[mode]}</h2>
              </div>
              <button
                type="button"
                onClick={restartGame}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Restart
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/30 p-3">
              <LessonPracticeKit
                key={`${mode}:${runKey}`}
                words={words}
                moduleId={moduleId}
                lessonNumber={lessonNumber}
                mode={mode}
                language={language}
                nativeLanguage={nativeLanguage}
                matchingBatchSize={Math.min(matchingBatchSize ?? 4, 4)}
                listeningItems={listeningItems}
                verbs={verbs}
                focusMode
                onModeComplete={completeMode}
              />
            </div>
            <p
              className={cn(
                "h-6 shrink-0 pt-2 text-center text-xs font-semibold text-gold transition-opacity",
                advancing ? "opacity-100" : "opacity-0",
              )}
              aria-live="polite"
            >
              Nice work — next game…
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
