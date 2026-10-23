import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, RotateCcw, Sparkle, Timer, Layers, Target, ChevronLeft } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useWordMatch, type WMLeaderboardKey } from "@/state/word-match-state";
import { generateWordMatchBoard, type WordMatchLevel } from "@/fns/word-match.functions";
import { MODULES } from "@/data/modules";
import { packBoardFor, prefetchTradePack } from "@/lib/trade-packs";

const LEVEL_LABELS: Record<WordMatchLevel, { name: string; sub: string; pairs: number }> = {
  1: { name: "Level 1", sub: "6 pairs · A1–A2 vocab", pairs: 6 },
  2: { name: "Level 2", sub: "8 pairs · B1 vocab", pairs: 8 },
  3: { name: "Level 3", sub: "10 pairs · B2+ vocab", pairs: 10 },
};

const REVEAL_DELAY_MS = 700;

function formatTime(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WordMatch() {
  const { state: app, dispatch: appDispatch } = useApp();
  const wm = useWordMatch();
  const fetchBoard = useServerFn(generateWordMatchBoard);

  const topic = useMemo(() => {
    const mod = MODULES.find((m) => m.id === app.activeModuleId);
    if (!mod) return undefined;
    return `${mod.name} (${mod.vocabFocus.slice(0, 5).join(", ")})`;
  }, [app.activeModuleId]);

  const userWords =
    app.userVocab.length > 0 && app.vocabLang === app.selectedLanguage
      ? app.userVocab.map((v) => v.word).slice(0, 20)
      : undefined;

  // The selected module's trade pack: fetch it in the background when the module or language
  // changes, so the first game starts from it and the service worker keeps it for offline use.
  useEffect(() => {
    prefetchTradePack(app.activeModuleId, app.selectedLanguage, app.nativeLanguage);
  }, [app.activeModuleId, app.selectedLanguage, app.nativeLanguage]);

  useEffect(() => {
    wm.setFetcher(async ({ language, level, avoid }) => {
      // Pack first (static, free, works offline). A pack board wins even when the learner has
      // personal words; when the pack has nothing for this request, the live AI call runs.
      const packed = app.activeModuleId
        ? await packBoardFor({
            moduleId: app.activeModuleId,
            language,
            nativeLanguage: app.nativeLanguage,
            level,
            avoid,
          })
        : null;
      const res = packed
        ? { data: packed, error: null }
        : await fetchBoard({ data: { language, level, avoid, topic, userWords } });
      if (res.error || !res.data) throw new Error(res.error ?? "No board.");
      return res.data;
    });
    return () => wm.setFetcher(null);
  }, [wm, fetchBoard, topic, userWords, app.activeModuleId, app.nativeLanguage]);

  const [selectedLevel, setSelectedLevel] = useState<WordMatchLevel>(1);

  const game = wm.state.game;
  const result = wm.state.result;
  const isComplete = wm.isComplete();

  // ── Compare timeout: when 2 cards are flipped face-up and don't match,
  //    schedule a 700ms reset. Cleaned up on unmount or whenever
  //    flippedIndices changes.
  const compareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Clear any existing pending reset.
    if (compareTimeoutRef.current !== null) {
      clearTimeout(compareTimeoutRef.current);
      compareTimeoutRef.current = null;
    }
    if (!game) return;
    if (game.flippedIndices.length === 2) {
      compareTimeoutRef.current = setTimeout(() => {
        wm.resolveMatch();
        compareTimeoutRef.current = null;
      }, REVEAL_DELAY_MS);
    }
    return () => {
      if (compareTimeoutRef.current !== null) {
        clearTimeout(compareTimeoutRef.current);
        compareTimeoutRef.current = null;
      }
    };
  }, [game, wm]);

  // ── Detect completion → award XP + mark matched user vocab words ────────
  const finalizedRef = useRef(false);
  useEffect(() => {
    if (!game || !game.board) {
      finalizedRef.current = false;
      return;
    }
    if (isComplete && !game.completedAt && !finalizedRef.current) {
      finalizedRef.current = true;
      const flips = game.flipCount;
      const perfect = flips === game.board.pairs.length * 2;
      appDispatch({ type: "ADD_XP", payload: perfect ? 13 : 8 });

      // Credit any user-vocab words that appeared on this board.
      if (userWords && userWords.length > 0) {
        const boardWords = new Set(game.board.pairs.map((p) => p.target));
        for (const w of userWords) {
          if (boardWords.has(w)) {
            appDispatch({ type: "MASTER_VOCAB_WORD", payload: w });
          }
        }
      }

      const t = setTimeout(() => wm.endGame(), 350);
      return () => clearTimeout(t);
    }
  }, [game, isComplete, wm, appDispatch, userWords]);

  // ── Live timer tick. We re-render once per second so the displayed
  //    timer updates; the actual elapsed value is computed from
  //    Date.now() - game.startedAt, so no drift accumulates.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!game || !game.board || game.completedAt !== null) return;
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [game]);

  const startGame = useCallback(
    (level: WordMatchLevel) => {
      void wm.startGame(app.selectedLanguage, level);
    },
    [wm, app.selectedLanguage],
  );

  const lbKey: WMLeaderboardKey = `${app.selectedLanguage}-${selectedLevel}` as WMLeaderboardKey;
  const stats = wm.state.leaderboard[lbKey] ?? {
    bestTimeMs: 0,
    bestFlips: 0,
    perfectGames: 0,
    totalGames: 0,
    totalCompleted: 0,
  };

  // ── Game-over modal-ish screen ─────────────────────────────────────────
  if (result && game) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        <ResultPanel
          timeMs={result.timeMs}
          flips={result.flips}
          perfect={result.perfect}
          isNewBestTime={result.isNewBestTime}
          isNewBestFlips={result.isNewBestFlips}
          onReplay={() => {
            wm.dismissResult();
            void wm.startGame(app.selectedLanguage, result.level);
          }}
          onBack={() => wm.dismissResult()}
        />
        <Leaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────
  if (!game) {
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
          onClick={() => startGame(selectedLevel)}
          className="group relative w-full overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent px-6 py-6 text-left transition-all hover:border-gold hover:from-gold/20"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            ▶ Start Game
          </div>
          <div className="mt-1 font-display text-3xl font-semibold">
            {LEVEL_LABELS[selectedLevel].pairs} pairs in {app.selectedLanguage}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {LEVEL_LABELS[selectedLevel].sub}
          </div>
        </button>
        <Leaderboard language={app.selectedLanguage} />
      </div>
    );
  }

  // ── Loading / error before board arrives ──────────────────────────────
  if (!game.board) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        {wm.state.loading && <BoardSkeleton level={game.level} />}
        {!wm.state.loading && wm.state.error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-800 dark:text-rose-200">
            {wm.state.error}
            <button
              onClick={() => void wm.startGame(game.language, game.level)}
              className="ml-3 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-rose-500/20"
            >
              Retry
            </button>
            <button
              onClick={() => wm.dismissResult()}
              className="ml-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] hover:border-gold/50"
            >
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── In-game ───────────────────────────────────────────────────────────
  const elapsedMs = game.startedAt > 0 ? Date.now() - game.startedAt : 0;
  const compareLocked = game.flippedIndices.length === 2;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <GameTopBar
        timeMs={elapsedMs}
        flipCount={game.flipCount}
        pairsFound={wm.pairsFound()}
        pairsTotal={wm.pairsTotal()}
        topic={game.board.topic}
        cefr={game.board.cefr}
        onQuit={() => wm.dismissResult()}
      />
      <Board
        cards={game.cards}
        level={game.level}
        compareLocked={compareLocked}
        onFlip={(idx) => wm.flip(idx)}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        ⊞ Word Match
      </div>
      <h2 className="mt-1 font-display text-3xl font-semibold">Memory matching</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Flip pairs of cards to match each target-language word with its English meaning.
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
  selected: WordMatchLevel;
  onPick: (l: WordMatchLevel) => void;
  stats: {
    bestTimeMs: number;
    bestFlips: number;
    perfectGames: number;
    totalCompleted: number;
    totalGames: number;
  };
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Difficulty · {language}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Best{" "}
            <span className="text-foreground">
              {stats.bestTimeMs ? formatTime(stats.bestTimeMs) : "—"}
            </span>
          </span>
          <span>
            Perfect <span className="text-foreground">{stats.perfectGames}</span>
          </span>
          <span>
            Done <span className="text-foreground">{stats.totalCompleted}</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as WordMatchLevel[]).map((l) => (
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

function GameTopBar({
  timeMs,
  flipCount,
  pairsFound,
  pairsTotal,
  topic,
  cefr,
  onQuit,
}: {
  timeMs: number;
  flipCount: number;
  pairsFound: number;
  pairsTotal: number;
  topic: string;
  cefr: string;
  onQuit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onQuit}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-all hover:border-gold/50 hover:text-foreground"
            aria-label="Quit game"
          >
            <ChevronLeft className="h-3 w-3" /> Quit
          </button>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            {cefr}
          </span>
          <span className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            topic: <span className="text-foreground/80">{topic}</span>
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-gold" />
            <span className="tabular-nums text-foreground">{formatTime(timeMs)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-gold" />
            <span className="tabular-nums text-foreground">{flipCount}</span> flips
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-gold" />
            <span className="tabular-nums text-foreground">{pairsFound}</span>/{pairsTotal}
          </span>
        </div>
      </div>
    </div>
  );
}

function Board({
  cards,
  level,
  compareLocked,
  onFlip,
}: {
  cards: import("@/state/word-match-state").WMCard[];
  level: WordMatchLevel;
  compareLocked: boolean;
  onFlip: (cardIndex: number) => void;
}) {
  // Mobile: 3 cols (12 cards = 4 rows). Desktop: 4 cols (12 cards = 3 rows).
  // For 16/20 cards we keep 4 cols on desktop and 4 cols on mobile too at L2/L3
  // (cards shrink). For L1 we use the canonical 3x4 / 4x3 mobile/desktop split.
  const gridCols = level === 1 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4";

  return (
    <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
      {cards.map((card, idx) => (
        <Card
          key={card.id}
          card={card}
          disabled={compareLocked && !card.flipped && !card.matched}
          onFlip={() => onFlip(idx)}
        />
      ))}
    </div>
  );
}

function Card({
  card,
  disabled,
  onFlip,
}: {
  card: import("@/state/word-match-state").WMCard;
  disabled: boolean;
  onFlip: () => void;
}) {
  const showFront = card.flipped || card.matched;
  const isMatched = card.matched;
  const text = card.side === "target" ? card.pair.target : card.pair.english;

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled || card.flipped || card.matched) return;
        onFlip();
      }}
      disabled={disabled || card.flipped || card.matched}
      data-flipped={showFront}
      data-matched={isMatched}
      className={[
        "group relative aspect-[3/4] w-full overflow-hidden rounded-xl",
        "border bg-card/40 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
        showFront
          ? isMatched
            ? "border-emerald-500/60 bg-emerald-500/10 opacity-100 dark:opacity-80"
            : "border-gold/70 bg-gradient-to-br from-gold/10 via-card/30 to-transparent"
          : "border-gold/40 bg-gradient-to-br from-card/60 via-background/50 to-card/40 hover:scale-[1.03] hover:border-gold/80",
        disabled && !showFront ? "opacity-60" : "",
      ].join(" ")}
      aria-label={showFront ? text : "Hidden card"}
    >
      <div
        className={[
          "absolute inset-0 flex items-center justify-center p-2 text-center",
          "transition-opacity duration-150",
          showFront ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <span
          className={[
            "font-display leading-tight",
            // Scale text size with the length so longer phrases still fit.
            text.length > 14
              ? "text-[11px] sm:text-xs"
              : text.length > 8
                ? "text-xs sm:text-sm"
                : "text-sm sm:text-base",
            isMatched ? "text-emerald-800 dark:text-emerald-100" : "text-foreground",
          ].join(" ")}
        >
          {text}
        </span>
      </div>
      <div
        className={[
          "absolute inset-0 flex items-center justify-center",
          "transition-opacity duration-150",
          showFront ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <span className="font-display text-3xl text-gold/70 group-hover:text-gold">?</span>
      </div>
    </button>
  );
}

function ResultPanel({
  timeMs,
  flips,
  perfect,
  isNewBestTime,
  isNewBestFlips,
  onReplay,
  onBack,
}: {
  timeMs: number;
  flips: number;
  perfect: boolean;
  isNewBestTime: boolean;
  isNewBestFlips: boolean;
  onReplay: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-transparent p-8 text-center">
      {perfect ? (
        <>
          <Trophy className="mx-auto h-12 w-12 text-gold" strokeWidth={1.5} fill="currentColor" />
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
            Perfect Memory
          </div>
        </>
      ) : (
        <>
          <Sparkle className="mx-auto h-10 w-10 text-gold/70" strokeWidth={1.5} />
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Game Complete
          </div>
        </>
      )}
      <div className="mt-1 font-display text-4xl font-bold tabular-nums">{formatTime(timeMs)}</div>
      <div className="mt-2 font-mono text-xs text-muted-foreground">
        {flips} flips
        {perfect && (
          <span className="ml-2 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-gold">
            +5 XP perfect bonus
          </span>
        )}
      </div>
      {(isNewBestTime || isNewBestFlips) && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
          {isNewBestTime && isNewBestFlips
            ? "New best time & flips!"
            : isNewBestTime
              ? "New best time!"
              : "New best flips!"}
        </div>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Play Again
        </button>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/80 transition-all hover:border-gold/50"
        >
          Back to Hub
        </button>
      </div>
    </div>
  );
}

function BoardSkeleton({ level }: { level: WordMatchLevel }) {
  const count = LEVEL_LABELS[level].pairs * 2;
  const cells = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const gridCols = level === 1 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4";
  return (
    <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
      {cells.map((i) => (
        <div
          key={i}
          className="shimmer aspect-[3/4] rounded-xl border border-border/60 bg-card/40"
        />
      ))}
    </div>
  );
}

function Leaderboard({ language }: { language: string }) {
  const wm = useWordMatch();
  const rows = ([1, 2, 3] as WordMatchLevel[]).map((level) => {
    const k = `${language}-${level}` as WMLeaderboardKey;
    const s = wm.state.leaderboard[k] ?? {
      bestTimeMs: 0,
      bestFlips: 0,
      perfectGames: 0,
      totalGames: 0,
      totalCompleted: 0,
    };
    return { level, ...s };
  });
  const hasAny = rows.some((r) => r.totalCompleted > 0);
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
          No games yet. Finish a board to populate the leaderboard.
        </p>
      )}
      {hasAny && (
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/40 [&>th]:py-2 [&>th]:font-normal [&>th]:uppercase [&>th]:tracking-[0.18em]">
              <th>Lvl</th>
              <th>Best Time</th>
              <th>Best Flips</th>
              <th>Perfect</th>
              <th>Done</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.level} className="border-b border-border/30 last:border-0 [&>td]:py-2.5">
                <td className="text-foreground">L{r.level}</td>
                <td className="text-foreground tabular-nums">
                  {r.bestTimeMs ? formatTime(r.bestTimeMs) : "—"}
                </td>
                <td className="text-foreground tabular-nums">{r.bestFlips || "—"}</td>
                <td className="text-foreground">{r.perfectGames}</td>
                <td className="text-foreground/80">{r.totalCompleted}</td>
                <td className="text-muted-foreground">{r.totalGames}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
