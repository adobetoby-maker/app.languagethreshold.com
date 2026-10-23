import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Sparkle,
  Shuffle,
  RotateCcw,
  Trophy,
  Flame,
  ChevronRight,
  X,
} from "lucide-react";
import { useApp } from "@/state/app-state";
import { useSentenceBuild, type SBLeaderboardKey } from "@/state/sentence-build-state";
import { generateSentenceBuilder, type SentenceBuildLevel } from "@/fns/sentence-build.functions";
import { MODULES } from "@/data/modules";
import { packSentenceFor } from "@/lib/trade-packs";

const LEVEL_LABELS: Record<SentenceBuildLevel, { name: string; sub: string }> = {
  1: { name: "Level 1", sub: "Short — 4–6 tokens, A2" },
  2: { name: "Level 2", sub: "Medium — 6–9 tokens, B1" },
  3: { name: "Level 3", sub: "Long — 9–13 tokens, B2" },
};

export function SentenceBuilder() {
  const { state: app, dispatch: appDispatch } = useApp();
  const sb = useSentenceBuild();
  const fetchQuestion = useServerFn(generateSentenceBuilder);

  const topic = useMemo(() => {
    const mod = MODULES.find((m) => m.id === app.activeModuleId);
    if (!mod) return undefined;
    return `${mod.name} (${mod.vocabFocus.slice(0, 5).join(", ")})`;
  }, [app.activeModuleId]);

  useEffect(() => {
    sb.setFetcher(async ({ language, level, avoid }) => {
      // Pack first (static, free, works offline): the selected module's trade pack, waiting for
      // it if its fetch is still in flight. When the pack has nothing, the live AI call runs.
      const packed = app.activeModuleId
        ? await packSentenceFor({
            moduleId: app.activeModuleId,
            language,
            nativeLanguage: app.nativeLanguage,
            level,
            avoid,
          })
        : null;
      const res = packed
        ? { data: packed, error: null }
        : await fetchQuestion({ data: { language, level, avoid, topic } });
      if (res.error || !res.data) throw new Error(res.error ?? "No question.");
      return res.data;
    });
    return () => sb.setFetcher(null);
  }, [sb, fetchQuestion, topic, app.activeModuleId, app.nativeLanguage]);

  const [selectedLevel, setSelectedLevel] = useState<SentenceBuildLevel>(1);
  const run = sb.state.run;
  const cur = sb.currentQuestion();
  const score = sb.runScore();

  // Auto-load next question when index advances.
  useEffect(() => {
    if (!run) return;
    if (run.questions.length === run.index) {
      void sb.loadQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.index, run?.questions.length]);

  const lbKey: SBLeaderboardKey = `${app.selectedLanguage}-${selectedLevel}` as SBLeaderboardKey;
  const stats = sb.state.leaderboard[lbKey] ?? {
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
          onClick={() => sb.startRun(app.selectedLanguage, selectedLevel)}
          className="group relative w-full overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-6 py-6 text-left transition-all hover:border-gold hover:from-gold/20"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            ▶ Start Run
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            5 sentences in {app.selectedLanguage}
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
  if (sb.isRunComplete()) {
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
                sb.endRun();
                sb.startRun(app.selectedLanguage, selectedLevel);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run Again
            </button>
            <button
              onClick={() => sb.endRun()}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/50"
            >
              Back
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
        total={sb.RUN_LENGTH}
        score={score.correct}
        streak={stats.currentStreak}
      />

      {!cur && sb.state.loading && <Skeleton />}

      {!cur && !sb.state.loading && sb.state.error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-800 dark:text-rose-200">
          {sb.state.error}
          <button
            onClick={() => void sb.loadQuestion()}
            className="ml-3 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {cur && (
        <QuestionCard
          q={cur}
          onPlace={(idx) => sb.placeToken(idx)}
          onRemove={(idx) => sb.removePlaced(idx)}
          onShuffle={() => sb.shufflePool()}
          onSubmit={() => {
            sb.submit();
            // XP nudge for completion attempt — full XP on correct
            const wasCorrect = cur.placed.join(" ") === cur.question.tokens.join(" ");
            appDispatch({ type: "ADD_XP", payload: wasCorrect ? 4 : 1 });
          }}
          onNext={() => {
            if (run.index >= sb.RUN_LENGTH - 1) return;
            sb.advance();
          }}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        ⊞ Sentence Builder
      </div>
      <h2 className="mt-1 font-display text-3xl font-semibold">Order the words</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap the scrambled tokens in the right order to build the target sentence.
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
  selected: SentenceBuildLevel;
  onPick: (l: SentenceBuildLevel) => void;
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
        {([1, 2, 3] as SentenceBuildLevel[]).map((l) => (
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
        Sentence <span className="text-foreground">{index + 1}</span> / {total}
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
  q,
  onPlace,
  onRemove,
  onShuffle,
  onSubmit,
  onNext,
}: {
  q: NonNullable<ReturnType<typeof useSentenceBuild>["state"]["run"]>["questions"][number];
  onPlace: (poolIndex: number) => void;
  onRemove: (placedIndex: number) => void;
  onShuffle: () => void;
  onSubmit: () => void;
  onNext: () => void;
}) {
  const allPlaced = q.placed.length === q.question.tokens.length;
  const reveal = q.submitted;

  // For Japanese / Korean, render placed tokens with no joining space.
  const isCJK = useMemo(
    () => /^[぀-ヿ一-鿿가-힯]+$/.test(q.question.tokens.join("")),
    [q.question.tokens],
  );
  const joinedPlaced = isCJK ? q.placed.join("") : q.placed.join(" ");

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {q.question.cefr}
        </span>
        <span className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          topic: <span className="text-foreground/80">{q.question.topic}</span>
        </span>
      </div>

      <p className="mt-2 text-sm italic text-muted-foreground">
        Build this in {q.question.cefr} target language:
      </p>
      <p className="mt-1 font-display text-xl text-foreground/95">
        {q.question.englishTranslation}
      </p>

      {/* Construction tray */}
      <div className="mt-5 min-h-[3.5rem] rounded-xl border border-dashed border-gold/40 bg-background/30 p-3">
        {q.placed.length === 0 ? (
          <div className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Tap tokens below to build the sentence
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {q.placed.map((t, i) => (
              <button
                key={`${t}-${i}`}
                onClick={() => !reveal && onRemove(i)}
                disabled={reveal}
                data-correct={reveal ? q.question.tokens[i] === t : undefined}
                className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-3 py-1 font-display text-base transition-all hover:border-rose-500/60 data-[correct=true]:border-emerald-500/60 data-[correct=true]:bg-emerald-500/10 data-[correct=false]:border-rose-500/60 data-[correct=false]:bg-rose-500/10"
              >
                <span>{t}</span>
                {!reveal && (
                  <X className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pool */}
      {q.pool.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {q.pool.map((t, i) => (
            <button
              key={`pool-${t}-${i}`}
              onClick={() => onPlace(i)}
              disabled={reveal}
              className="rounded-full border border-border/70 bg-card/60 px-3 py-1 font-display text-base text-foreground transition-all hover:border-gold/60 hover:bg-gold/10"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onShuffle}
          disabled={reveal || q.pool.length < 2}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-gold/50 hover:text-foreground disabled:opacity-40"
        >
          <Shuffle className="h-3 w-3" /> Reshuffle
        </button>
        {!reveal && (
          <button
            onClick={onSubmit}
            disabled={!allPlaced}
            className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20 disabled:opacity-40"
          >
            Check Sentence
          </button>
        )}
        {reveal && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Reveal panel */}
      {reveal && (
        <div className="mt-5 space-y-3">
          <div
            className={`rounded-xl border p-3 ${q.correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}
          >
            <div className="flex items-center gap-2">
              {q.correct ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400" />
              )}
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                {q.correct ? "Correct" : "Not quite"}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-foreground/90">
              <span className="font-mono text-muted-foreground">You wrote:</span> {joinedPlaced}
            </p>
            {!q.correct && (
              <p className="mt-1 text-[13px] text-foreground/90">
                <span className="font-mono text-muted-foreground">Correct:</span>{" "}
                {q.question.targetSentence}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
              ✎ Why
            </div>
            <p className="mt-1 text-sm text-foreground/90">{q.question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="shimmer h-3 w-24 rounded" />
      <div className="shimmer h-7 w-3/4 rounded" />
      <div className="shimmer h-14 w-full rounded-xl" />
      <div className="flex flex-wrap gap-1.5">
        <div className="shimmer h-8 w-20 rounded-full" />
        <div className="shimmer h-8 w-16 rounded-full" />
        <div className="shimmer h-8 w-24 rounded-full" />
        <div className="shimmer h-8 w-20 rounded-full" />
        <div className="shimmer h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

function RunReview({
  run,
}: {
  run: NonNullable<ReturnType<typeof useSentenceBuild>["state"]["run"]>;
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
                {q.question.targetSentence}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {q.question.englishTranslation}
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
  const sb = useSentenceBuild();
  const rows = ([1, 2, 3] as SentenceBuildLevel[]).map((level) => {
    const k = `${language}-${level}` as SBLeaderboardKey;
    const s = sb.state.leaderboard[k] ?? {
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
          No runs yet. Finish a 5-sentence run to populate the board.
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
