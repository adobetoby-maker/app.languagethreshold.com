import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Sparkle,
  Flame,
  Zap,
  Trophy,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/state/app-state";
import {
  useConjugation,
  streakBadge,
  streakBadgeLabel,
  type LeaderboardKey,
} from "@/state/conjugation-state";
import {
  generateConjugationQuestion,
  type ConjugationLevel,
  type ConjugationQuestion,
} from "@/fns/conjugation.functions";
import { ConjugationLeaderboard } from "./ConjugationLeaderboard";
import { MODULES } from "@/data/modules";
import { packConjugationFor } from "@/lib/trade-packs";

const LEVEL_LABELS: Record<ConjugationLevel, { name: string; sub: string }> = {
  1: { name: "Level 1", sub: "Single change — tense, person, or number" },
  2: { name: "Level 2", sub: "Two-axis — tense + person, etc." },
  3: { name: "Level 3", sub: "Mixed — multi-axis transformations" },
};

export function ConjugationGame() {
  const { state: app, dispatch: appDispatch } = useApp();
  const conj = useConjugation();
  const fetchQuestion = useServerFn(generateConjugationQuestion);

  const topic = useMemo(() => {
    const mod = MODULES.find((m) => m.id === app.activeModuleId);
    if (!mod) return undefined;
    return `${mod.name} (${mod.vocabFocus.slice(0, 5).join(", ")})`;
  }, [app.activeModuleId]);

  const userWords =
    app.userVocab.length > 0 && app.vocabLang === app.selectedLanguage
      ? app.userVocab.map((v) => v.word).slice(0, 20)
      : undefined;

  useEffect(() => {
    conj.setFetcher(async ({ language, level, avoid }) => {
      // Pack first (static, free, works offline), waiting for the module's pack if its fetch is
      // still in flight; the pack picks the axis at levels 1-2. A pack question wins even when
      // the learner has personal words (as in Word Match); when the pack has nothing for this
      // request, the live AI call runs.
      const packed = app.activeModuleId
        ? await packConjugationFor({
            moduleId: app.activeModuleId,
            language,
            nativeLanguage: app.nativeLanguage,
            level,
            avoid,
          })
        : null;
      const res = packed
        ? { data: packed, error: null }
        : await fetchQuestion({ data: { language, level, avoid, topic, userWords } });
      if (res.error || !res.data) throw new Error(res.error ?? "No question.");
      return res.data;
    });
    return () => conj.setFetcher(null);
  }, [conj, fetchQuestion, topic, userWords, app.activeModuleId, app.nativeLanguage]);

  const [selectedLevel, setSelectedLevel] = useState<ConjugationLevel>(1);
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const run = conj.state.run;
  const cur = conj.currentQuestion();
  const score = conj.runScore();

  // Auto-load the first question when a run starts, and load each subsequent
  // question after the user advances.
  useEffect(() => {
    if (!run) return;
    if (run.questions.length === run.index) {
      // Need to load the next question.
      void conj.loadQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.index, run?.questions.length]);

  // Shuffle answer options when a new question loads (so correct answer
  // position is unpredictable).
  useEffect(() => {
    if (!cur || cur.correct !== null) return;
    const options = [cur.question.correctConjugation, ...cur.question.wrongOptions];
    // Fisher–Yates
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    setShuffled(options);
    setShowExplanation(false);
  }, [cur?.question.phrase, cur?.correct]);

  const lbKey: LeaderboardKey = `${app.selectedLanguage}-${selectedLevel}` as LeaderboardKey;
  const stats = conj.state.leaderboard[lbKey] ?? {
    bestStreak: 0,
    currentStreak: 0,
    perfectRuns: 0,
    totalCorrect: 0,
    totalAttempts: 0,
  };
  const badge = streakBadge(stats.currentStreak);

  // ── No-run state: pick a level and start ───────────────────────────────
  if (!run) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        <LevelPicker
          language={app.selectedLanguage}
          selected={selectedLevel}
          onPick={setSelectedLevel}
          stats={stats}
          currentBadge={badge}
        />
        <button
          onClick={() => conj.startRun(app.selectedLanguage, selectedLevel)}
          className="group relative w-full overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-6 py-6 text-left transition-all hover:border-gold hover:from-gold/20"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            ▶ Start Run
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            5 questions in {app.selectedLanguage}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {LEVEL_LABELS[selectedLevel].sub}
          </div>
        </button>
        <ConjugationLeaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Run complete: show summary + leaderboard ───────────────────────────
  if (conj.isRunComplete()) {
    const allCorrect = score.correct === score.total;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-transparent p-8 text-center">
          {allCorrect ? (
            <>
              <Trophy
                className="mx-auto h-12 w-12 text-gold"
                strokeWidth={1.5}
                fill="currentColor"
              />
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
                Perfect Run
              </div>
              <div className="mt-1 font-display text-4xl font-bold">
                {score.correct} / {score.total}
              </div>
            </>
          ) : (
            <>
              <Sparkle className="mx-auto h-10 w-10 text-gold/70" strokeWidth={1.5} />
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Run Complete
              </div>
              <div className="mt-1 font-display text-4xl font-bold">
                {score.correct} / {score.total}
              </div>
            </>
          )}
          <div className="mt-3 font-mono text-xs text-muted-foreground">
            Current streak: <span className="text-foreground">{stats.currentStreak}</span> · Best:{" "}
            <span className="text-foreground">{stats.bestStreak}</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                conj.endRun();
                conj.startRun(app.selectedLanguage, selectedLevel);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run Again
            </button>
            <button
              onClick={() => conj.endRun()}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/50"
            >
              Back to Lobby
            </button>
          </div>
        </div>
        <RunReview run={run} />
        <ConjugationLeaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Mid-run: question or loading ───────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RunHeader
        index={run.index}
        total={conj.RUN_LENGTH}
        score={score.correct}
        currentStreak={stats.currentStreak}
        badge={badge}
      />

      {!cur && conj.state.loading && <QuestionSkeleton />}

      {!cur && !conj.state.loading && conj.state.error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-800 dark:text-rose-200">
          {conj.state.error}
          <button
            onClick={() => void conj.loadQuestion()}
            className="ml-3 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {cur && (
        <QuestionCard
          question={cur.question}
          shuffled={shuffled}
          selected={cur.selectedAnswer}
          correct={cur.correct}
          showExplanation={showExplanation}
          onAnswer={(v) => {
            conj.answer(v);
            setShowExplanation(true);
            // Tiny XP nudge per correct answer
            const isRight = v === cur.question.correctConjugation;
            if (isRight) appDispatch({ type: "ADD_XP", payload: 3 });
          }}
          onNext={() => {
            if (run.index >= conj.RUN_LENGTH - 1) {
              // The reducer marks END_RUN cleanly; isRunComplete() flips true.
              return;
            }
            conj.advance();
          }}
        />
      )}
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        ⊛ Conjugation Drills
      </div>
      <h2 className="mt-1 font-display text-3xl font-semibold">Pick the right form</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Five-question runs. Build streaks. Earn perfect-run badges.
      </p>
    </div>
  );
}

function LevelPicker({
  language,
  selected,
  onPick,
  stats,
  currentBadge,
}: {
  language: string;
  selected: ConjugationLevel;
  onPick: (l: ConjugationLevel) => void;
  stats: {
    bestStreak: number;
    currentStreak: number;
    perfectRuns: number;
    totalCorrect: number;
    totalAttempts: number;
  };
  currentBadge: ReturnType<typeof streakBadge>;
}) {
  const accuracy =
    stats.totalAttempts === 0 ? 0 : Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Difficulty · {language}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Best <span className="text-foreground">{stats.bestStreak}</span>
          </span>
          <span>
            Perfect <span className="text-foreground">{stats.perfectRuns}</span>
          </span>
          <span>
            Accuracy <span className="text-foreground">{accuracy}%</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as ConjugationLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => onPick(l)}
            data-active={selected === l}
            className="rounded-xl border border-border/70 bg-background/40 p-3 text-left transition-all hover:border-gold/60 data-[active=true]:border-gold/80 data-[active=true]:bg-gold/[0.08]"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              {LEVEL_LABELS[l].name}
            </div>
            <div className="mt-1 text-xs text-foreground/80">{LEVEL_LABELS[l].sub}</div>
          </button>
        ))}
      </div>
      {currentBadge && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {currentBadge === "unstoppable" ? (
            <Trophy className="h-3 w-3" />
          ) : currentBadge === "streaking" ? (
            <Zap className="h-3 w-3" />
          ) : (
            <Flame className="h-3 w-3" />
          )}
          {streakBadgeLabel(currentBadge)} · {stats.currentStreak} in a row
        </div>
      )}
    </div>
  );
}

function RunHeader({
  index,
  total,
  score,
  currentStreak,
  badge,
}: {
  index: number;
  total: number;
  score: number;
  currentStreak: number;
  badge: ReturnType<typeof streakBadge>;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 px-5 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Question <span className="text-foreground">{index + 1}</span> / {total}
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>
          Score <span className="text-foreground">{score}</span>
        </span>
        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-gold">
            <Flame className="h-3 w-3" /> {currentStreak}
          </span>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  shuffled,
  selected,
  correct,
  showExplanation,
  onAnswer,
  onNext,
}: {
  question: ConjugationQuestion;
  shuffled: string[];
  selected: string | null;
  correct: boolean | null;
  showExplanation: boolean;
  onAnswer: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {question.cefr}
        </span>
        <span className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          axis: {question.axisTested}
        </span>
        <span className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          base: <span className="text-foreground">{question.infinitive}</span> (
          {question.infinitiveTranslation})
        </span>
      </div>

      <p className="font-display text-2xl leading-relaxed text-foreground">
        {renderPhrase(question.phrase)}
      </p>
      <p className="mt-1 text-sm italic text-muted-foreground">{question.phraseTranslation}</p>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shuffled.map((opt) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === question.correctConjugation;
          const reveal = correct !== null;
          let tone = "border-border/70 bg-background/40 hover:border-gold/60";
          if (reveal && isCorrectOpt)
            tone = "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
          else if (reveal && isSelected && !isCorrectOpt)
            tone = "border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-100";
          else if (reveal) tone = "border-border/40 bg-background/20 opacity-60";
          return (
            <button
              key={opt}
              disabled={correct !== null}
              onClick={() => onAnswer(opt)}
              className={`group rounded-xl border px-4 py-3 text-left font-display text-lg transition-all ${tone}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{opt}</span>
                {reveal && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {reveal && isSelected && !isCorrectOpt && (
                  <XCircle className="h-4 w-4 text-rose-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-5 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
            ✎ Why
          </div>
          <p className="mt-1 text-sm text-foreground/90">{question.explanation}</p>
        </div>
      )}

      {correct !== null && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function renderPhrase(phrase: string) {
  // Highlight the "___" blank with a gold rule so the eye finds it immediately.
  const parts = phrase.split(/(_{3,})/);
  return (
    <>
      {parts.map((p, i) => {
        if (/^_{3,}$/.test(p)) {
          return (
            <span
              key={i}
              className="mx-1 inline-block min-w-[3.5em] border-b-2 border-gold/70 align-baseline"
            >
              &nbsp;
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function QuestionSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="shimmer h-3 w-24 rounded" />
      <div className="shimmer h-7 w-3/4 rounded" />
      <div className="shimmer h-4 w-1/2 rounded" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="shimmer h-12 rounded-xl" />
        <div className="shimmer h-12 rounded-xl" />
        <div className="shimmer h-12 rounded-xl" />
        <div className="shimmer h-12 rounded-xl" />
      </div>
    </div>
  );
}

function RunReview({
  run,
}: {
  run: NonNullable<ReturnType<typeof useConjugation>["state"]["run"]>;
}) {
  // Shows a compact recap of the 5 questions with right/wrong markers.
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Run Review
      </div>
      <ul className="space-y-2">
        {run.questions.map((q, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/30 p-3"
          >
            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-display text-sm text-foreground/90">
                {q.question.phrase.replace(/_+/g, "___")}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                Correct: <span className="text-emerald-300">{q.question.correctConjugation}</span>
                {q.selectedAnswer && q.selectedAnswer !== q.question.correctConjugation && (
                  <>
                    {" "}
                    · You picked: <span className="text-rose-700 dark:text-rose-300">{q.selectedAnswer}</span>
                  </>
                )}
              </div>
            </div>
            {q.correct ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Memoized helper-export for places that just need the lobby badge derivation.
export function useConjugationBadge() {
  const conj = useConjugation();
  const { state: app } = useApp();
  return useMemo(() => {
    const stats = conj.state.leaderboard[`${app.selectedLanguage}-1` as LeaderboardKey];
    if (!stats) return null;
    return streakBadge(stats.currentStreak);
  }, [conj.state.leaderboard, app.selectedLanguage]);
}
