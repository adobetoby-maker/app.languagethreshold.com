import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Sparkle,
  RotateCcw,
  Trophy,
  Flame,
  ChevronRight,
  AlertTriangle,
  Handshake,
} from "lucide-react";
import { useApp } from "@/state/app-state";
import { useFalseFriends, type FFLeaderboardKey } from "@/state/false-friends-state";
import { generateFalseFriend, type FalseFriendsLevel } from "@/fns/false-friends.functions";
import { MODULES } from "@/data/modules";

const LEVEL_LABELS: Record<FalseFriendsLevel, { name: string; sub: string }> = {
  1: { name: "Level 1", sub: "Common cognates — A2" },
  2: { name: "Level 2", sub: "Mid-frequency traps — B1" },
  3: { name: "Level 3", sub: "Subtle / advanced — B2" },
};

export function FalseFriends() {
  const { state: app, dispatch: appDispatch } = useApp();
  const ff = useFalseFriends();
  const fetchQ = useServerFn(generateFalseFriend);

  const topic = useMemo(() => {
    const mod = MODULES.find((m) => m.id === app.activeModuleId);
    if (!mod) return undefined;
    return `${mod.name} (${mod.vocabFocus.slice(0, 5).join(", ")})`;
  }, [app.activeModuleId]);

  useEffect(() => {
    ff.setFetcher(async ({ language, level, avoid }) => {
      const res = await fetchQ({ data: { language, level, avoid, topic } });
      if (res.error || !res.data) throw new Error(res.error ?? "No question.");
      return res.data;
    });
    return () => ff.setFetcher(null);
  }, [ff, fetchQ, topic]);

  const [selectedLevel, setSelectedLevel] = useState<FalseFriendsLevel>(1);
  const run = ff.state.run;
  const cur = ff.currentQuestion();
  const score = ff.runScore();

  // Auto-load next question on advance.
  useEffect(() => {
    if (!run) return;
    if (run.questions.length === run.index) {
      void ff.loadQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.index, run?.questions.length]);

  const lbKey: FFLeaderboardKey = `${app.selectedLanguage}-${selectedLevel}` as FFLeaderboardKey;
  const stats = ff.state.leaderboard[lbKey] ?? {
    bestStreak: 0,
    currentStreak: 0,
    perfectRuns: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    trapsCaught: 0,
    trapsMissed: 0,
  };

  // ── Lobby ─────────────────────────────────────────────────────────────
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
          onClick={() => ff.startRun(app.selectedLanguage, selectedLevel)}
          className="group relative w-full overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-6 py-6 text-left transition-all hover:border-gold hover:from-gold/20"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            ▶ Start Run
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            5 traps in {app.selectedLanguage}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {LEVEL_LABELS[selectedLevel].sub}
          </div>
        </button>
        <Leaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Run complete ──────────────────────────────────────────────────────
  if (ff.isRunComplete()) {
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
          <div className="mt-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            Traps caught {stats.trapsCaught} / {stats.trapsCaught + stats.trapsMissed}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                ff.endRun();
                ff.startRun(app.selectedLanguage, selectedLevel);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run Again
            </button>
            <button
              onClick={() => ff.endRun()}
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

  // ── In-run question ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RunHeader
        index={run.index}
        total={ff.RUN_LENGTH}
        score={score.correct}
        streak={stats.currentStreak}
      />

      {!cur && ff.state.loading && <Skeleton />}

      {!cur && !ff.state.loading && ff.state.error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-800 dark:text-rose-200">
          {ff.state.error}
          <button
            onClick={() => void ff.loadQuestion()}
            className="ml-3 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {cur && (
        <QuestionCard
          q={cur}
          onAnswer={(guess) => {
            ff.answer(guess);
            const correct = guess === cur.question.isTrueFriend;
            // Reward more for catching a trap (the harder case)
            const xp = correct ? (cur.question.isTrueFriend ? 3 : 5) : 1;
            appDispatch({ type: "ADD_XP", payload: xp });
          }}
          onNext={() => {
            if (run.index >= ff.RUN_LENGTH - 1) return;
            ff.advance();
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
        ⚠ False Friends
      </div>
      <h2 className="mt-1 font-display text-3xl font-semibold">Spot the cognate trap</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Some words look like English but aren&apos;t. Decide: true friend (same meaning) or false
        friend (trap)?
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
  selected: FalseFriendsLevel;
  onPick: (l: FalseFriendsLevel) => void;
  stats: {
    bestStreak: number;
    currentStreak: number;
    perfectRuns: number;
    totalCorrect: number;
    totalAttempts: number;
    trapsCaught: number;
    trapsMissed: number;
  };
}) {
  const accuracy =
    stats.totalAttempts === 0 ? 0 : Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
  const trapAccuracy =
    stats.trapsCaught + stats.trapsMissed === 0
      ? 0
      : Math.round((stats.trapsCaught / (stats.trapsCaught + stats.trapsMissed)) * 100);
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <div className="mb-3 flex baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Difficulty · {language}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Best <span className="text-foreground">{stats.bestStreak}</span>
          </span>
          <span>
            Acc <span className="text-foreground">{accuracy}%</span>
          </span>
          <span>
            Trap-IQ <span className="text-foreground">{trapAccuracy}%</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as FalseFriendsLevel[]).map((l) => (
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
        Trap <span className="text-foreground">{index + 1}</span> / {total}
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
  onAnswer,
  onNext,
}: {
  q: NonNullable<ReturnType<typeof useFalseFriends>["state"]["run"]>["questions"][number];
  onAnswer: (guess: boolean) => void;
  onNext: () => void;
}) {
  const reveal = q.correct !== null;
  const userSaidTrueFriend = q.answer === true;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {q.question.cefr}
        </span>
        <span className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          looks like: <span className="text-foreground/80">{q.question.englishLookAlike}</span>
        </span>
      </div>

      <div className="mt-3 text-center">
        <div className="font-display text-5xl font-bold text-foreground">{q.question.word}</div>
        <p className="mt-3 text-sm italic text-foreground/80">"{q.question.contextSentence}"</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {q.question.contextTranslation}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-violet-500/30 bg-violet-500/[0.07] p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
          ? candidate meaning
        </div>
        <p className="mt-1 font-display text-lg text-foreground">"{q.question.candidateMeaning}"</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          disabled={reveal}
          onClick={() => onAnswer(true)}
          data-correct={
            reveal && q.question.isTrueFriend
              ? "true"
              : reveal && userSaidTrueFriend && !q.question.isTrueFriend
                ? "false"
                : undefined
          }
          className="group flex flex-col items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-4 transition-all hover:border-emerald-500/70 hover:bg-emerald-500/10 data-[correct=true]:border-emerald-500/80 data-[correct=true]:bg-emerald-500/20 data-[correct=false]:border-rose-500/60 data-[correct=false]:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Handshake className="h-5 w-5 text-emerald-400" strokeWidth={1.6} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            True friend
          </span>
          <span className="text-xs text-foreground/70">Same meaning</span>
        </button>
        <button
          disabled={reveal}
          onClick={() => onAnswer(false)}
          data-correct={
            reveal && !q.question.isTrueFriend
              ? "true"
              : reveal && !userSaidTrueFriend && q.question.isTrueFriend
                ? "false"
                : undefined
          }
          className="group flex flex-col items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/5 px-4 py-4 transition-all hover:border-rose-500/70 hover:bg-rose-500/10 data-[correct=true]:border-rose-500/80 data-[correct=true]:bg-rose-500/20 data-[correct=false]:border-amber-500/60 data-[correct=false]:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <AlertTriangle className="h-5 w-5 text-rose-400" strokeWidth={1.6} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
            False friend
          </span>
          <span className="text-xs text-foreground/70">Different meaning</span>
        </button>
      </div>

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
                {q.correct ? "Correct" : "Wrong"}
                {!q.correct && q.question.isTrueFriend === false && " — that was a trap"}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-foreground/90">
              <span className="font-mono text-muted-foreground">Actually means:</span>{" "}
              {q.question.actualMeaning}
            </p>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
              ✎ Why
            </div>
            <p className="mt-1 text-sm text-foreground/90">{q.question.trapExplanation}</p>
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

function Skeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="shimmer h-3 w-24 rounded" />
      <div className="shimmer mx-auto h-12 w-2/3 rounded" />
      <div className="shimmer mx-auto h-4 w-3/4 rounded" />
      <div className="shimmer h-14 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2">
        <div className="shimmer h-20 rounded-xl" />
        <div className="shimmer h-20 rounded-xl" />
      </div>
    </div>
  );
}

function RunReview({
  run,
}: {
  run: NonNullable<ReturnType<typeof useFalseFriends>["state"]["run"]>;
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
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold text-foreground">
                  {q.question.word}
                </span>
                {!q.question.isTrueFriend && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.15em] text-rose-700 dark:text-rose-300">
                    trap
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                = {q.question.actualMeaning}
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
  const ff = useFalseFriends();
  const rows = ([1, 2, 3] as FalseFriendsLevel[]).map((level) => {
    const k = `${language}-${level}` as FFLeaderboardKey;
    const s = ff.state.leaderboard[k] ?? {
      bestStreak: 0,
      currentStreak: 0,
      perfectRuns: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      trapsCaught: 0,
      trapsMissed: 0,
    };
    const acc = s.totalAttempts === 0 ? 0 : Math.round((s.totalCorrect / s.totalAttempts) * 100);
    const trapTotal = s.trapsCaught + s.trapsMissed;
    const trapIQ = trapTotal === 0 ? 0 : Math.round((s.trapsCaught / trapTotal) * 100);
    return { level, ...s, acc, trapIQ };
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
          No runs yet. Spot some traps to populate the board.
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
              <th title="Traps caught / total traps seen">Trap-IQ</th>
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
                <td className="text-foreground/80">
                  <AlertTriangle className="mr-1 inline h-3 w-3 text-amber-400" />
                  {r.trapIQ}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
