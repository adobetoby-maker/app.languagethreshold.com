import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Sparkle,
  Flame,
  Trophy,
  RotateCcw,
  ChevronRight,
  Quote,
} from "lucide-react";
import { useApp } from "@/state/app-state";
import { useIdiomMaster, type IMLeaderboardKey } from "@/state/idiom-master-state";
import {
  generateIdiomQuestion,
  type IdiomMasterLevel,
  type IdiomQuestion,
} from "@/fns/idiom-master.functions";
import { MODULES } from "@/data/modules";

const LEVEL_LABELS: Record<IdiomMasterLevel, { name: string; sub: string }> = {
  1: { name: "Level 1", sub: "Common idioms — A2-B1, weekly-use" },
  2: { name: "Level 2", sub: "Mid-frequency — B1-B2, well-known" },
  3: { name: "Level 3", sub: "Colloquial / regional — B2-C1, sound local" },
};

export function IdiomMaster() {
  const { state: app, dispatch: appDispatch } = useApp();
  const im = useIdiomMaster();
  const fetchQuestion = useServerFn(generateIdiomQuestion);

  const topic = useMemo(() => {
    const mod = MODULES.find((m) => m.id === app.activeModuleId);
    if (!mod) return undefined;
    return `${mod.name} (${mod.vocabFocus.slice(0, 5).join(", ")})`;
  }, [app.activeModuleId]);

  useEffect(() => {
    im.setFetcher(async ({ language, level, avoid }) => {
      const res = await fetchQuestion({ data: { language, level, avoid, topic } });
      if (res.error || !res.data) throw new Error(res.error ?? "No question.");
      return res.data;
    });
    return () => im.setFetcher(null);
  }, [im, fetchQuestion, topic]);

  const [selectedLevel, setSelectedLevel] = useState<IdiomMasterLevel>(1);
  const [shuffled, setShuffled] = useState<string[]>([]);

  const run = im.state.run;
  const cur = im.currentQuestion();
  const score = im.runScore();

  // Auto-load each question when the index advances past loaded count.
  useEffect(() => {
    if (!run) return;
    if (run.questions.length === run.index) {
      void im.loadQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.index, run?.questions.length]);

  // Shuffle option order so the correct slot isn't predictable.
  useEffect(() => {
    if (!cur || cur.correct !== null) return;
    const opts = [...cur.question.options];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setShuffled(opts);
  }, [cur?.question.idiom, cur?.correct]);

  const lbKey: IMLeaderboardKey = `${app.selectedLanguage}-${selectedLevel}` as IMLeaderboardKey;
  const stats = im.state.leaderboard[lbKey] ?? {
    bestStreak: 0,
    currentStreak: 0,
    perfectRuns: 0,
    totalCorrect: 0,
    totalAttempts: 0,
  };

  // ── No-run lobby ───────────────────────────────────────────────────────
  if (!run) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        <LevelPicker
          language={app.selectedLanguage}
          selected={selectedLevel}
          onPick={setSelectedLevel}
          stats={stats}
        />
        <button
          onClick={() => im.startRun(app.selectedLanguage, selectedLevel)}
          className="group relative w-full overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-6 py-6 text-left transition-all hover:border-gold hover:from-gold/20"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            ▶ Start Run
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            5 idioms in {app.selectedLanguage}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {LEVEL_LABELS[selectedLevel].sub}
          </div>
        </button>
        <Leaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Run complete ───────────────────────────────────────────────────────
  if (im.isRunComplete()) {
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
            </>
          ) : (
            <>
              <Sparkle className="mx-auto h-10 w-10 text-gold/70" strokeWidth={1.5} />
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Run Complete
              </div>
            </>
          )}
          <div className="mt-1 font-display text-4xl font-bold">
            {score.correct} / {score.total}
          </div>
          <div className="mt-3 font-mono text-xs text-muted-foreground">
            Streak: <span className="text-foreground">{stats.currentStreak}</span> · Best:{" "}
            <span className="text-foreground">{stats.bestStreak}</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                im.endRun();
                im.startRun(app.selectedLanguage, selectedLevel);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run Again
            </button>
            <button
              onClick={() => im.endRun()}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/50"
            >
              Back to Lobby
            </button>
          </div>
        </div>
        <RunReview run={run} />
        <Leaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Mid-run question ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RunHeader
        index={run.index}
        total={im.RUN_LENGTH}
        score={score.correct}
        streak={stats.currentStreak}
      />

      {!cur && im.state.loading && <Skeleton />}

      {!cur && !im.state.loading && im.state.error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-800 dark:text-rose-200">
          {im.state.error}
          <button
            onClick={() => void im.loadQuestion()}
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
          onAnswer={(v) => {
            im.answer(v);
            // XP nudge — slightly higher reward than other games because
            // idioms are valuable cultural knowledge.
            const isRight = v === cur.question.correctAnswer;
            appDispatch({ type: "ADD_XP", payload: isRight ? 5 : 1 });
          }}
          onNext={() => {
            if (run.index >= im.RUN_LENGTH - 1) return;
            im.advance();
          }}
        />
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        ❝ Idiom Master
      </div>
      <h2 className="mt-1 font-display text-3xl font-semibold">Fill the missing word</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Real native idioms — the kind that make you sound like a local.
      </p>
    </div>
  );
}

function LevelPicker({
  language,
  selected,
  onPick,
  stats,
}: {
  language: string;
  selected: IdiomMasterLevel;
  onPick: (l: IdiomMasterLevel) => void;
  stats: {
    bestStreak: number;
    currentStreak: number;
    perfectRuns: number;
    totalCorrect: number;
    totalAttempts: number;
  };
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
            Acc <span className="text-foreground">{accuracy}%</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as IdiomMasterLevel[]).map((l) => (
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
    </div>
  );
}

function RunHeader({
  index,
  total,
  score,
  streak,
}: {
  index: number;
  total: number;
  score: number;
  streak: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 px-5 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Idiom <span className="text-foreground">{index + 1}</span> / {total}
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>
          Score <span className="text-foreground">{score}</span>
        </span>
        {streak >= 3 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-gold">
            <Flame className="h-3 w-3" /> {streak}
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
  onAnswer,
  onNext,
}: {
  question: IdiomQuestion;
  shuffled: string[];
  selected: string | null;
  correct: boolean | null;
  onAnswer: (v: string) => void;
  onNext: () => void;
}) {
  const reveal = correct !== null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {question.cefr}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Quote className="h-3 w-3" /> Idiom
        </span>
      </div>

      {/* Idiom with gold-underlined blank */}
      <p className="font-display text-2xl leading-relaxed text-foreground">
        {renderIdiom(question.idiom)}
      </p>

      {/* Literal gloss hint */}
      <p className="mt-2 text-sm italic text-muted-foreground">
        Literally: {question.literalGloss}
      </p>

      {/* Options */}
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shuffled.map((opt) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === question.correctAnswer;
          let tone = "border-border/70 bg-background/40 hover:border-gold/60";
          if (reveal && isCorrectOpt)
            tone = "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
          else if (reveal && isSelected && !isCorrectOpt)
            tone = "border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-100";
          else if (reveal) tone = "border-border/40 bg-background/20 opacity-60";
          return (
            <button
              key={opt}
              disabled={reveal}
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

      {/* Reveal panel */}
      {reveal && (
        <div className="mt-5 space-y-3">
          <div
            className={`rounded-xl border p-3 ${correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}
          >
            <div className="flex items-center gap-2">
              {correct ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400" />
              )}
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                {correct ? "Correct" : "Not quite"}
              </span>
            </div>
            <p className="mt-1 font-display text-lg text-foreground/95">{question.fullIdiom}</p>
            <p className="mt-1 text-[13px] text-foreground/90">
              <span className="font-mono text-muted-foreground">Means:</span>{" "}
              {question.figurativeMeaning}
            </p>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
              ✎ Why
            </div>
            <p className="mt-1 text-sm text-foreground/90">{question.culturalNote}</p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderIdiom(phrase: string) {
  // Highlight the "___" blank with a gold rule so the eye finds it immediately.
  // Mirrors the conjugation-game treatment for visual consistency.
  const parts = phrase.split(/(_{3,})/);
  return (
    <>
      {parts.map((p, i) => {
        if (/^_{3,}$/.test(p)) {
          return (
            <span
              key={i}
              className="mx-1 inline-block min-w-[4em] border-b-2 border-gold/70 align-baseline"
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

function Skeleton() {
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
  run: NonNullable<ReturnType<typeof useIdiomMaster>["state"]["run"]>;
}) {
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
                {q.question.fullIdiom}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                Answer: <span className="text-emerald-300">{q.question.correctAnswer}</span>
                {q.selectedAnswer && q.selectedAnswer !== q.question.correctAnswer && (
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

function Leaderboard({ language }: { language: string }) {
  const im = useIdiomMaster();
  const rows = ([1, 2, 3] as IdiomMasterLevel[]).map((level) => {
    const k = `${language}-${level}` as IMLeaderboardKey;
    const s = im.state.leaderboard[k] ?? {
      bestStreak: 0,
      currentStreak: 0,
      perfectRuns: 0,
      totalCorrect: 0,
      totalAttempts: 0,
    };
    const acc = s.totalAttempts === 0 ? 0 : Math.round((s.totalCorrect / s.totalAttempts) * 100);
    return { level, ...s, acc };
  });
  const hasAny = rows.some((r) => r.totalAttempts > 0);
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
          Leaderboard · {language}
        </h3>
      </div>
      {!hasAny && (
        <p className="text-sm text-muted-foreground">
          No runs yet. Finish a 5-idiom run to populate the board.
        </p>
      )}
      {hasAny && (
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/40 [&>th]:py-2 [&>th]:font-normal [&>th]:uppercase [&>th]:tracking-[0.18em]">
              <th>Lvl</th>
              <th>Best</th>
              <th>Current</th>
              <th>Perfect</th>
              <th>Acc</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.level} className="border-b border-border/30 last:border-0 [&>td]:py-2.5">
                <td className="text-foreground">L{r.level}</td>
                <td className="text-foreground">
                  <Flame className="mr-1 inline h-3 w-3 text-gold" />
                  {r.bestStreak}
                </td>
                <td className={r.currentStreak >= 3 ? "text-gold" : "text-foreground/80"}>
                  {r.currentStreak}
                </td>
                <td className="text-foreground">{r.perfectRuns}</td>
                <td className="text-foreground/80">{r.acc}%</td>
                <td className="text-muted-foreground">{r.totalAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
