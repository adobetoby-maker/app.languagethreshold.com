import {
  Trophy,
  Swords,
  Repeat2,
  AlignLeft,
  Flame,
  Award,
  Headphones,
  Grid3x3,
  Quote,
  AlertTriangle,
  CalendarCheck,
  Sparkle,
  Layers,
} from "lucide-react";
import { useApp, type TabKey } from "@/state/app-state";
import { useConjugation, type LeaderboardKey as CKey } from "@/state/conjugation-state";
import { useSentenceBuild, type SBLeaderboardKey } from "@/state/sentence-build-state";
import { useListeningDrill } from "@/state/listening-drill-state";
import { useWordMatch } from "@/state/word-match-state";
import { useIdiomMaster } from "@/state/idiom-master-state";
import { useFalseFriends } from "@/state/false-friends-state";
import { useMatch } from "@/state/match-state";
import { useDailyChallenge, badgeLabel } from "@/state/daily-challenge-state";
import { CrossGameAchievements } from "./CrossGameAchievements";
import { SoccerPositionsGame } from "./SoccerPositionsGame";
import { BaseballPositionsGame } from "./BaseballPositionsGame";

// Cross-component event the parent route listens for to open the Match
// overlay. Decouples this tab from the overlay-opener prop drilling.
export const OPEN_MATCH_EVENT = "lt:open-match";

/**
 * GamesHub: a single landing tab that surfaces every mini-game in the app
 * with at-a-glance stats and a one-tap launch. Today: Match (vocab battle),
 * Conjugation (grammar drills), Sentence Builder (word-order). All three
 * share a 5-question / 5-round run pattern and persist per-language stats.
 *
 * Architectural note: this component INTENTIONALLY reads from each game's
 * provider directly rather than introducing a unified store. Each game is
 * sovereign over its own leaderboard schema, and the hub is the only place
 * we project them to a common shape — keeps the games independent.
 */

interface GameDescriptor {
  id: string;
  tabKey: TabKey;
  title: string;
  blurb: string;
  Icon: React.ElementType;
  accent: string; // tailwind color class fragment (e.g. "amber", "emerald")
}

const GAMES: GameDescriptor[] = [
  {
    id: "match",
    tabKey: "speak", // Match opens via overlay; lobby launch routes to opener
    title: "Language Match",
    blurb:
      "Vocabulary battle — pick the correct definition. Climb the rank ladder Bronze → Unreal.",
    Icon: Swords,
    accent: "rose",
  },
  {
    id: "conjugation",
    tabKey: "conjugation",
    title: "Conjugation Drills",
    blurb: "Pick the right verb form for the phrase. Single axis at L1 → multi-axis at L3.",
    Icon: Repeat2,
    accent: "amber",
  },
  {
    id: "sentenceBuild",
    tabKey: "sentenceBuild",
    title: "Sentence Builder",
    blurb: "Tap scrambled words in the right order to build the target sentence.",
    Icon: AlignLeft,
    accent: "emerald",
  },
  {
    id: "listeningDrill",
    tabKey: "listeningDrill",
    title: "Listening Drill",
    blurb: "Hear a phrase, pick the matching text. Trains your ear for sound differences.",
    Icon: Headphones,
    accent: "sky",
  },
  {
    id: "wordMatch",
    tabKey: "wordMatch",
    title: "Word Match",
    blurb: "Memory game — flip cards to pair target-language words with their English meanings.",
    Icon: Grid3x3,
    accent: "violet",
  },
  {
    id: "idiomMaster",
    tabKey: "idiomMaster",
    title: "Idiom Master",
    blurb: "Fill the missing word in real native idioms — and learn what they mean.",
    Icon: Quote,
    accent: "indigo",
  },
  {
    id: "falseFriends",
    tabKey: "falseFriends",
    title: "False Friends",
    blurb: "Spot the cognate trap. Decide if a familiar-looking word means what you think.",
    Icon: AlertTriangle,
    accent: "amber",
  },
  {
    id: "flashcards",
    tabKey: "flashcards",
    title: "Flashcards",
    blurb: "My Vocab or a topic deck — tap through with retention scheduling that brings due words back.",
    Icon: Layers,
    accent: "gold",
  },
];

export function GamesHub() {
  const { state, dispatch } = useApp();
  const conj = useConjugation();
  const sb = useSentenceBuild();
  const listening = useListeningDrill();
  const wordMatch = useWordMatch();
  const idiom = useIdiomMaster();
  const falseFriends = useFalseFriends();
  const match = useMatch();
  const daily = useDailyChallenge();

  // Aggregate per-game stats for the current target language. All five
  // 5-question-run games share the same shape (`bestStreak`, `currentStreak`,
  // `perfectRuns`, `totalCorrect`, `totalAttempts`) so aggStats works
  // uniformly. Word Match has a different shape (best time / flips) and is
  // projected separately.
  const conjStats = aggStats(
    [1, 2, 3].map(
      (l) => conj.state.leaderboard[`${state.selectedLanguage}-${l as 1 | 2 | 3}` as CKey],
    ),
  );
  const sbStats = aggStats(
    [1, 2, 3].map(
      (l) =>
        sb.state.leaderboard[`${state.selectedLanguage}-${l as 1 | 2 | 3}` as SBLeaderboardKey],
    ),
  );
  // Use defensive `unknown as ...` casts because each game's leaderboard key
  // type is its own template literal — they're structurally compatible but
  // not assignable across modules without an unsafe cast.
  const listeningStats = aggStats(
    [1, 2, 3].map(
      (l) =>
        (
          listening.state.leaderboard as Record<
            string,
            | {
                bestStreak: number;
                currentStreak: number;
                perfectRuns: number;
                totalCorrect: number;
                totalAttempts: number;
              }
            | undefined
          >
        )[`${state.selectedLanguage}-${l}`],
    ),
  );
  const idiomStats = aggStats(
    [1, 2, 3].map(
      (l) =>
        (
          idiom.state.leaderboard as Record<
            string,
            | {
                bestStreak: number;
                currentStreak: number;
                perfectRuns: number;
                totalCorrect: number;
                totalAttempts: number;
              }
            | undefined
          >
        )[`${state.selectedLanguage}-${l}`],
    ),
  );
  const ffStats = aggStats(
    [1, 2, 3].map(
      (l) =>
        (
          falseFriends.state.leaderboard as Record<
            string,
            | {
                bestStreak: number;
                currentStreak: number;
                perfectRuns: number;
                totalCorrect: number;
                totalAttempts: number;
              }
            | undefined
          >
        )[`${state.selectedLanguage}-${l}`],
    ),
  );
  // Word Match: project bestFlips/bestTime into the unified shape.
  const wmStats = projectWordMatch(wordMatch, state.selectedLanguage);
  // Match tracks at the MATCH level (not the question level), so we project
  // its career stats into the same shape the other games use:
  //   bestStreak → longestWinStreak (matches in a row won)
  //   perfectRuns → wins (each won match counts as a "perfect run")
  //   totalCorrect / totalAttempts → wins / matchesPlayed (the closest thing
  //     Match has to per-question accuracy without instrumenting deeper)
  const matchStats = {
    bestStreak: match.longestWinStreak ?? 0,
    perfectRuns: match.wins ?? 0,
    totalCorrect: match.wins ?? 0,
    totalAttempts: match.matchesPlayed ?? 0,
  };

  const allRunGames = [
    conjStats,
    sbStats,
    listeningStats,
    idiomStats,
    ffStats,
    wmStats,
    matchStats,
  ];
  const grand = {
    correct: allRunGames.reduce((s, g) => s + g.totalCorrect, 0),
    attempts: allRunGames.reduce((s, g) => s + g.totalAttempts, 0),
    perfect: allRunGames.reduce((s, g) => s + g.perfectRuns, 0),
    bestStreak: Math.max(...allRunGames.map((g) => g.bestStreak)),
  };
  const grandAcc = grand.attempts === 0 ? 0 : Math.round((grand.correct / grand.attempts) * 100);

  function launch(game: GameDescriptor) {
    if (game.id === "match") {
      // Fire a CustomEvent the route listens for (avoids prop-drilling).
      window.dispatchEvent(new CustomEvent(OPEN_MATCH_EVENT));
      return;
    }
    dispatch({ type: "SET_TAB", payload: game.tabKey });
  }

  // Today's Challenge — deterministic game pick + streak.
  const todays = daily.todaysGame();
  const completedToday = daily.isCompletedToday();
  const dailyBadge = daily.badge();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">⌘ Games</div>
        <h2 className="mt-1 font-display text-3xl font-semibold">Practice that competes back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seven games, one leaderboard story. Each game persists per-language stats.
        </p>
      </div>

      {/* ── Today's Challenge ─────────────────────────────────────────── */}
      <button
        onClick={() => {
          if (todays.id === "match") {
            window.dispatchEvent(new CustomEvent(OPEN_MATCH_EVENT));
          } else {
            dispatch({ type: "SET_TAB", payload: todays.tabKey });
          }
        }}
        className="group flex w-full items-center gap-4 rounded-2xl border border-gold/50 bg-gradient-to-r from-gold/[0.12] via-gold/5 to-transparent px-5 py-4 text-left transition-all hover:border-gold/80 hover:from-gold/20"
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${completedToday ? "bg-emerald-500/20 text-emerald-300" : "bg-gold/15 text-gold"}`}
        >
          {completedToday ? (
            <CalendarCheck className="h-6 w-6" strokeWidth={1.6} />
          ) : (
            <Sparkle className="h-6 w-6" strokeWidth={1.6} fill="currentColor" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              Today&apos;s Challenge
            </span>
            {dailyBadge && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold">
                <Flame className="mr-1 inline h-2.5 w-2.5" />
                {badgeLabel(dailyBadge)}
              </span>
            )}
          </div>
          <div className="mt-0.5 font-display text-xl font-semibold text-foreground">
            {todays.title}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {completedToday ? "Done today" : "Tap to play"}
            {" · "}Streak <span className="text-foreground">{daily.data.currentStreak}</span>
            {" · "}Best <span className="text-foreground">{daily.data.longestStreak}</span>
          </div>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-gold opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
          Play →
        </span>
      </button>

      {/* Grand totals strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Best streak" value={grand.bestStreak} Icon={Flame} />
        <Stat label="Perfect runs" value={grand.perfect} Icon={Award} />
        <Stat label="Accuracy" value={`${grandAcc}%`} Icon={Trophy} />
        <Stat label="Total answers" value={grand.attempts} Icon={Trophy} />
      </div>

      {/* Game cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => {
          const stats =
            g.id === "match"
              ? matchStats
              : g.id === "conjugation"
                ? conjStats
                : g.id === "sentenceBuild"
                  ? sbStats
                  : g.id === "listeningDrill"
                    ? listeningStats
                    : g.id === "wordMatch"
                      ? wmStats
                      : g.id === "idiomMaster"
                        ? idiomStats
                        : g.id === "falseFriends"
                          ? ffStats
                          : { bestStreak: 0, perfectRuns: 0, totalCorrect: 0, totalAttempts: 0 };
          const acc =
            stats.totalAttempts === 0
              ? 0
              : Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
          return (
            <button
              key={g.id}
              onClick={() => launch(g)}
              className="group flex flex-col items-stretch gap-3 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-gold/60 hover:bg-card/70"
            >
              <div className="flex items-center justify-between">
                <g.Icon className="h-6 w-6 text-gold" strokeWidth={1.6} />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {state.selectedLanguage}
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
                  {g.title}
                </h3>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{g.blurb}</p>
              </div>
              <div className="mt-auto grid grid-cols-3 gap-1 border-t border-border/40 pt-3">
                <MiniStat label="Best" value={stats.bestStreak} />
                <MiniStat label="Perfect" value={stats.perfectRuns} />
                <MiniStat label="Acc" value={`${acc}%`} />
              </div>
              <span className="inline-flex items-center justify-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-all group-hover:bg-gold/20">
                Play
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Module-specific games ──────────────────────────────────────── */}
      <ModuleGamesSection
        language={state.selectedLanguage ?? "Spanish"}
        activeModule={state.activeModuleId ?? null}
      />

      {/* Cross-game achievements panel */}
      <CrossGameAchievements />

      {/* Streak ladder legend — same thresholds across games */}
      <div className="rounded-2xl border border-border/40 bg-card/20 p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Cross-game streak rewards
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
          <Pill label="Hot streak" threshold={3} />
          <Pill label="On fire" threshold={5} />
          <Pill label="Streaking" threshold={10} />
          <Pill label="Unstoppable" threshold={25} />
        </div>
      </div>
    </div>
  );
}

// Project Word Match's distinct shape (best time / flips / perfectGames /
// totalGames) into the unified game-stats shape used everywhere else.
// Mapping rationale:
//   bestStreak → not tracked (use 0)
//   perfectRuns → perfectGames (no-extra-flip games)
//   totalCorrect → perfectGames + totalCompleted (count completed games as "correct")
//   totalAttempts → totalGames (every started game counts)
function projectWordMatch(
  wm: ReturnType<typeof useWordMatch>,
  language: string,
): {
  bestStreak: number;
  currentStreak: number;
  perfectRuns: number;
  totalCorrect: number;
  totalAttempts: number;
} {
  let perfectRuns = 0;
  let totalAttempts = 0;
  let totalCompleted = 0;
  for (const lvl of [1, 2, 3]) {
    const k = `${language}-${lvl}`;
    const s = (
      wm.state.leaderboard as Record<
        string,
        | {
            bestTimeMs: number;
            bestFlips: number;
            perfectGames: number;
            totalGames: number;
            totalCompleted: number;
          }
        | undefined
      >
    )[k];
    if (!s) continue;
    perfectRuns += s.perfectGames ?? 0;
    totalAttempts += s.totalGames ?? 0;
    totalCompleted += s.totalCompleted ?? 0;
  }
  return {
    bestStreak: 0,
    currentStreak: 0,
    perfectRuns,
    totalCorrect: totalCompleted,
    totalAttempts,
  };
}

function aggStats(
  buckets: (
    | undefined
    | {
        bestStreak: number;
        currentStreak: number;
        perfectRuns: number;
        totalCorrect: number;
        totalAttempts: number;
      }
  )[],
) {
  let bestStreak = 0;
  let perfectRuns = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  for (const b of buckets) {
    if (!b) continue;
    bestStreak = Math.max(bestStreak, b.bestStreak);
    perfectRuns += b.perfectRuns;
    totalCorrect += b.totalCorrect;
    totalAttempts += b.totalAttempts;
  }
  return { bestStreak, perfectRuns, totalCorrect, totalAttempts };
}

function Stat({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-gold" />
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Pill({ label, threshold }: { label: string; threshold: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/30 px-2 py-1.5">
      <Flame className="h-3 w-3 text-gold" />
      <span className="text-foreground/80">{label}</span>
      <span className="ml-auto font-mono text-[9px] text-muted-foreground">{threshold}+</span>
    </div>
  );
}

// ── Module-specific interactive games ─────────────────────────────────────────

const MODULE_GAMES: Record<string, { emoji: string; title: string; blurb: string }> = {
  soccer: {
    emoji: "⚽",
    title: "Soccer Positions",
    blurb:
      "Tap positions on the field, name them in your target language, or find them by name. Switch formations.",
  },
  baseball: {
    emoji: "⚾",
    title: "Baseball Diamond",
    blurb:
      "Identify all 9 defensive positions on the diamond, then drill dugout vocabulary — pitch types, calls, and plays.",
  },
};

function ModuleGamesSection({
  language,
  activeModule,
}: {
  language: string;
  activeModule: string | null;
}) {
  const { dispatch } = useApp();
  const available = Object.keys(MODULE_GAMES).filter((id) => {
    // Always show; highlight the active module.
    return true;
  });

  if (available.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          ⌘ Module Games
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Interactive field and diamond games tied to specific sport modules.
        </p>
      </div>

      {available.map((moduleId) => {
        const meta = MODULE_GAMES[moduleId]!;
        const isActive = activeModule === moduleId;
        return (
          <div
            key={moduleId}
            className={`rounded-2xl border ${isActive ? "border-gold/50 bg-card/60" : "border-border/60 bg-card/30"} overflow-hidden`}
          >
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.emoji}</span>
                <div>
                  <h3 className="font-display text-base font-semibold">{meta.title}</h3>
                  <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                </div>
              </div>
              {!isActive && (
                <button
                  onClick={() => dispatch({ type: "SET_ACTIVE_MODULE", payload: moduleId })}
                  className="ml-4 shrink-0 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
                >
                  Open module
                </button>
              )}
            </div>
            {isActive && (
              <div className="border-t border-border/40 px-4 pb-4 pt-3">
                {moduleId === "soccer" && <SoccerPositionsGame language={language} />}
                {moduleId === "baseball" && <BaseballPositionsGame language={language} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
