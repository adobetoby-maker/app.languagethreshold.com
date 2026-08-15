import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Sparkle,
  Trophy,
  Flame,
  ChevronRight,
  Volume2,
  Ear,
  RotateCcw,
} from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { MODULES } from "@/data/modules";
import { useListeningDrill, type LDLeaderboardKey } from "@/state/listening-drill-state";
import { generateListeningDrill, type ListeningDrillLevel } from "@/fns/listening-drill.functions";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";

const LEVEL_LABELS: Record<ListeningDrillLevel, { name: string; sub: string }> = {
  1: { name: "Level 1", sub: "Easy — 4-7 words, A2" },
  2: { name: "Level 2", sub: "Medium — 7-12 words, B1" },
  3: { name: "Level 3", sub: "Hard — 12-18 words, B2" },
};

const SPEECH_LOCALE: Record<Language, string> = {
  Spanish: "es-CR",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Portuguese: "pt-PT",
  Pashto: "ps-AF",
  English: "en-US",
};

function speak(text: string, language: Language) {
  if (typeof window === "undefined") return;
  if (needsRemoteTTS(SPEECH_LOCALE[language])) {
    void speakRemote(text, SPEECH_LOCALE[language], { rate: 0.9 });
    return;
  }
  if (!("speechSynthesis" in window)) return;
  try {
    // Safari deadlocks if you call speak() while a previous utterance is
    // still queued or speaking. Cancel first, always.
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    configureUtterance(utter, SPEECH_LOCALE[language]);
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  } catch {
    // Ignore — TTS is a nice-to-have. The drill still works visually if it
    // fails (the user just won't hear anything; they'll have to advance).
  }
}

function cancelSpeak() {
  stopRemoteTTS();
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

export function ListeningDrill() {
  const { state: app, dispatch: appDispatch } = useApp();
  const ld = useListeningDrill();
  const fetchQuestion = useServerFn(generateListeningDrill);

  const topic = useMemo(() => {
    const mod = MODULES.find((m) => m.id === app.activeModuleId);
    if (!mod) return undefined;
    return `${mod.name} (${mod.vocabFocus.slice(0, 5).join(", ")})`;
  }, [app.activeModuleId]);

  useEffect(() => {
    ld.setFetcher(async ({ language, level, avoid }) => {
      const res = await fetchQuestion({ data: { language, level, avoid, topic } });
      if (res.error || !res.data) throw new Error(res.error ?? "No question.");
      return res.data;
    });
    return () => ld.setFetcher(null);
  }, [ld, fetchQuestion, topic]);

  // Always cancel any in-flight TTS when this view unmounts.
  useEffect(() => () => cancelSpeak(), []);

  const [selectedLevel, setSelectedLevel] = useState<ListeningDrillLevel>(1);
  const run = ld.state.run;
  const cur = ld.currentQuestion();
  const score = ld.runScore();

  // Auto-load next question when index advances.
  useEffect(() => {
    if (!run) return;
    if (run.questions.length === run.index) {
      void ld.loadQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.index, run?.questions.length]);

  // Auto-play the audio the first time a fresh question appears, so the
  // learner doesn't have to tap twice to start. They can replay manually.
  useEffect(() => {
    if (!run || !cur) return;
    if (cur.submitted) return;
    if (cur.playCount !== 0) return;
    speak(cur.question.phrase, run.language);
    ld.incrementPlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.index, cur?.question.phrase, cur?.submitted]);

  const lbKey: LDLeaderboardKey = `${app.selectedLanguage}-${selectedLevel}` as LDLeaderboardKey;
  const stats = ld.state.leaderboard[lbKey] ?? {
    bestStreak: 0,
    currentStreak: 0,
    perfectRuns: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    totalPlays: 0,
  };

  const onReplay = useCallback(() => {
    if (!run || !cur) return;
    speak(cur.question.phrase, run.language);
    ld.incrementPlays();
  }, [run, cur, ld]);

  const onAnswer = useCallback(
    (idx: number) => {
      if (!cur || cur.submitted) return;
      cancelSpeak();
      ld.answer(idx);
      const wasCorrect = idx === cur.question.correctIndex;
      appDispatch({ type: "ADD_XP", payload: wasCorrect ? 4 : 1 });
    },
    [cur, ld, appDispatch],
  );

  const onNext = useCallback(() => {
    if (!run) return;
    cancelSpeak();
    if (run.index >= ld.RUN_LENGTH - 1) return;
    ld.advance();
  }, [run, ld]);

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
          onClick={() => ld.startRun(app.selectedLanguage, selectedLevel)}
          className="group relative w-full overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-6 py-6 text-left transition-all hover:border-gold hover:from-gold/20"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            ▶ Start Run
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            5 listening rounds in {app.selectedLanguage}
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
  if (ld.isRunComplete()) {
    const allCorrect = score.correct === score.total;
    const avgPlays =
      stats.totalCorrect > 0
        ? (stats.totalPlays / Math.max(1, stats.totalAttempts)).toFixed(1)
        : "—";
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
            <span className="text-foreground">{stats.bestStreak}</span> · Avg plays/Q:{" "}
            <span className="text-foreground">{avgPlays}</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                ld.endRun();
                ld.startRun(app.selectedLanguage, selectedLevel);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run Again
            </button>
            <button
              onClick={() => ld.endRun()}
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
        total={ld.RUN_LENGTH}
        score={score.correct}
        streak={stats.currentStreak}
      />

      {!cur && ld.state.loading && <Skeleton />}

      {!cur && !ld.state.loading && ld.state.error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
          {ld.state.error}
          <button
            onClick={() => void ld.loadQuestion()}
            className="ml-3 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {cur && <QuestionCard q={cur} onReplay={onReplay} onAnswer={onAnswer} onNext={onNext} />}
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        ⊞ Listening Drill
      </div>
      <h2 className="mt-1 font-display text-3xl font-semibold">Hear it. Pick it.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Listen to a phrase, then choose the matching transcript from 4 options. Replay as many times
        as you need.
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
  selected: ListeningDrillLevel;
  onPick: (l: ListeningDrillLevel) => void;
  stats: {
    bestStreak: number;
    currentStreak: number;
    perfectRuns: number;
    totalCorrect: number;
    totalAttempts: number;
    totalPlays: number;
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
        {([1, 2, 3] as ListeningDrillLevel[]).map((l) => (
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
        Round <span className="text-foreground">{index + 1}</span> / {total}
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
  onReplay,
  onAnswer,
  onNext,
}: {
  q: NonNullable<ReturnType<typeof useListeningDrill>["state"]["run"]>["questions"][number];
  onReplay: () => void;
  onAnswer: (idx: number) => void;
  onNext: () => void;
}) {
  const reveal = q.submitted;
  const correctIdx = q.question.correctIndex;

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

      {/* Big play button */}
      <div className="mt-5 flex flex-col items-center">
        <button
          onClick={onReplay}
          className="group relative inline-flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold/60 bg-gradient-to-br from-gold/20 via-gold/10 to-transparent text-gold shadow-[0_0_40px_-10px_rgba(212,175,55,0.6)] transition-all hover:scale-105 hover:border-gold hover:from-gold/30 active:scale-95"
          aria-label="Play audio"
        >
          <Volume2 className="h-10 w-10" strokeWidth={1.6} />
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-gold/30" />
        </button>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {q.playCount === 0 ? "Tap to play audio" : `Tap to replay · played ${q.playCount}×`}
        </div>
      </div>

      {/* Options */}
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.question.options.map((opt, i) => {
          const isSelected = q.selectedIndex === i;
          const isCorrectOpt = i === correctIdx;
          let stateAttr: "correct" | "wrong" | "neutral" = "neutral";
          if (reveal) {
            if (isCorrectOpt) stateAttr = "correct";
            else if (isSelected) stateAttr = "wrong";
          }
          return (
            <button
              key={`${i}-${opt}`}
              onClick={() => onAnswer(i)}
              disabled={reveal}
              data-state={stateAttr}
              data-selected={isSelected}
              className="group flex items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-3 text-left font-display text-base text-foreground transition-all hover:border-gold/60 hover:bg-gold/[0.06] disabled:hover:border-border/70 disabled:hover:bg-background/40 data-[state=correct]:border-emerald-500/60 data-[state=correct]:bg-emerald-500/10 data-[state=wrong]:border-rose-500/60 data-[state=wrong]:bg-rose-500/10"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/60 font-mono text-[11px] text-muted-foreground group-data-[state=correct]:border-emerald-500/60 group-data-[state=correct]:text-emerald-300 group-data-[state=wrong]:border-rose-500/60 group-data-[state=wrong]:text-rose-300">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 break-words">{opt}</span>
              {reveal && isCorrectOpt && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              )}
              {reveal && !isCorrectOpt && isSelected && (
                <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Reveal panel */}
      {reveal && (
        <div className="mt-5 space-y-3">
          <div
            className={`rounded-xl border p-3 ${
              q.correct
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-rose-500/40 bg-rose-500/10"
            }`}
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
            <p className="mt-1 font-display text-base text-foreground/95">{q.question.phrase}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {q.question.englishTranslation}
            </p>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
              <Ear className="h-3 w-3" /> Listen for
            </div>
            <p className="mt-1 text-sm text-foreground/90">{q.question.listenFor}</p>
          </div>

          <div className="flex items-center justify-end">
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
      <div className="mx-auto mt-2 h-24 w-24 rounded-full bg-gold/10" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="shimmer h-12 w-full rounded-xl" />
        <div className="shimmer h-12 w-full rounded-xl" />
        <div className="shimmer h-12 w-full rounded-xl" />
        <div className="shimmer h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

function RunReview({
  run,
}: {
  run: NonNullable<ReturnType<typeof useListeningDrill>["state"]["run"]>;
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
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm text-foreground/90">
                {q.question.phrase}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {q.question.englishTranslation}
                {q.playCount > 0 && (
                  <span className="ml-2 text-foreground/60">
                    · {q.playCount} play{q.playCount === 1 ? "" : "s"}
                  </span>
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
  const ld = useListeningDrill();
  const rows = ([1, 2, 3] as ListeningDrillLevel[]).map((level) => {
    const k = `${language}-${level}` as LDLeaderboardKey;
    const s = ld.state.leaderboard[k] ?? {
      bestStreak: 0,
      currentStreak: 0,
      perfectRuns: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      totalPlays: 0,
    };
    const acc = s.totalAttempts === 0 ? 0 : Math.round((s.totalCorrect / s.totalAttempts) * 100);
    const avgPlays =
      s.totalAttempts === 0 ? 0 : Math.round((s.totalPlays / s.totalAttempts) * 10) / 10;
    return { level, ...s, acc, avgPlays };
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
          No runs yet. Finish a 5-round run to populate the board.
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
              <th>Avg/Q</th>
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
                <td className="text-foreground/80">{r.avgPlays}×</td>
                <td className="text-muted-foreground">{r.totalAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
